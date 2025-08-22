import React, { useEffect, useState, useRef } from 'react';
// import html-to-image types only after package is installed
// import * as htmlToImage from 'html-to-image';
import './App.css';

type Member = {
  id: string;
  name: string;
  stars: number;
  local_score: number;
  global_score: number;
  last_star_ts: number;
  completion_day_level: Record<string, any>;
};

type LeaderboardData = {
  event: string;
  owner_id: string;
  members: Record<string, Member>;
};

const formatDate = (ts: number) => {
  if (!ts) return '';
  const dt = new Date(ts * 1000);
  return dt.toLocaleString();
};

function App() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // Fetch the list of files for dropdown
  useEffect(() => {
    fetch('/data/files.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch file list');
        return res.json();
      })
      .then((list) => setAvailableFiles(list))
      .catch(() => setAvailableFiles([]));
  }, []);

  // Helper: Parse year from files like 20250822_2021.json
  const extractYear = (filename: string) => {
    const m = filename.match(/_(\d{4})\.json$/);
    if (m) return m[1];
    return null;
  };

  // Fetch and aggregate latest per year
  useEffect(() => {
    setLoading(true);
    setError(null);
    if (!availableFiles.length) {
      setData(null);
      setLoading(false);
      return;
    }

    // Build year -> filename map
    const yearToFile: Record<string, string> = {};
    availableFiles.forEach((fname) => {
      const year = extractYear(fname);
      if (year) yearToFile[year] = fname;
    });

    const years = Object.keys(yearToFile).sort();
    const filesToFetch = years.map((year) => yearToFile[year]);
    if (!filesToFetch.length) {
      setData(null);
      setLoading(false);
      return;
    }

    Promise.all(
      filesToFetch.map((f) =>
        fetch(`/data/${f}`)
          .then((res) => {
            if (!res.ok) throw new Error(`Failed to fetch leaderboard data: ${f}`);
            return res.json();
          })
          .then((json) => ({ file: f, data: json }))
      )
    )
      .then((yearDatas) => {
        // Build: year -> leaderboardData
        const byYear: Record<string, LeaderboardData> = {};
        yearDatas.forEach(({ file, data }) => {
          const year = extractYear(file);
          if (year) byYear[year] = data;
        });

        // Collect all user IDs seen in any year
        const userMap: Record<string, { name: string; starsByYear: Record<string, number> }> = {};
        Object.entries(byYear).forEach(([year, yearObj]) => {
          Object.values(yearObj.members).forEach((member: any) => {
            if (!member.name) return;
            if (!userMap[member.id]) {
              userMap[member.id] = { name: member.name, starsByYear: {} };
            }
            userMap[member.id].starsByYear[year] = member.stars || 0;
          });
        });
        // Compose LeaderboardData-like object with merged members
        const sortedYears = Object.keys(byYear).sort();
        const merged: LeaderboardData = {
          event: sortedYears.join(" + "),
          owner_id: "",
          members: Object.fromEntries(
            Object.entries(userMap).map(([id, u]) => {
              // Get stars for all years, fill missing with 0
              const perYear = sortedYears.map((year) => u.starsByYear[year] || 0);
              const total = perYear.reduce((a, b) => a + b, 0);
              return [
                id,
                {
                  id,
                  name: u.name,
                  stars: total,
                  local_score: total, // Adapt as needed
                  global_score: 0,
                  last_star_ts: 0,
                  completion_day_level: {}, // Not shown in table for totals
                  perYearStars: perYear, // custom property for the table
                  perYearLabels: sortedYears
                }
              ];
            })
          )
        };

        setData(merged);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [availableFiles]);

  const handleExport = async () => {
    if (!leaderboardRef.current) return;
    // Dynamically import html-to-image so app won't crash if user hasn't installed yet
    const htmlToImage = await import('html-to-image');
    htmlToImage.toPng(leaderboardRef.current)
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.download = 'leaderboard.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err: any) => {
        alert('Failed to export image: ' + err);
      });
  };

  if (loading) return <div>Loading leaderboard...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!data) return <div>No leaderboard data found.</div>;

  // Transform membership and sorting logic
  let members: any[] = [];
  let perYearLabels: string[] = [];
  if (data && data.members) {
    members = Object.values(data.members)
      .filter((m: any) => m.name) // filter "zombie" entries
      .sort((a: any, b: any) => {
        if (b.stars === a.stars && b.name && a.name) return a.name.localeCompare(b.name);
        return b.stars - a.stars;
      });
    // All have custom property if multi-year
    if (members.length && members[0].perYearStars && members[0].perYearLabels) {
      perYearLabels = members[0].perYearLabels;
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Advent of Code {data.event} — Leaderboard (Sum of Stars using latest per year)</h1>
      <div style={{ marginBottom: 16 }}>
        <button onClick={handleExport}>
          Export as PNG
        </button>
      </div>
      <div ref={leaderboardRef} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0002', display: 'inline-block' }}>
        <table border={1} cellPadding={8} cellSpacing={0} style={{ borderCollapse: 'collapse', fontSize: 15, minWidth: 540 }}>
          <thead>
            <tr style={{ backgroundColor: '#FAE57E' }}>
              <th>#</th>
              <th>Name</th>
              {perYearLabels.map((label, idx) => (
                <th key={`year-col-${label}`}>Stars {label}</th>
              ))}
              <th>Total Stars</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any, i: number) => (
              <tr key={m.id} style={i < 3 ? { fontWeight: 'bold', background: '#f8f8f1' } : {}}>
                <td>{i + 1}</td>
                <td>{m.name}</td>
                {perYearLabels.map((label, idx) => (
                  <td key={`member-${m.id}-year-${label}`}>{m.perYearStars ? m.perYearStars[idx] : 0}</td>
                ))}
                <td>{m.stars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 20, color: '#666', fontSize: 13 }}>
        <b>Note:</b> This sums each user's stars using only the latest available data for each year.
        Please run <code>npm install html-to-image</code> in this app directory for export to PNG.
        The PNG will be downloaded to your system; move or rename it as needed.
      </p>
    </div>
  );
}

export default App;
