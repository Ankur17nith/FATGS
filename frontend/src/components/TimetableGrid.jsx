import React from 'react';
import { DAYS, INTERVALS } from '../data/timetableData';
import TimetableCard from './TimetableCard';

/**
 * TimetableGrid Component
 * Renders the weekly academic timetable grid:
 * - Top header row with time intervals
 * - Left column with day names (Monday - Friday)
 * - 13:00 - 14:00 institutional lunch break slot
 * - Conflict-free scheduled session cards with room and faculty details
 */
export default function TimetableGrid({
  grid = null,
  emptyMessage = 'No schedule generated yet.'
}) {
  const getCell = (dIdx, pIdx) => {
    if (grid && grid[dIdx]) {
      return grid[dIdx][pIdx] || null;
    }
    return null;
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

                  return (
                    <td key={interval.start} className={`tt-td-slot ${cell ? 'has-card' : 'is-empty'}`}>
                      {cell ? (
                        <TimetableCard cell={cell} />
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
