import React, { useState, useMemo } from 'react';
import {
  FACULTY_ROSTER,
  CANDIDATE_THEORY_ROOMS,
  DEFAULT_THEORY_ROOMS,
  DAYS,
  INTERVALS,
  createInitialStore,
  generateTimetableForSection
} from '../data/timetableData';
import TimetableGrid from '../components/TimetableGrid';
import ConfirmationModal from '../components/ConfirmationModal';

/**
 * Extracts flat timetable slot records from a 5-day x 8-period grid.
 */
function extractSlotsFromGrid(grid, name, year, semester) {
  const slots = [];
  DAYS.forEach((dayName, dIdx) => {
    INTERVALS.forEach((interval, pIdx) => {
      const cell = grid[dIdx][pIdx];
      if (!cell) return;

      const entries = Array.isArray(cell) ? cell : [cell];
      entries.forEach(item => {
        slots.push({
          section: name,
          year: year,
          semester: semester,
          day: dayName,
          start: interval.start,
          end: interval.end,
          subjectCode: item.code || item.subjectCode,
          facultyCode: item.facultyCode || item.faculty || null,
          faculty: item.faculty || null,
          room: item.room || null,
          isLab: item.isLab === true,
          duration: item.duration || 1,
          group: item.group || null,
          sessionId: item.sessionId || null,
          electiveType: item.electiveType || null,
          basket: item.basket || null,
          isReservedEmpty: item.isReservedEmpty === true
        });
      });
    });
  });
  return slots;
}

