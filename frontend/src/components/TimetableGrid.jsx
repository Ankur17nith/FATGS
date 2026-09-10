import React from 'react';
import { DAYS, INTERVALS } from '../data/timetableData';
import TimetableCard from './TimetableCard';

/**
 * TimetableGrid Component
 * Recreates TT_TRACKER's timetable grid structure:
 * - Clean white grid with subtle borders
 * - Top header row with "DAY / TIME" and time slots in bold navy
 * - Left column with uppercase bold navy day names on soft slate background
 * - Distinct 13:00 - 14:00 lunch break slot
 * - Empty cells cleanly styled without heavy clutter
 */
export default function TimetableGrid({
  grid = null,
  flatSlots = null,
  searchQuery = '',
  emptyMessage = 'No schedule generated yet.'
}) {
  const query = (searchQuery || '').trim().toLowerCase();

  // Helper to get slot content for day and period index
  const getCell = (dIdx, pIdx) => {
    if (grid && grid[dIdx]) {
      return grid[dIdx][pIdx] || null;
    }

    if (flatSlots) {
      const dayName = DAYS[dIdx];
      const interval = INTERVALS[pIdx];
      return flatSlots.find(
        s => s.day === dayName && s.start === interval.start && s.end === interval.end
      ) || null;
    }

    return null;
  };

  const isMatchingQuery = (cell) => {
    if (!query || !cell) return false;
    const code = (cell.code || cell.subjectCode || '').toLowerCase();
    const faculty = (cell.faculty || '').toLowerCase();
    const room = (cell.room || '').toLowerCase();
    const section = (cell.section || '').toLowerCase();
    return code.includes(query) || faculty.includes(query) || room.includes(query) || section.includes(query);
  };

  const hasAnyData = DAYS.some((_, dIdx) =>
    INTERVALS.some((_, pIdx) => Boolean(getCell(dIdx, pIdx)))
  );

  return (
    <div className="tt-grid-wrapper">
      <div className="tt-grid-scroll-container">
        <table className="tt-grid-table">
          <thead>
            <tr>
              <th className="tt-th-day-corner">DAY / TIME</th>
              {INTERVALS.map(interval => (
                <th key={interval.start} className="tt-th-interval">
                  {interval.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dayName, dIdx) => (
              <tr key={dayName}>
                <th className="tt-th-day-label">{dayName.toUpperCase()}</th>
                {INTERVALS.map((interval, pIdx) => {
                  if (interval.isLunch) {
                    return (
                      <td key={interval.start} className="tt-td-lunch" title="Institutional Lunch Break">
                        <div className="tt-lunch-stripes">
                          <span className="tt-lunch-text">LUNCH</span>
                        </div>
                      </td>
                    );
                  }

                  const cell = getCell(dIdx, pIdx);
                  const isMatch = isMatchingQuery(cell);

                  return (
                    <td key={interval.start} className={`tt-td-slot ${cell ? 'has-card' : 'is-empty'}`}>
                      {cell ? (
                        <TimetableCard cell={cell} isHighlighted={isMatch} />
                      ) : (
                        <div className="tt-empty-cell" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!hasAnyData && (
        <div className="tt-empty-state">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
