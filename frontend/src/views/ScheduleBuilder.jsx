import React, { useState, useMemo } from 'react';
import {
  RAW_SECTIONS,
  FACULTY_ROSTER,
  DAYS,
  INTERVALS,
  createInitialStore,
  generateTimetableForSection
} from '../data/timetableData';
import TimetableGrid from '../components/TimetableGrid';

export default function ScheduleBuilder({ onShowToast }) {
  const [store, setStore] = useState(() => createInitialStore());
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSec, setSelectedSec] = useState('');

  // Persisted state across generations
  const [persistedGrids] = useState(() => new Map());
  const [globalFacBookings] = useState(() => new Set());
  const [globalRoomBookings] = useState(() => new Set());
  const [currentGrid, setCurrentGrid] = useState(null);

  // Derived options
  const years = useMemo(() => [...new Set(store.map(s => s.year))], [store]);

  const semesters = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(store.filter(s => s.year === selectedYear).map(s => s.semester))];
  }, [store, selectedYear]);

  const sections = useMemo(() => {
    if (!selectedYear || !selectedSem) return [];
    return store.filter(s => s.year === selectedYear && s.semester === selectedSem);
  }, [store, selectedYear, selectedSem]);

  const currentSection = useMemo(() => {
    if (!selectedYear || !selectedSem || !selectedSec) return null;
    return store.find(
      s => s.year === selectedYear && s.semester === selectedSem && s.name === selectedSec
    ) || null;
  }, [store, selectedYear, selectedSem, selectedSec]);

  // Handle dropdown changes
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setSelectedSem('');
    setSelectedSec('');
    setCurrentGrid(null);
  };

  const handleSemChange = (e) => {
    setSelectedSem(e.target.value);
    setSelectedSec('');
    setCurrentGrid(null);
  };

  const handleSecChange = (e) => {
    const secName = e.target.value;
    setSelectedSec(secName);

    if (secName && selectedYear && selectedSem) {
      const secKey = `${secName}_${selectedYear}_${selectedSem}`;
      if (persistedGrids.has(secKey)) {
        setCurrentGrid(persistedGrids.get(secKey));
      } else {
        setCurrentGrid(null);
      }
    } else {
      setCurrentGrid(null);
    }
  };

  // Faculty Allocation updates
  const handleFacultyChange = (courseCode, isLab, facultyName) => {
    if (!currentSection) return;

    setStore(prevStore =>
      prevStore.map(sec => {
        if (
          sec.name === currentSection.name &&
          sec.year === currentSection.year &&
          sec.semester === currentSection.semester
        ) {
          if (isLab) {
            return {
              ...sec,
              labs: sec.labs.map(l =>
                l.code === courseCode ? { ...l, faculty: facultyName || null } : l
              )
            };
          } else {
            return {
              ...sec,
              subjects: sec.subjects.map(s =>
                s.code === courseCode ? { ...s, faculty: facultyName || null } : s
              )
            };
          }
        }
        return sec;
      })
    );
  };

  // Run generation algorithm
  const handleGenerate = () => {
    if (!currentSection) {
      alert('Please select Year, Semester, and Section first.');
      return;
    }

    const grid = generateTimetableForSection({
      section: currentSection,
      globalFacBookings,
      globalRoomBookings,
      persistedGrids
    });

    setCurrentGrid([...grid]);
    if (onShowToast) {
      onShowToast(`Timetable successfully generated for ${currentSection.name} (${currentSection.semester})`);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const flatData = [];

    persistedGrids.forEach((grid, secKey) => {
      const [name, year, semester] = secKey.split('_');

      DAYS.forEach((dayName, dIdx) => {
        INTERVALS.forEach((interval, pIdx) => {
          const cell = grid[dIdx][pIdx];
          if (!cell) return;

          flatData.push({
            section: name,
            year: year,
            semester: semester,
            day: dayName,
            start: interval.start,
            end: interval.end,
            subjectCode: cell.code,
            faculty: cell.faculty,
            room: cell.room
          });
        });
      });
    });

    if (flatData.length === 0) {
      alert('No timetables have been generated yet to export.');
      return;
    }

    const blob = new Blob([JSON.stringify(flatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'base_timetable.json';
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) {
      onShowToast(`Exported ${flatData.length} timetable entries as base_timetable.json`);
    }
  };

  // Prepare allocation items
  const allocationItems = useMemo(() => {
    if (!currentSection) return [];
    const subjects = currentSection.subjects.map(s => ({ ...s, isLab: false }));
    const labs = currentSection.labs.map(l => ({ ...l, isLab: true }));
    return [...subjects, ...labs];
  }, [currentSection]);

  return (
    <main className="studio-canvas">
      {/* Configuration & Control Panel */}
      <section className="toolbar-card" aria-label="Timetable Configuration">
        <div className="toolbar-row-top">
          <div className="page-heading">
            <h1>Academic Timetable Builder</h1>
            <p className="page-subheading">
              Department of Computer Science &amp; Engineering &mdash; Allocate faculty and generate conflict-free schedules.
            </p>
          </div>
          <div className="toolbar-actions">
            {persistedGrids.size > 0 && (
              <button
                type="button"
                className="btn-studio btn-export"
                onClick={handleExportJson}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export JSON ({persistedGrids.size} Sections)
              </button>
            )}
          </div>
        </div>

        <div className="toolbar-row-bottom">
          <div className="toolbar-controls-left">
            {/* Year Selector */}
            <div className="control-field">
              <label htmlFor="yearSelect" className="control-label">Academic Year</label>
              <select
                id="yearSelect"
                className="form-control"
                value={selectedYear}
                onChange={handleYearChange}
              >
                <option value="">&mdash; Select Year &mdash;</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Semester Selector */}
            <div className="control-field">
              <label htmlFor="semSelect" className="control-label">Semester</label>
              <select
                id="semSelect"
                className="form-control"
                value={selectedSem}
                onChange={handleSemChange}
                disabled={!selectedYear}
              >
                <option value="">&mdash; Select Semester &mdash;</option>
                {semesters.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Section Selector */}
            <div className="control-field">
              <label htmlFor="secSelect" className="control-label">Section</label>
              <select
                id="secSelect"
                className="form-control"
                value={selectedSec}
                onChange={handleSecChange}
                disabled={!selectedSem}
              >
                <option value="">&mdash; Select Section &mdash;</option>
                {sections.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty Allocation Table */}
      {currentSection && (
        <section className="panel-card" aria-label="Faculty Allocation Matrix">
          <div className="panel-header">
            <div className="panel-header-left">
              <span className="panel-title">Faculty Allocation Matrix</span>
              <span className="panel-meta-tag">
                {currentSection.name} &bull; {currentSection.year} ({currentSection.semester})
              </span>
            </div>
            <div className="panel-header-right">
              <button
                type="button"
                className="btn-studio btn-primary"
                onClick={handleGenerate}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Generate Base Timetable
              </button>
            </div>
          </div>

          <div className="panel-body">
            <table className="alloc-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Type</th>
                  <th style={{ width: '110px' }}>Course Code</th>
                  <th>Course Title</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Credits</th>
                  <th style={{ width: '260px' }}>Assigned Faculty</th>
                </tr>
              </thead>
              <tbody>
                {allocationItems.map(item => {
                  const pool = item.isLab ? currentSection.labs : currentSection.subjects;
                  const assignedSet = new Set(
                    pool.filter(i => i.code !== item.code && i.faculty).map(i => i.faculty)
                  );
                  const availableFaculty = FACULTY_ROSTER.filter(
                    f => !assignedSet.has(f) || item.faculty === f
                  );

                  return (
                    <tr key={item.code}>
                      <td>
                        <span className={`type-badge ${item.isLab ? 'type-badge-lab' : 'type-badge-theory'}`}>
                          {item.isLab ? 'Lab' : 'Theory'}
                        </span>
                      </td>
                      <td className="code-cell">{item.code}</td>
                      <td className="name-cell">{item.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.credits}</td>
                      <td>
                        <select
                          className="form-control form-control-sm"
                          value={item.faculty || ''}
                          onChange={(e) => handleFacultyChange(item.code, item.isLab, e.target.value)}
                          aria-label={`Faculty for ${item.code}`}
                        >
                          <option value="">&mdash; Auto-Assign / Unassigned &mdash;</option>
                          {availableFaculty.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Timetable Grid View (Styled exactly like TT_TRACKER reference) */}
      {currentSection && currentGrid && (
        <section className="panel-card" aria-label="Generated Timetable Grid">
          <div className="panel-header">
            <div className="panel-header-left">
              <span className="panel-title">Generated Timetable</span>
              <span className="panel-meta-tag">
                {currentSection.name} &bull; {currentSection.year} ({currentSection.semester})
              </span>
            </div>
            <div className="panel-header-right">
              <span className="badge-generated-status">
                <span className="status-dot"></span> Conflict-Free Validated
              </span>
            </div>
          </div>

          <div className="panel-body panel-grid-body">
            <TimetableGrid grid={currentGrid} />
          </div>
        </section>
      )}
    </main>
  );
}