export default function ScheduleBuilder({ onShowToast }) {
  const [store, setStore] = useState(() => createInitialStore());
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSec, setSelectedSec] = useState('');

  // 4 Shared Theory Rooms configuration (user selectable from 22 candidates)
  const [selectedRooms, setSelectedRooms] = useState(DEFAULT_THEORY_ROOMS);

  // Persisted state across generations
  const [persistedGrids] = useState(() => new Map());
  const [gridGenerationIds] = useState(() => new Map());
  const [exportedSections] = useState(() => new Map());
  const [exportVersion, setExportVersion] = useState(0);

  // Semester handoff state
  const [targetSemester, setTargetSemester] = useState('Odd Semester');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isHandoffLoading, setIsHandoffLoading] = useState(false);

  const [globalFacBookings] = useState(() => new Set());
  const [globalRoomBookings] = useState(() => new Set());
  const [cohortElectiveBookings] = useState(() => new Map());
  const [currentGrid, setCurrentGrid] = useState(null);

  // Derived options directly from authoritative store
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

  // Handle theory room selection (exactly 4 rooms, no duplicates)
  const handleRoomSlotChange = (index, newRoom) => {
    if (selectedRooms.includes(newRoom) && selectedRooms[index] !== newRoom) {
      if (onShowToast) {
        onShowToast(`Room ${newRoom} is already selected in another slot.`);
      }
      return;
    }
    const updated = [...selectedRooms];
    updated[index] = newRoom;
    setSelectedRooms(updated);
    if (onShowToast) {
      onShowToast(`Active Shared Theory Rooms updated: ${updated.join(', ')}`);
    }
  };

  // Faculty Allocation updates (store faculty code internally, user sees full name)
  const handleFacultyChange = (courseCode, isLab, facultyCode, isElective = false) => {
    if (!currentSection) return;

    // Clear cohort elective bookings cache if an elective was changed so fresh slots are computed
    const cohortKey = `${currentSection.year}_${currentSection.semester}`;
    if (isElective && cohortElectiveBookings.has(cohortKey)) {
      cohortElectiveBookings.delete(cohortKey);
    }

    setStore(prevStore =>
      prevStore.map(sec => {
        // ELECTIVE RULE: Elective configuration applies to ALL paired sections of the same cohort (e.g. CS3 + CD3)
        if (isElective || (sec.electives && sec.electives.some(e => e.code === courseCode))) {
          if (
            sec.year === currentSection.year &&
            sec.semester === currentSection.semester
          ) {
            return {
              ...sec,
              electives: (sec.electives || []).map(e =>
                e.code === courseCode ? { ...e, faculty: facultyCode || null } : e
              )
            };
          }
          return sec;
        }

        // NON-ELECTIVES (Standard Theory & Labs): Specific to the selected section
        if (
          sec.name === currentSection.name &&
          sec.year === currentSection.year &&
          sec.semester === currentSection.semester
        ) {
          if (isLab) {
            return {
              ...sec,
              labs: (sec.labs || []).map(l =>
                l.code === courseCode ? { ...l, faculty: facultyCode || null } : l
              )
            };
          } else {
            return {
              ...sec,
              subjects: (sec.subjects || []).map(s =>
                s.code === courseCode ? { ...s, faculty: facultyCode || null } : s
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
      if (onShowToast) {
        onShowToast('Please select Year, Semester, and Section first.');
      }
      return;
    }

    const grid = generateTimetableForSection({
      section: currentSection,
      selectedTheoryRooms: selectedRooms,
      globalFacBookings,
      globalRoomBookings,
      persistedGrids,
      cohortElectiveBookings
    });

    // Track generation instance for staleness detection
    const secKey = `${currentSection.name}_${currentSection.year}_${currentSection.semester}`;
    const genId = `gen_${secKey}_${Date.now()}`;
    gridGenerationIds.set(secKey, genId);
    setExportVersion(v => v + 1);

    setCurrentGrid([...grid]);
    if (onShowToast) {
      onShowToast(`Timetable successfully generated for ${currentSection.name} (${currentSection.semester})`);
    }
  };

  // Export JSON with all required metadata (preserves existing behavior and updates export tracking)
  const handleExportJson = () => {
    const flatData = [];

    persistedGrids.forEach((grid, secKey) => {
      const [name, year, semester] = secKey.split('_');
      const secSlots = extractSlotsFromGrid(grid, name, year, semester);
      flatData.push(...secSlots);

      const curGenId = gridGenerationIds.get(secKey) || `gen_${secKey}_${Date.now()}`;
      gridGenerationIds.set(secKey, curGenId);
      exportedSections.set(secKey, {
        secKey,
        name,
        year,
        semester,
        generationId: curGenId,
        exportedAt: new Date().toISOString(),
        slots: secSlots
      });
    });

    setExportVersion(v => v + 1);

    if (flatData.length === 0) {
      if (onShowToast) {
        onShowToast('No timetables have been generated yet to export.');
      }
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

  // Export JSON for the currently viewed section specifically
  const handleExportCurrentSectionJson = () => {
    if (!currentSection || !currentGrid) {
      if (onShowToast) onShowToast('Generate base timetable for this section first.');
      return;
    }
    const secKey = `${currentSection.name}_${currentSection.year}_${currentSection.semester}`;
    const secSlots = extractSlotsFromGrid(currentGrid, currentSection.name, currentSection.year, currentSection.semester);
    if (secSlots.length === 0) {
      if (onShowToast) onShowToast('No scheduled slots to export for this section.');
      return;
    }

    const genId = gridGenerationIds.get(secKey) || `gen_${secKey}_${Date.now()}`;
    gridGenerationIds.set(secKey, genId);
    exportedSections.set(secKey, {
      secKey,
      name: currentSection.name,
      year: currentSection.year,
      semester: currentSection.semester,
      generationId: genId,
      exportedAt: new Date().toISOString(),
      slots: secSlots
    });
    setExportVersion(v => v + 1);

    const blob = new Blob([JSON.stringify(secSlots, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSection.name}_timetable.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) {
      onShowToast(`Exported ${secSlots.length} slots for ${currentSection.name} (${currentSection.semester})`);
    }
  };

  // Dynamically determine required sections for selected semester cycle
  const requiredSections = useMemo(() => {
    return store.filter(sec => {
      // M.Tech sections are not part of the standard undergraduate term package
      const isMTech = sec.year && sec.year.includes('M.Tech');
      if (isMTech && (targetSemester === 'Odd Semester' || targetSemester === 'Even Semester')) {
        return false;
      }

      if (targetSemester === 'Odd Semester') {
        const isOdd = sec.semester.includes('1st') || sec.semester.includes('3rd') ||
                      sec.semester.includes('5th') || sec.semester.includes('7th') ||
                      sec.semester.includes('9th');
        if (!isOdd) return false;
      } else if (targetSemester === 'Even Semester') {
        const isEven = sec.semester.includes('2nd') || sec.semester.includes('4th') ||
                       sec.semester.includes('6th') || sec.semester.includes('8th') ||
                       sec.semester.includes('10th');
        if (!isEven) return false;
      } else {
        if (sec.semester !== targetSemester) return false;
      }

      // Check if section actually has classes (Section 7: sections without classes do not block)
      const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
      return totalClasses > 0;
    }).map(sec => ({
      ...sec,
      secKey: `${sec.name}_${sec.year}_${sec.semester}`
    }));
  }, [store, targetSemester]);

  // Evaluate export status for each required section
  const sectionExportStatuses = useMemo(() => {
    return requiredSections.map(sec => {
      const isExported = exportedSections.has(sec.secKey);
      const currentGenId = gridGenerationIds.get(sec.secKey);
      const exportRecord = exportedSections.get(sec.secKey);
      const isStale = Boolean(isExported && currentGenId && exportRecord && currentGenId !== exportRecord.generationId);
      const isFresh = Boolean(isExported && !isStale);

      return {
        section: sec,
        isExported,
        isStale,
        isFresh,
        slotCount: exportRecord?.slots?.length || 0
      };
    });
  }, [requiredSections, exportedSections, gridGenerationIds, exportVersion]);

  const missingSections = useMemo(() => {
    return sectionExportStatuses.filter(s => !s.isExported);
  }, [sectionExportStatuses]);

  const staleSections = useMemo(() => {
    return sectionExportStatuses.filter(s => s.isStale);
  }, [sectionExportStatuses]);

  const isReadyForHandoff = requiredSections.length > 0 &&
                           missingSections.length === 0 &&
                           staleSections.length === 0;

  // Handoff timetable package to TT_TRACKER backend
  const handleGenerateTimetableHandoff = async () => {
    if (!isReadyForHandoff) {
      if (onShowToast) {
        onShowToast('Cannot generate timetable: Not all required sections have fresh exports.');
      }
      return;
    }

    setIsHandoffLoading(true);

    const allSlots = [];
    requiredSections.forEach(s => {
      const record = exportedSections.get(s.secKey);
      if (record && Array.isArray(record.slots)) {
        allSlots.push(...record.slots);
      }
    });

    const completePackage = {
      schemaVersion: '1.0.0',
      source: 'FATGS',
      semester: targetSemester,
      academicYear: '2025-2026',
      exportedAt: new Date().toISOString(),
      generationId: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sections: requiredSections.map(s => s.name),
      totalSlots: allSlots.length,
      timetable: allSlots
    };

    try {
      const res = await fetch('/api/handoff-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: completePackage })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsHandoffLoading(false);
        setIsConfirmModalOpen(false);
        if (onShowToast) {
          onShowToast('Timetable successfully handed off to TT_TRACKER. Redirecting...');
        }
        setTimeout(() => {
          window.location.href = data.redirectUrl || 'http://localhost:5000/timetable';
        }, 800);
      } else {
        setIsHandoffLoading(false);
        if (onShowToast) {
          onShowToast(`TT_TRACKER handoff error: ${data.error || 'Request rejected'}`);
        }
      }
    } catch (err) {
      setIsHandoffLoading(false);
      if (onShowToast) {
        onShowToast(`Network error communicating with FATGS backend: ${err.message}`);
      }
    }
  };

  // Separate normal subjects, labs, and elective baskets
  const compulsorySubjects = useMemo(() => {
    if (!currentSection) return [];
    return (currentSection.subjects || []).map(s => ({ ...s, isLab: false }));
  }, [currentSection]);

  const labCourses = useMemo(() => {
    if (!currentSection) return [];
    return (currentSection.labs || []).map(l => ({ ...l, isLab: true }));
  }, [currentSection]);

  const electiveBaskets = useMemo(() => {
    if (!currentSection || !currentSection.electives || currentSection.electives.length === 0) return [];
    const map = new Map();
    currentSection.electives.forEach(e => {
      const bName = e.basket || (e.electiveType === 'OE' ? 'Open Elective' : 'Discipline Elective');
      if (!map.has(bName)) map.set(bName, []);
      map.get(bName).push(e);
    });
    return Array.from(map.entries()).map(([basketName, subjects]) => ({
      basketName,
      subjects
    }));
  }, [currentSection]);

  return (
    <main className="studio-canvas">
      {/* Configuration & Control Panel */}
      <section className="toolbar-card" aria-label="Timetable Configuration">
        <div className="toolbar-row-top">
          <div className="page-heading">
            <h1>Academic Timetable Builder</h1>
            <p className="page-subheading">
              Department of Computer Science &amp; Engineering &mdash; Allocate authoritative faculty and generate conflict-free schedules.
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
                {years.map(y => {
                  let displayName = y;
                  if (y === '2nd Year') displayName = 'Second Year (2nd Year)';
                  else if (y === '3rd Year') displayName = 'Third Year (3rd Year)';
                  else if (y === '4th Year') displayName = 'Fourth Year (4th Year)';
                  else if (y === '5th Year') displayName = 'Fifth Year / Dual Degree (5th Year)';
                  else if (y === 'M.Tech 1st Year') displayName = 'M.Tech (1st Year)';
                  return <option key={y} value={y}>{displayName}</option>;
                })}
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
                {sections.map(s => {
                  let secLabel = s.name;
                  if (s.name === 'CD5') secLabel = 'CD5 (Dual Degree)';
                  else if (s.name === 'MT1') secLabel = 'MT1 (M.Tech CSE)';
                  else if (s.name === 'MA1') secLabel = 'MA1 (M.Tech AI)';
                  return <option key={s.name} value={s.name}>{secLabel}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Shared 4 Theory Rooms Selector Panel */}
          <div className="shared-rooms-panel">
            <div className="shared-rooms-title">
              Configured Shared Theory Rooms (Sections CS2, CD2, CS3, CD3, CS4, CD4 share these 4 classrooms):
            </div>
            <div className="shared-rooms-slots">
              {[0, 1, 2, 3].map(slotIdx => (
                <div key={slotIdx} className="shared-room-slot">
                  <span className="shared-room-label">Room {slotIdx + 1}:</span>
                  <select
                    className="form-control form-control-sm shared-room-select"
                    value={selectedRooms[slotIdx]}
                    onChange={(e) => handleRoomSlotChange(slotIdx, e.target.value)}
                  >
                    {CANDIDATE_THEORY_ROOMS.map(r => (
                      <option key={r} value={r} disabled={selectedRooms.includes(r) && selectedRooms[slotIdx] !== r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Semester Completeness & TT_TRACKER Handoff Panel */}
      <section className="handoff-panel" aria-label="Semester Timetable Handoff to TT_TRACKER">
        <div className="handoff-header">
          <div className="handoff-title-group">
            <span className="type-badge type-badge-basket">TT_TRACKER</span>
            <span className="handoff-title">Semester Timetable Handoff &amp; Completeness Status</span>
          </div>

          <div className="handoff-controls">
            <label htmlFor="targetSemSelect" className="control-label">Target Semester:</label>
            <select
              id="targetSemSelect"
              className="handoff-semester-select"
              value={targetSemester}
              onChange={(e) => setTargetSemester(e.target.value)}
            >
              <option value="Odd Semester">Odd Semester (3rd, 5th, 7th, 9th Sem)</option>
              <option value="Even Semester">Even Semester (4th, 6th, 8th Sem)</option>
            </select>
          </div>
        </div>

        {/* Status Grid of participating sections */}
        <div className="handoff-grid">
          {sectionExportStatuses.map(({ section: s, isExported, isStale, isFresh, slotCount }) => (
            <div
              key={s.secKey}
              className={`handoff-item ${isFresh ? 'item-exported' : isStale ? 'item-stale' : 'item-missing'}`}
            >
              <span className="handoff-sec-name">{s.name} ({s.semester.replace(' Semester', '')})</span>
              <span className={`handoff-status-tag ${isFresh ? 'status-exported' : isStale ? 'status-stale' : 'status-missing'}`}>
                {isFresh ? `✓ Exported (${slotCount})` : isStale ? '⚠️ Stale' : '✗ Not Exported'}
              </span>
            </div>
          ))}
        </div>

        <div className="handoff-footer">
          <div className={`handoff-summary ${isReadyForHandoff ? 'summary-ready' : 'summary-incomplete'}`}>
            {isReadyForHandoff ? (
              <span>✓ All required sections exported ({requiredSections.length}/{requiredSections.length} sections ready).</span>
            ) : (
              <span>
                Cannot generate timetable. Missing: {missingSections.map(s => s.name).join(', ') || 'None'}
                {staleSections.length > 0 && ` | Stale (Regenerated — re-export required): ${staleSections.map(s => s.name).join(', ')}`}
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn-generate-timetable"
            disabled={!isReadyForHandoff || isHandoffLoading}
            onClick={() => setIsConfirmModalOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            Generate Timetable
          </button>
        </div>
      </section>

      {/* Faculty Allocation Section */}
      {currentSection && (
        <section className="panel-card" aria-label="Faculty Allocation Matrix">
          <div className="panel-header">
            <div className="panel-header-left">
              <span className="panel-title">Faculty Allocation Matrix</span>
              <span className="panel-meta-tag">
                {currentSection.name} &bull; {currentSection.year} ({currentSection.semester})
              </span>
            </div>
            <div className="panel-header-right" style={{ display: 'flex', gap: '8px' }}>
              {currentGrid && (
                <button
                  type="button"
                  className="btn-studio btn-secondary"
                  onClick={handleExportCurrentSectionJson}
                  title={`Export JSON for ${currentSection.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export Section JSON
                </button>
              )}
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
            {/* Compulsory Theory & Lab Courses Header */}
            <div className="alloc-section-header">
              <span className="alloc-section-title">
                Compulsory Subjects &amp; Practical Laboratories
              </span>
            </div>

            <table className="alloc-table">
              <thead>
                <tr>
                  <th className="col-type">Type</th>
                  <th className="col-code">Course Code</th>
                  <th>Course Title</th>
                  <th className="col-credits">Credits</th>
                  <th className="col-faculty">Assigned Faculty (Full Name)</th>
                </tr>
              </thead>
              <tbody>
                {[...compulsorySubjects, ...labCourses].map(item => (
                  <tr key={item.code}>
                    <td>
                      <span className={`type-badge ${item.isLab ? 'type-badge-lab' : 'type-badge-theory'}`}>
                        {item.isLab ? 'Lab' : 'Theory'}
                      </span>
                    </td>
                    <td className="code-cell">{item.code}</td>
                    <td className="name-cell">{item.name}</td>
                    <td className="text-center text-bold">{item.credits}</td>
                    <td>
                      {/* Allocator displays FULL FACULTY NAME, retaining code internally */}
                      <select
                        className="form-control form-control-sm"
                        value={item.faculty || ''}
                        onChange={(e) => handleFacultyChange(item.code, item.isLab, e.target.value, false)}
                        aria-label={`Faculty for ${item.code}`}
                      >
                        <option value="">&mdash; Auto-Assign / Default &mdash;</option>
                        {FACULTY_ROSTER.map(f => (
                          <option key={f.code} value={f.code}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Elective Baskets Section */}
            {electiveBaskets.length > 0 && (
              <div className="alloc-elective-block">
                <div className="alloc-section-header alloc-section-header-elective">
                  <span className="alloc-section-title">
                    Elective Course Baskets
                  </span>
                  <span className="alloc-section-hint">
                    Assign faculty to <strong>offer</strong> an elective subject. Unassigned subjects are not scheduled.
                  </span>
                </div>

                {electiveBaskets.map(({ basketName, subjects }) => {
                  const offeredCount = subjects.filter(s => s.faculty).length;
                  return (
                    <div key={basketName} className="alloc-basket-group">
                      <div className="alloc-basket-header">
                        <div className="alloc-basket-title-group">
                          <span className="type-badge type-badge-basket">
                            Elective Basket
                          </span>
                          <strong className="alloc-basket-name">{basketName}</strong>
                        </div>
                        <span className={`alloc-basket-count ${offeredCount > 0 ? 'active' : ''}`}>
                          {offeredCount > 0 ? `${offeredCount} of ${subjects.length} Offered (Parallel Groups)` : 'None Offered (Assign faculty below to activate)'}
                        </span>
                      </div>

                      <table className="alloc-table">
                        <thead>
                          <tr>
                            <th className="col-type">Status</th>
                            <th className="col-code">Course Code</th>
                            <th>Course Title</th>
                            <th className="col-credits">Credits</th>
                            <th className="col-faculty">Assigned Faculty (Full Name)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map(item => {
                            const isOffered = Boolean(item.faculty);
                            return (
                              <tr key={item.code} className={isOffered ? 'tr-offered' : ''}>
                                <td>
                                  <span className={`type-badge ${isOffered ? 'badge-offered' : 'badge-inactive'}`}>
                                    {isOffered ? 'Offered' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="code-cell">{item.code}</td>
                                <td className="name-cell">{item.name}</td>
                                <td className="text-center text-bold">{item.credits}</td>
                                <td>
                                  <select
                                    className={`form-control form-control-sm ${isOffered ? 'select-offered' : ''}`}
                                    value={item.faculty || ''}
                                    onChange={(e) => handleFacultyChange(item.code, false, e.target.value, true)}
                                    aria-label={`Faculty for ${item.code}`}
                                  >
                                    <option value="">&mdash; Not Offered / Unassigned &mdash;</option>
                                    {FACULTY_ROSTER.map(f => (
                                      <option key={f.code} value={f.code}>
                                        {f.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Timetable Grid View */}
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
            <TimetableGrid grid={currentGrid} section={currentSection} />
          </div>
        </section>
      )}

      {/* TT_TRACKER Handoff Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Replace Base Timetable"
        message="This will replace the current TT_TRACKER base timetable. Continue?"
        confirmText="Continue"
        cancelText="Cancel"
        isLoading={isHandoffLoading}
        loadingMessage="Sending timetable to TT_TRACKER..."
        onConfirm={handleGenerateTimetableHandoff}
        onCancel={() => {
          if (!isHandoffLoading) setIsConfirmModalOpen(false);
        }}
      />
    </main>
  );
}
