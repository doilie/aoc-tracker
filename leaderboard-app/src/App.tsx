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
  const leaderboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/data.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch leaderboard data');
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

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
  const members = Object.values(data.members)
    .filter((m: any) => m.name) // filter "zombie" entries
    .sort((a: any, b: any) => {
      if (b.local_score === a.local_score) return b.stars - a.stars;
      return b.local_score - a.local_score;
    });

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Advent of Code {data.event} — Leaderboard</h1>
      <button onClick={handleExport} style={{ marginBottom: 16 }}>
        Export as PNG
      </button>
      <div ref={leaderboardRef} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0002', display: 'inline-block' }}>
        <table border={1} cellPadding={8} cellSpacing={0} style={{ borderCollapse: 'collapse', fontSize: 15, minWidth: 540 }}>
          <thead>
            <tr style={{ backgroundColor: '#FAE57E' }}>
              <th>#</th>
              <th>Name</th>
              <th>Stars</th>
              <th>Local Score</th>
              <th>Last Star Time</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any, i: number) => (
              <tr key={m.id} style={i < 3 ? { fontWeight: 'bold', background: '#f8f8f1' } : {}}>
                <td>{i + 1}</td>
                <td>{m.name}</td>
                <td>{m.stars}</td>
                <td>{m.local_score}</td>
                <td>{formatDate(m.last_star_ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 20, color: '#666', fontSize: 13 }}>
        <b>Note:</b> Please run <code>npm install html-to-image</code> in this app directory for export to PNG.
        The PNG will be downloaded to your system; move or rename it as needed.
      </p>
    </div>
  );
}

export default App;
