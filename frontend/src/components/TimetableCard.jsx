import React from 'react';

/**
 * TimetableCard Component
 * Compact, academic institutional presentation modeled on TT_TRACKER:
 * - Theory: Code on line 1, Room • Faculty Code on line 2. No groups.
 * - Lab: LAB badge + G1/G2 badge, Code, Room • Faculty Code.
 * - Electives (DE/OE): Compact elective badge, Code, Room • Faculty Code.
 * - Reserved (SA-201): Compact RESERVED badge, Code.
 * - Parallel entries (simultaneous G1/G2 labs or DEs): Compact stack with subtle hairline divider.
 */
export default function TimetableCard({ cell }) {
  if (!cell) return null;

  if (Array.isArray(cell)) {
    if (cell.length === 0) return null;
    return (
      <div className="tt-card-stack">
        {cell.map((entry, idx) => (
          <React.Fragment key={entry.sessionId ? `${entry.sessionId}_${idx}` : idx}>
            {idx > 0 && <div className="tt-stack-divider" />}
            <SingleEntry entry={entry} isStacked={cell.length > 1} />
          </React.Fragment>
        ))}
      </div>
    );
  }

  return <SingleEntry entry={cell} isStacked={false} />;
}

function SingleEntry({ entry, isStacked }) {
  if (!entry) return null;

  const subjectCode = entry.code || entry.subjectCode || '—';
  const faculty = entry.faculty || entry.facultyCode || '';
  const room = entry.room || (entry.isReservedEmpty ? '—' : 'TBA');
  const isLab = entry.isLab === true;
  const isDE = entry.electiveType === 'DE' || entry.electiveType === 'SE' || entry.electiveType === 'SC' || (entry.basket && !entry.basket.includes('Open'));
  const isOE = entry.electiveType === 'OE' || (entry.basket && entry.basket.includes('Open'));
  const isReserved = entry.isReservedEmpty === true;
  // Groups must ONLY appear on labs or actual group-based classes, NEVER on theory
  const groupLabel = isLab || isDE || isOE ? entry.group : null;

  if (isReserved) {
    return (
      <div className="tt-entry tt-entry-reserved" title={`${subjectCode} | Reserved Activity Slot`}>
        <div className="tt-tag-row">
          <span className="tt-tag tt-tag-reserved">RESERVED</span>
        </div>
        <div className="tt-entry-code">{subjectCode}</div>
      </div>
    );
  }

  const typeClass = isLab ? 'tt-type-lab' : (isDE ? 'tt-type-de' : (isOE ? 'tt-type-oe' : 'tt-type-theory'));

  return (
    <div
      className={`tt-entry ${typeClass} ${isStacked ? 'tt-entry-compact' : ''}`}
      title={`${subjectCode} | ${room} | Faculty: ${faculty || 'None'}${groupLabel ? ` | Group: ${groupLabel}` : ''}${entry.basket ? ` | Basket: ${entry.basket}` : ''}`}
    >
      {/* Indicator tag row: Only for Lab or Electives, never for standard theory */}
      {(isLab || isDE || isOE) && (
        <div className="tt-tag-row">
          {isLab && <span className="tt-tag tt-tag-lab">LAB</span>}
          {isDE && <span className="tt-tag tt-tag-de">{entry.electiveType || (entry.basket && entry.basket.includes('Stream Core') ? 'SC' : (entry.basket && entry.basket.includes('Stream Elective') ? 'SE' : 'DE'))}</span>}
          {isOE && <span className="tt-tag tt-tag-oe">OE</span>}
          {groupLabel && <span className="tt-tag tt-tag-grp">{groupLabel}</span>}
        </div>
      )}

      {/* Course Code */}
      <div className="tt-entry-code">{subjectCode}</div>

      {/* Room and Faculty Code */}
      <div className="tt-entry-meta">
        <span className="tt-meta-room">{room}</span>
        {faculty && <span className="tt-meta-faculty">&bull; {faculty}</span>}
      </div>
    </div>
  );
}
