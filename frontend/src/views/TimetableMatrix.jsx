import React, { useState, useMemo } from 'react';
import { DEFAULT_SCHEDULE } from '../data/defaultSchedule';
import { isLabCode } from '../data/timetableData';
import StatsBar from '../components/StatsBar';
import TimetableGrid from '../components/TimetableGrid';

export default function TimetableMatrix() {
  const [data] = useState(() => DEFAULT_SCHEDULE);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique section keys: e.g. "CS2 — Y2nd Year S3rd Semester"
  const sectionKeys = useMemo(() => {
    return [...new Set(data.map(d => `${d.section} — Y${d.year} S${d.semester}`))].sort();
  }, [data]);

  const [activeSectionKey, setActiveSectionKey] = useState(
    sectionKeys.length > 0 ? sectionKeys[0] : ''
  );

  // Filter slots for current active section
  const currentSlots = useMemo(() => {
    return data.filter(d => `${d.section} — Y${d.year} S${d.semester}` === activeSectionKey);
  }, [data, activeSectionKey]);

  // Compute stats
  const stats = useMemo(() => {
    const totalHours = currentSlots.length;
    const labHours = currentSlots.filter(r =>
      (r.room && r.room.toUpperCase().includes('LAB')) || isLabCode(r.subjectCode)
    ).length;
    const theoryHours = totalHours - labHours;
    const uniqueFaculty = new Set(currentSlots.map(r => r.faculty).filter(Boolean)).size;

    return {
      totalHours,
      theoryHours,
      labHours,
      facultyCount: uniqueFaculty
    };
  }, [currentSlots]);

  // Helper for pill labels: "CS2 (Sem 3)"
  const formatPillLabel = (key) => {
    const parts = key.split(' — ');
    const sec = parts[0];
    const semMatch = parts[1]?.match(/S(\d+)/);
    const sem = semMatch ? `Sem ${semMatch[1]}` : parts[1];
    return `${sec} (${sem})`;
  };

  return (
    <main className="container">
      {/* Controls Card */}
      <section className="controls-card" aria-label="Timetable Filters and Search">
        <div className="section-selector-group">
          <span className="picker-label">Active Section:</span>
          <select
            id="sectionPicker"
            className="section-picker-select"
            value={activeSectionKey}
            onChange={(e) => setActiveSectionKey(e.target.value)}
          >
            {sectionKeys.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <div className="quick-pills-container">
            {sectionKeys.map(k => (
              <button
                key={k}
                type="button"
                className={`pill-btn ${activeSectionKey === k ? 'active' : ''}`}
                onClick={() => setActiveSectionKey(k)}
              >
                {formatPillLabel(k)}
              </button>
            ))}
          </div>
        </div>

        <div className="search-box-wrapper">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Filter subject, faculty or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </section>

      {/* Analytics Statistics Bar */}
      <StatsBar {...stats} />

      {/* Timetable Grid Card (TT_TRACKER visual styling) */}
      <section className="matrix-grid-card" aria-label="Weekly Timetable Grid">
        <div className="matrix-card-header">
          <div className="matrix-header-title">
            Weekly Schedule Matrix &mdash; <span className="matrix-sec-highlight">{activeSectionKey}</span>
          </div>
          <div className="matrix-header-badge">NIT Hamirpur CSE Base Roster</div>
        </div>

        <div className="matrix-table-container">
          <TimetableGrid
            flatSlots={currentSlots}
            searchQuery={searchQuery}
            emptyMessage="No slots scheduled for this section."
          />
        </div>
      </section>

      {/* Legend Bar */}
      <div className="legend-bar">
        <div className="legend-item">
          <div className="legend-indicator" style={{ background: 'var(--institutional-navy)' }}></div>
          <span>Theory Lecture</span>
        </div>
        <div className="legend-item">
          <div className="legend-indicator" style={{ background: 'var(--success-emerald)' }}></div>
          <span>Laboratory Practical</span>
        </div>
        <div className="legend-item">
          <div className="legend-indicator" style={{ background: '#cbd5e1' }}></div>
          <span>13:00 &ndash; 14:00 Institutional Lunch Break</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-indicator"
            style={{ background: 'var(--nit-gold)', border: '1px solid var(--nit-gold)' }}
          ></div>
          <span>Search Query Match</span>
        </div>
      </div>

      <div className="footer-note">
        Monday&ndash;Friday 5-Day Departmental Academic Week &bull; Saturday &amp; Sunday are OFF &bull; NIT Hamirpur CSE
      </div>
    </main>
  );
}
