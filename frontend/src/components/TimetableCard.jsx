import React from 'react';

/**
 * TimetableCard Component
 * Matches the exact visual styling of TT_TRACKER timetable cards:
 * - Clean white background with soft shadow & rounded corners
 * - 3px top accent border (Navy for Theory, Emerald Green for Lab)
 * - Lab badges (LAB in green, Group in peach/orange)
 * - Bold course code
 * - Section line with purple users icon
 * - Room / Faculty line with rose location pin icon
 */
export default function TimetableCard({ cell }) {
  if (!cell) return null;

  const isLab = Boolean(
    cell.isLab ||
    (cell.room && cell.room.toUpperCase().includes('LAB')) ||
    (cell.code && (cell.code.endsWith('7') || cell.code.endsWith('8') || cell.code.endsWith('9'))) ||
    (cell.subjectCode && (cell.subjectCode.endsWith('7') || cell.subjectCode.endsWith('8') || cell.subjectCode.endsWith('9')))
  );

  const subjectCode = cell.code || cell.subjectCode || '—';
  const faculty = cell.faculty || '';
  const room = cell.room || 'TBA';
  const section = cell.section ? (cell.year ? `${cell.section}` : cell.section) : '';
  const groupLabel = cell.group || (isLab ? (subjectCode.endsWith('7') ? 'G1' : 'G2') : null);

  return (
    <div
      className={`tt-class-card ${isLab ? 'tt-card-lab' : 'tt-card-theory'}`}
      title={`${subjectCode} | ${faculty} | Room: ${room}`}
    >
      {/* Top badges for lab */}
      {isLab && (
        <div className="tt-badge-row">
          <span className="tt-badge tt-badge-lab">LAB</span>
          {groupLabel && (
            <span className="tt-badge tt-badge-group">{groupLabel}</span>
          )}
        </div>
      )}

      {/* Course Code */}
      <div className="tt-course-code">{subjectCode}</div>

      {/* Section / Batch Info with People Icon */}
      {section && (
        <div className="tt-meta-row tt-meta-section">
          <svg
            className="tt-meta-icon tt-icon-people"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="tt-meta-text">{section}</span>
        </div>
      )}

      {/* Room & Faculty with Pin Icon */}
      <div className="tt-meta-row tt-meta-room">
        <svg
          className="tt-meta-icon tt-icon-pin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="tt-meta-text" title={faculty ? `${room} (${faculty})` : room}>
          {room}
          {faculty && <span className="tt-faculty-inline"> · {faculty}</span>}
        </span>
      </div>
    </div>
  );
}
