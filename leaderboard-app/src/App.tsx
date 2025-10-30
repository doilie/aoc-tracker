import { useEffect, useState, useRef } from 'react';
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

function App() {
  // --- All Hook calls must appear first ---
  const [] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [] = useState<any[] | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [showYearlyBreakdown, setShowYearlyBreakdown] = useState(false);
const [registrationData, setRegistrationData] = useState<Record<string, { fullName: string, level: string }>>({});

  // --- All useEffect calls after Hook calls ---
useEffect(() => {
    fetch('/AppPH_AoC_2025_Registration.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const usernameIndex = headers.indexOf('"Username in AoC Leaderboard"');
        const fullNameIndex = headers.indexOf('"Full Name"');
        const levelIndex = headers.indexOf('"What level will you be joining for the AoC Challenge?"');
        // Store registration info as { [username]: { fullName, level } }
        const mapping: Record<string, { fullName: string, level: string }> = {};
        for (let i = 1; i < lines.length; i++) {
          const currentline = lines[i].split(',');
          if (currentline.length > Math.max(usernameIndex, fullNameIndex, levelIndex)) {
            const username = currentline[usernameIndex].replaceAll('"', '').trim();
            const fullName = currentline[fullNameIndex].replaceAll('"', '').trim();
            const level = currentline[levelIndex]?.replaceAll('"', '').trim() || '';
            if (username) {
              mapping[username] = { fullName, level };
            }
          }
        }
        setRegistrationData(mapping);
      });
  }, []);
  useEffect(() => {
    fetch('/data/files.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch file list');
        return res.json();
      })
      .then((list) => setAvailableFiles(list))
      .catch(() => setAvailableFiles([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (!availableFiles.length) {
      setYearlyData([]);
      setLoading(false);
      return;
    }
    // Sort files by year
    const sorted = [...availableFiles].sort();
    Promise.all(
      sorted.map(f =>
        fetch(`/data/${f}`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch leaderboard data: ${f}`);
            return res.json();
          })
          .then(json => ({
            year: (json.event || '').toString(),
            members: json.members || {}
          }))
      )
    )
      .then(yearDatas => {
        setYearlyData(yearDatas);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [availableFiles]);

  useEffect(() => {
    setFilterError(null);
    setFilterActive(Boolean(startDate || endDate));
  }, [startDate, endDate]);

  // --- All non-hook code goes below ---
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
  if (!yearlyData.length) return <div>No leaderboard data found.</div>;

  // Gather all unique users across all years (by name+id)
  const allUserIds = new Set<string>();
  const allUserInfo: Record<string, { name: string }> = {};
  yearlyData.forEach(({ members }) => {
    Object.values(members).forEach((m: any) => {
      if (m && m.id) {
        allUserIds.add(m.id.toString());
        if (!allUserInfo[m.id]) {
          allUserInfo[m.id] = { name: m.name || `User ${m.id}` };
        }
      }
    });
  });
  const yearLabels = yearlyData.map(y => y.year);

  // Helper: date string (yyyy-mm-dd) to unix timestamp (seconds) [start/end of day]
  const getRangeTimestamps = (start: string, end: string) => {
    let startTs = start ? Math.floor(new Date(start + 'T00:00:00Z').getTime() / 1000) : null;
    let endTs = end ? Math.floor(new Date(end + 'T23:59:59Z').getTime() / 1000) : null;
    return { startTs, endTs };
  };


  // Compute leaderboard with or without date or day range filter
  const { startTs, endTs } = getRangeTimestamps(startDate, endDate);

  const dateFilterFn = (starTs: number) => {
    if (startDate && startTs && starTs < startTs) return false;
    if (endDate && endTs && starTs > endTs) return false;
    return true;
  };

  let leaderboard: {
    id: string;
    name: string;
    fullName: string;
    level?: string;
    perYear: number[];
    total: number;
  }[] = [];
  allUserIds.forEach((id) => {
    const name = allUserInfo[id]?.name ?? id;
    const reg = registrationData[name];
    const fullName = reg?.fullName || 'Not Registered';
    const level = reg?.level;
    let perYear: number[] = [];
    yearlyData.forEach(yd => {
      const m = yd.members[id];
      // Count stars as number of earned parts (from completion_day_level), with optional date and/or day filter
      let count = 0;
      if (m && m.completion_day_level) {
        Object.entries(m.completion_day_level)
          .forEach(([, d]: [string, any]) => {
            Object.values(d).forEach((p: any) => {
              if (p.get_star_ts && (!filterActive || dateFilterFn(p.get_star_ts))) count += 1;
            });
          });
      }
      perYear.push(count);
    });
    leaderboard.push({
      id,
      name,
      fullName,
      level,
      perYear,
      total: perYear.reduce((a, b) => a + b, 0)
    });
  });

  leaderboard.sort((a, b) => {
    if (b.total === a.total) return a.name.localeCompare(b.name);
    return b.total - a.total;
  });

  const registeredMembers = leaderboard.filter(m => m.fullName !== 'Not Registered');
  const unregisteredMembers = leaderboard.filter(m => m.fullName === 'Not Registered');

  function handleClear() {
    setStartDate('');
    setEndDate('');
    setFilterActive(false);
    setFilterError(null);
  }

  return (
    <div className="page-theme">
      <h1>Advent of Code — Leaderboard</h1>
      <div className="subheading">Stars Earned<br></br>(Click Total to Show Breakdown)</div>
      <div className="filters">
        <label>
          Start Date:{' '}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date:{' '}
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        <button type="button" onClick={handleClear}>Reset</button>
      </div>
      {filterError &&
        <div className="filter-error">{filterError}</div>
      }
      <button 
        className="export-btn"
        type="button"
        style={{ margin: "0 0 16px 0", display: "block", marginLeft: "auto", marginRight: "auto" }} 
        onClick={handleExport}
      >
        Export Table as Image
      </button>
      <div ref={leaderboardRef} className="leaderboard-panel">
        <h2>Registered Members</h2>
        {(() => {
          // Group registered members by level
          const levelGroups: Record<string, typeof registeredMembers> = {};
          registeredMembers.forEach(m => { // Removed .filter(m => m.total > 0) here
              const level = m.level || 'Unspecified Level';
              if (!levelGroups[level]) levelGroups[level] = [];
              levelGroups[level].push(m);
            });
          // Render a table for each level group
          return Object.entries(levelGroups).map(([level, members]) => (
            <div key={level} style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginTop: '1.5rem' }}>{level}</h3>
              <table className="leaderboard-table" border={1} cellPadding={8} cellSpacing={0}>
                <thead>
                  <tr className="header-row">
                    <th>#</th>
                    <th>Full Name</th>
                    <th>AoC Username</th>
                    {showYearlyBreakdown && yearLabels.map((label) => (
                      <th key={`year-col-${label}`}>Stars {label}</th>
                    ))}
                    <th>Total Stars</th>
                  </tr>
                </thead>
                <tbody>
                  {members
                    .filter(m => m.total > 0) // Filter for members with stars here
                    .map((m, i) => (
                    <tr key={m.id}>
                      <td>{i + 1}</td>
                      <td className={i < 3 ? 'gold-text' : undefined}>{m.fullName}</td>
                      <td className={i < 3 ? 'gold-text' : undefined}>{m.name}</td>
                      {showYearlyBreakdown && m.perYear.map((stars, idx) => (
                        <td key={`year-${yearLabels[idx]}`} className={i < 3 ? 'gold-text' : undefined}>{stars}</td>
                      ))}
                      <td className={i < 3 ? 'gold-text' : undefined} onClick={() => setShowYearlyBreakdown(!showYearlyBreakdown)}>{m.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ));
        })()}

        <h2 style={{ marginTop: '2rem' }}>Unregistered Members</h2>
        <table className="leaderboard-table" border={1} cellPadding={8} cellSpacing={0}>
          <thead>
            <tr className="header-row">
              <th>#</th>
              <th>Name</th>
              {showYearlyBreakdown && yearLabels.map((label) => (
                <th key={`year-col-${label}`}>Stars {label}</th>
              ))}
              <th>Total Stars</th>
            </tr>
          </thead>
          <tbody>
            {unregisteredMembers
              .filter(m => m.total > 0)
              .map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td>{m.name}</td>
                  {showYearlyBreakdown && m.perYear.map((stars, idx) => (
                    <td key={`year-${yearLabels[idx]}`} className={i < 3 ? 'gold-text' : undefined}>{stars}</td>
                  ))}
                  <td onClick={() => setShowYearlyBreakdown(!showYearlyBreakdown)}>{m.total}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
