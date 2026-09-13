import React from 'react';
import { DAYS, INTERVALS } from '../data/timetableData';
import TimetableCard from './TimetableCard';

/**
 * TimetableGrid Component
 * Compact institutional academic timetable grid matching TT_TRACKER:
 * - Solid 1px borders between all cells
 * - Top header row with time intervals (09:00 - 10:00, etc.)
 * - Left column with day names (Monday - Friday)
 * - Section-specific institutional lunch break (13:00-14:00 for 2nd/4th/5th/M.Tech, 12:00-13:00 for 3rd Year)
 * - Ultra-compact cell height (~52px-56px) allowing the entire Monday-Friday week to be viewed on desktop without scrolling
 */
export default function TimetableGrid({
  grid = null,
  section = null,
  emptyMessage = 'No schedule generated yet.'
}) {
  // Year-specific lunch timings:
  // 2nd Year: Lunch = 13:00 - 14:00 (period 4)
  // 3rd Year: Lunch = 12:00 - 13:00 (period 3)
  // Final Year: Lunch = 13:00 - 14:00 (period 4)
  const isThirdYear = section
    ? (section.name === 'CS3' || section.name === 'CD3' || (section.year && section.year.includes('3rd')))
    : false;
  const lunchPeriodIdx = isThirdYear ? 3 : 4; // 12-1 for 3rd Year, 1-2 for 2nd Year, Final Year & others

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
              {INTERVALS.map((interval, pIdx) => (
                <th
                  key={interval.start}
                  className={`tt-th-interval ${pIdx === lunchPeriodIdx ? 'tt-th-lunch-col' : ''}`}
                >
                  <span className="tt-th-time">{interval.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((dayName, dIdx) => (
              <tr key={dayName}>
                <th className="tt-th-day-label">{dayName.toUpperCase()}</th>
                {INTERVALS.map((interval, pIdx) => {
                  const cell = getCell(dIdx, pIdx);
                  const isLunchSlot = pIdx === lunchPeriodIdx;

                  if (!cell && isLunchSlot) {
                    return (
                      <td key={interval.start} className="tt-td-lunch" title="Institutional Lunch Break">
                        <div className="tt-lunch-cell">
                          <span className="tt-lunch-text">LUNCH</span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={interval.start}
                      className={`tt-td-slot ${cell ? 'has-card' : 'is-empty'} ${isLunchSlot ? 'is-lunch-override' : ''}`}
                    >
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
