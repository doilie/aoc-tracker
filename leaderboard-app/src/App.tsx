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
  // --- All Hook calls must appear first ---
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startDay, setStartDay] = useState<string>('');
  const [endDay, setEndDay] = useState<string>('');
  const [filteredMembers, setFilteredMembers] = useState<any[] | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  // --- All useEffect calls after Hook calls ---
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
    // Helper: day to int
    const getDayInt = (s: string) => {
      const n = parseInt(s, 10);
      return isNaN(n) ? null : n;
    };
    const intStartDay = getDayInt(startDay);
    const intEndDay = getDayInt(endDay);
    // Validate day values
    if ((startDay && (!intStartDay || intStartDay < 1 || intStartDay > 25)) ||
        (endDay && (!intEndDay || intEndDay < 1 || intEndDay > 25))) {
      setFilterError('Day numbers must be between 1 and 25');
      setFilterActive(false);
      return;
    }
    if (intStartDay && intEndDay && intEndDay < intStartDay) {
      setFilterError('Start Day must be less than or equal to End Day');
      setFilterActive(false);
      return;
    }
    setFilterError(null);
    setFilterActive(Boolean(startDate || endDate || startDay || endDay));
  }, [startDate, endDate, startDay, endDay]);

  // --- All non-hook code goes below ---

  // Helper: Parse year from files like 20250822_2021.json
  const extractYear = (filename: string) => {
    const m = filename.match(/_(\d{4})\.json$/);
    if (m) return m[1];
    return null;
  };

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

  // Helper: day to int (outside useEffect, for logic)
  const getDayInt = (s: string) => {
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  };
  const intStartDay = getDayInt(startDay);
  const intEndDay = getDayInt(endDay);

  // Compute leaderboard with or without date or day range filter
  const { startTs, endTs } = getRangeTimestamps(startDate, endDate);

  const dateFilterFn = (starTs: number) => {
    if (startDate && startTs && starTs < startTs) return false;
    if (endDate && endTs && starTs > endTs) return false;
    return true;
  };
  const isDayInRange = (day: string) => {
    const dayInt = parseInt(day, 10);
    if (!startDay && !endDay) return true;
    if (intStartDay && dayInt < intStartDay) return false;
    if (intEndDay && dayInt > intEndDay) return false;
    return true;
  };
  const dayFilterActive = Boolean((startDay && intStartDay) || (endDay && intEndDay));

  let leaderboard: {
    id: string;
    name: string;
    perYear: number[];
    total: number;
  }[] = [];
  allUserIds.forEach((id) => {
    const name = allUserInfo[id]?.name ?? id;
    let perYear: number[] = [];
    yearlyData.forEach(yd => {
      const m = yd.members[id];
      // Count stars as number of earned parts (from completion_day_level), with optional date and/or day filter
      let count = 0;
      if (m && m.completion_day_level) {
        Object.entries(m.completion_day_level)
          .forEach(([day, d]: [string, any]) => {
            if (!dayFilterActive || isDayInRange(day)) {
              Object.values(d).forEach((p: any) => {
                if (p.get_star_ts && (!filterActive || dateFilterFn(p.get_star_ts))) count += 1;
              });
            }
          });
      }
      perYear.push(count);
    });
    leaderboard.push({
      id,
      name,
      perYear,
      total: perYear.reduce((a, b) => a + b, 0)
    });
  });

  leaderboard.sort((a, b) => {
    if (b.total === a.total) return a.name.localeCompare(b.name);
    return b.total - a.total;
  });

  function handleClear() {
    setStartDate('');
    setEndDate('');
    setStartDay('');
    setEndDay('');
    setFilterActive(false);
    setFilterError(null);
  }

  return (
    <div className="page-theme">
      <h1>Advent of Code — Leaderboard</h1>
      <div className="subheading">Stars Earned Per Year</div>
      <div className="filters">
        <label>
          Start Date:{' '}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date:{' '}
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        <label>
          Start Day:{' '}
          <input
            type="number"
            min={1}
            max={25}
            value={startDay}
            onChange={e => setStartDay(e.target.value.replace(/[^0-9]/g, ''))}
            className="day-input"
            placeholder="1"
          />
        </label>
        <label>
          End Day:{' '}
          <input
            type="number"
            min={1}
            max={25}
            value={endDay}
            onChange={e => setEndDay(e.target.value.replace(/[^0-9]/g, ''))}
            className="day-input"
            placeholder="25"
          />
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
        <table className="leaderboard-table" border={1} cellPadding={8} cellSpacing={0}>
          <thead>
            <tr className="header-row">
              <th>#</th>
              <th>Name</th>
              {yearLabels.map((label, idx) => (
                <th key={`year-col-${label}`}>Stars {label}</th>
              ))}
              <th>Total Stars</th>
            </tr>
          </thead>
<tbody>
            {leaderboard
              .filter(m => m.total > 0)
              .map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td className={i < 3 ? 'gold-text' : undefined}>{m.name}</td>
                  {m.perYear.map((stars, idx) => (
                    <td key={`year-${yearLabels[idx]}`} className={i < 3 ? 'gold-text' : undefined}>{stars}</td>
                  ))}
                  <td className={i < 3 ? 'gold-text' : undefined}>{m.total}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
