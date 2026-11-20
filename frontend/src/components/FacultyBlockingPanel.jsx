import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DAYS } from '../data/timetableData';

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

function periodTime(p) {
  const h = 9 + (p - 1);
  const pad = n => String(n).padStart(2, '0');
  return { start: `${pad(h)}:00`, end: `${pad(h + 1)}:00` };
}

function periodLabel(p) {
  const t = periodTime(p);
  return `Period ${p} (${t.start}–${t.end})`;
}

function rangeLabel(b) {
  const a = periodTime(b.startPeriod);
  const z = periodTime(b.endPeriod);
  const periods = b.startPeriod === b.endPeriod
    ? `Period ${b.startPeriod}`
    : `Periods ${b.startPeriod}–${b.endPeriod}`;
  return `${periods} · ${a.start}–${z.end}`;
}

/**
 * Asks the timetable maker whether any faculty time slots should be closed before
 * generating, and lets them add / remove blocks (searchable faculty dropdown +
 * day + period range). Blocks are saved per semester type on the backend.
 */
export default function FacultyBlockingPanel({ semester, blocks, roster, onChanged, onShowToast }) {
  // null = not answered yet, true = managing blocks, false = "No, continue"
  const [answer, setAnswer] = useState(null);
  const [query, setQuery] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [day, setDay] = useState('Monday');
  const [startPeriod, setStartPeriod] = useState(1);
  const [endPeriod, setEndPeriod] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const comboRef = useRef(null);

  const hasBlocks = blocks.length > 0;
  const expanded = answer === true || (answer === null && hasBlocks);

  // A fresh semester selection shows the question again
  useEffect(() => {
    setAnswer(null);
    setSelected(null);
    setQuery('');
    setError('');
  }, [semester]);

  useEffect(() => {
    function onDocClick(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) setComboOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(f =>
      f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)
    );
  }, [query, roster]);

  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) =>
      a.facultyName.localeCompare(b.facultyName) ||
      DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
      a.startPeriod - b.startPeriod
    );
  }, [blocks]);

  function chooseFaculty(f) {
    setSelected(f);
    setQuery(`${f.name} (${f.code})`);
    setComboOpen(false);
    setError('');
  }

  function onComboKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setComboOpen(true);
      setActiveIdx(i => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && comboOpen && matches[activeIdx]) {
      e.preventDefault();
      chooseFaculty(matches[activeIdx]);
    } else if (e.key === 'Escape') {
      setComboOpen(false);
    }
  }

  function onStartChange(value) {
    const v = Number(value);
    setStartPeriod(v);
    if (endPeriod < v) setEndPeriod(v);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!selected) {
      setError('Search and choose a faculty member first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/faculty-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester,
          facultyCode: selected.code,
          day,
          startPeriod,
          endPeriod,
          note: note.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not save the block.');
        return;
      }
      if (onShowToast) {
        const warn = data.warnings && data.warnings.length ? ` Note: ${data.warnings[0]}` : '';
        onShowToast(`Blocked ${selected.name} on ${day}, ${rangeLabel(data.block)}.${warn}`);
      }
      setNote('');
      await onChanged();
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(block) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/faculty-blocks/${encodeURIComponent(block.id)}?semester=${encodeURIComponent(semester)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (onShowToast) onShowToast(data.error || 'Could not remove the block.');
        return;
      }
      if (onShowToast) onShowToast(`Removed block for ${block.facultyName} on ${block.day}.`);
      await onChanged();
    } catch (err) {
      if (onShowToast) onShowToast('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="block-panel" aria-label="Faculty slot blocking">
      <div className="block-panel-header">
        <div>
          <span className="block-panel-title">Faculty Time-Slot Blocking</span>
          <span className="block-panel-semester">{semester} Semester</span>
        </div>
        {hasBlocks && (
          <span className="block-panel-count">
            {blocks.length} blocked {blocks.length === 1 ? 'range' : 'ranges'}
          </span>
        )}
      </div>

      {answer === null && !hasBlocks && (
        <div className="block-panel-question">
          <p className="block-panel-text">
            Before generating, do you want to close any time slots for a faculty member
            (for example, first-year classes they teach)? Only the chosen slots are closed;
            the faculty member stays available for the rest of the week.
          </p>
          <div className="block-panel-actions">
            <button type="button" className="btn-studio btn-primary" onClick={() => setAnswer(true)}>
              Yes, block time slots
            </button>
            <button type="button" className="btn-studio btn-export" onClick={() => setAnswer(false)}>
              No, continue
            </button>
          </div>
        </div>
      )}

      {answer === false && !hasBlocks && (
        <div className="block-panel-question">
          <p className="block-panel-text">No faculty time slots are blocked for {semester} Semester.</p>
          <div className="block-panel-actions">
            <button type="button" className="btn-studio btn-export" onClick={() => setAnswer(true)}>
              Block time slots
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <>
          <form className="block-form" onSubmit={handleAdd}>
            <div className="control-field block-field-faculty" ref={comboRef}>
              <label htmlFor="blockFacultySearch" className="control-label">Faculty</label>
              <input
                id="blockFacultySearch"
                className="form-control"
                type="text"
                role="combobox"
                aria-expanded={comboOpen}
                aria-controls="blockFacultyList"
                aria-autocomplete="list"
                autoComplete="off"
                placeholder="Search by name or code"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setComboOpen(true);
                  setActiveIdx(0);
                }}
                onFocus={() => setComboOpen(true)}
                onKeyDown={onComboKeyDown}
              />
              {comboOpen && (
                <ul id="blockFacultyList" className="block-combo-list" role="listbox">
                  {matches.length === 0 && (
                    <li className="block-combo-empty">No faculty match &ldquo;{query}&rdquo;</li>
                  )}
                  {matches.map((f, i) => (
                    <li
                      key={f.code}
                      role="option"
                      aria-selected={i === activeIdx}
                      className={`block-combo-item${i === activeIdx ? ' is-active' : ''}`}
                      onMouseDown={e => { e.preventDefault(); chooseFaculty(f); }}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <span>{f.name}</span>
                      <span className="block-combo-code">{f.code}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="control-field">
              <label htmlFor="blockDay" className="control-label">Day</label>
              <select id="blockDay" className="form-control" value={day} onChange={e => setDay(e.target.value)}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="control-field">
              <label htmlFor="blockFrom" className="control-label">From</label>
              <select id="blockFrom" className="form-control" value={startPeriod} onChange={e => onStartChange(e.target.value)}>
                {PERIODS.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
              </select>
            </div>

            <div className="control-field">
              <label htmlFor="blockTo" className="control-label">To</label>
              <select id="blockTo" className="form-control" value={endPeriod} onChange={e => setEndPeriod(Number(e.target.value))}>
                {PERIODS.filter(p => p >= startPeriod).map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
              </select>
            </div>

            <div className="control-field block-field-note">
              <label htmlFor="blockNote" className="control-label">Note (optional)</label>
              <input
                id="blockNote"
                className="form-control"
                type="text"
                maxLength={300}
                placeholder="e.g. First-year class"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="control-field block-field-submit">
              <button type="submit" className="btn-studio btn-primary" disabled={busy}>
                {busy ? 'Saving...' : 'Block slots'}
              </button>
            </div>
          </form>

          {error && <p className="block-error" role="alert">{error}</p>}

          {hasBlocks ? (
            <ul className="block-list" aria-label="Blocked slots">
              {sortedBlocks.map(b => (
                <li key={b.id} className="block-list-item">
                  <span className="block-list-faculty">
                    {b.facultyName} <span className="block-combo-code">{b.facultyCode}</span>
                  </span>
                  <span className="block-list-when">{b.day} &middot; {rangeLabel(b)}</span>
                  {b.note && <span className="block-list-note">{b.note}</span>}
                  <button
                    type="button"
                    className="block-remove"
                    disabled={busy}
                    onClick={() => handleRemove(b)}
                    aria-label={`Remove block for ${b.facultyName} on ${b.day}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="block-panel-text block-empty">No blocked slots yet.</p>
          )}

          <p className="block-hint">
            Blocks apply when you generate. If you change them after generating, regenerate
            the affected sections: any class left inside a blocked slot is reported as a
            conflict and keeps the timetable from being exported.
          </p>
        </>
      )}
    </div>
  );
}
