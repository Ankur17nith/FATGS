import React, { useState, useMemo, useEffect } from 'react';
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

  // Backend generation completeness state (authoritative source of truth)
  const [backendStatus, setBackendStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Semester handoff state
  const [targetSemester, setTargetSemester] = useState('Odd');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isHandoffLoading, setIsHandoffLoading] = useState(false);

  const [globalFacBookings] = useState(() => new Set());
  const [globalRoomBookings] = useState(() => new Set());
  const [cohortElectiveBookings] = useState(() => new Map());
  const [currentGrid, setCurrentGrid] = useState(null);

  // Fetch generation status from authoritative backend
  const fetchBackendStatus = async (semester = targetSemester) => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch(`/api/timetable/generation-status?semester=${encodeURIComponent(semester)}`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      }
    } catch (err) {
      console.error('[FATGS] Failed to fetch backend generation status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchBackendStatus(targetSemester);
  }, [targetSemester]);

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

  // Run generation algorithm and persist to backend source of truth
  const handleGenerate = async () => {
    if (!currentSection) {
      if (onShowToast) {
        onShowToast('Please select Year, Semester, and Section first.');
      }
      return;
    }

    let grid;
    try {
      grid = generateTimetableForSection({
        section: currentSection,
        selectedTheoryRooms: selectedRooms,
        globalFacBookings,
        globalRoomBookings,
        persistedGrids,
        cohortElectiveBookings
      });
    } catch (err) {
      if (onShowToast) {
        onShowToast(`Timetable generation failed for ${currentSection.name}: ${err.message}`);
      }
      return;
    }

    if (!grid || !Array.isArray(grid)) {
      if (onShowToast) {
        onShowToast(`Timetable generation failed for ${currentSection.name}: Invalid grid produced.`);
      }
      return;
    }

    const secKey = `${currentSection.name}_${currentSection.year}_${currentSection.semester}`;
    const genId = `gen_${secKey}_${Date.now()}`;
    const secSlots = extractSlotsFromGrid(grid, currentSection.name, currentSection.year, currentSection.semester);

    if (secSlots.length === 0) {
      if (onShowToast) {
        onShowToast(`Generation produced 0 scheduled classes for ${currentSection.name}.`);
      }
      return;
    }

    // Track generation instance locally
    gridGenerationIds.set(secKey, genId);
    persistedGrids.set(secKey, grid);
    setExportVersion(v => v + 1);
    setCurrentGrid([...grid]);

    // Save generation record to backend source of truth
    try {
      const res = await fetch('/api/timetable/record-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: currentSection.name,
          year: currentSection.year,
          semester: currentSection.semester,
          generationId: genId,
          slots: secSlots
        })
      });

      const recData = await res.json();
      if (res.ok && recData.success) {
        await fetchBackendStatus(targetSemester);
        if (onShowToast) {
          onShowToast(`✓ Base timetable successfully generated & recorded for ${currentSection.name} (${currentSection.semester})`);
        }
      } else {
        if (onShowToast) {
          onShowToast(`Generated locally, but backend recording failed: ${recData.error || 'Server error'}`);
        }
      }
    } catch (netErr) {
      if (onShowToast) {
        onShowToast(`Base timetable generated locally. Backend sync note: ${netErr.message}`);
      }
    }
  };

  // Export JSON workflow: verifies completeness and opens confirmation modal
  const handleExportJson = () => {
    if (!isExportAllowed) {
      if (onShowToast) {
        onShowToast(`Export JSON unavailable: All required sections with classes for ${targetSemester} Semester must first be generated.`);
      }
      return;
    }
    setIsConfirmModalOpen(true);
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

  // Dynamically determine fallback required sections for selected semester cycle
  const requiredSections = useMemo(() => {
    return store.filter(sec => {
      if (targetSemester === 'Odd' || targetSemester === 'Odd Semester') {
        const isOdd = sec.semester.includes('1st') || sec.semester.includes('3rd') ||
                      sec.semester.includes('5th') || sec.semester.includes('7th') ||
                      sec.semester.includes('9th');
        if (!isOdd) return false;
      } else if (targetSemester === 'Even' || targetSemester === 'Even Semester') {
        const isEven = sec.semester.includes('2nd') || sec.semester.includes('4th') ||
                       sec.semester.includes('6th') || sec.semester.includes('8th') ||
                       sec.semester.includes('10th');
        if (!isEven) return false;
      } else {
        if (sec.semester !== targetSemester) return false;
      }

      // Sections with zero classes do not block
      const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
      return totalClasses > 0;
    }).map(sec => ({
      ...sec,
      secKey: `${sec.name}_${sec.year}_${sec.semester}`
    }));
  }, [store, targetSemester]);

  // Authoritative status from backend (source of truth)
  const isExportAllowed = Boolean(backendStatus && backendStatus.exportAllowed);

  const displayedSections = useMemo(() => {
    if (backendStatus && Array.isArray(backendStatus.sections) && backendStatus.sections.length > 0) {
      return backendStatus.sections;
    }
    return requiredSections.map(s => ({
      ...s,
      section: s.name,
      hasClasses: true,
      generated: false,
      required: true
    }));
  }, [backendStatus, requiredSections]);

  const missingSections = useMemo(() => {
    return displayedSections.filter(s => s.hasClasses && !s.generated);
  }, [displayedSections]);

  const isReadyForHandoff = isExportAllowed;

  // Confirmed export and TT_TRACKER handoff workflow
  const handleConfirmExportAndHandoff = async () => {
    setIsHandoffLoading(true);

    try {
      // 1. Fetch the already-generated complete timetable package for the selected semester
      const exportRes = await fetch(`/api/timetable/export?semester=${encodeURIComponent(targetSemester)}`);
      const exportData = await exportRes.json();

      if (!exportRes.ok || (!exportData.slots && !exportData.timetable)) {
        setIsHandoffLoading(false);
        if (onShowToast) {
          onShowToast(`Export blocked: ${exportData.error || 'Failed to retrieve complete timetable package'}`);
        }
        return;
      }

      // 2. Perform authenticated server-to-server handoff via FATGS backend
      const res = await fetch('/api/handoff-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester: targetSemester,
          package: exportData
        })
      });

      const data = await res.json();
      setIsHandoffLoading(false);

      if (res.ok && data.success) {
        setIsConfirmModalOpen(false);

        // 3. Local JSON download of the verified base timetable package
        try {
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `base_timetable_${targetSemester.replace(/\s+/g, '_').toLowerCase()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (dlErr) {
          console.warn('[FATGS] Local download note:', dlErr);
        }

        // 4. Report success
        if (onShowToast) {
          onShowToast('✓ Timetable successfully imported and activated in TT_TRACKER! Opening TT_TRACKER...');
        }

        // 5. Open/redirect to TT_TRACKER only AFTER successful handoff
        const redirectTarget = data.redirectUrl || 'http://localhost:3000/timetable';
        setTimeout(() => {
          window.location.href = redirectTarget;
        }, 1200);
      } else {
        // Report exact failure reason from TT_TRACKER (never redirect on failure)
        if (onShowToast) {
          onShowToast(data.error || 'TT_TRACKER import failed: Timetable was rejected.');
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
            <button
              type="button"
              className="btn-studio btn-export"
              disabled={!isExportAllowed}
              onClick={handleExportJson}
              title={
                isExportAllowed
                  ? `Export JSON for ${targetSemester} Semester`
                  : `Export JSON is disabled: All required sections for ${targetSemester} Semester must generate base timetables first.`
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export JSON {isExportAllowed ? `(${backendStatus?.totalRequired || 0} Sections)` : ''}
            </button>
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

          {/* Shared 4 Theory Rooms Selector Panel (Task 2 Redesign) */}
          <div className="shared-rooms-panel" aria-label="Configured Shared Theory Rooms">
            <div className="shared-rooms-header">
              <div className="shared-rooms-header-top">
                <span className="shared-rooms-title">Shared Theory Rooms</span>
                <span className="shared-rooms-cohort-tag">CS2 &bull; CD2 &bull; CS3 &bull; CD3 &bull; CS4 &bull; CD4</span>
              </div>
              <p className="shared-rooms-desc">
                Four classrooms are shared by these undergraduate sections.
              </p>
            </div>

            <div className="shared-rooms-grid">
              {[0, 1, 2, 3].map(slotIdx => {
                const roomNum = slotIdx + 1;
                const selectId = `sharedTheoryRoomSelect${roomNum}`;
                return (
                  <div key={slotIdx} className="shared-room-slot-card">
                    <label htmlFor={selectId} className="shared-room-slot-header">
                      ROOM {roomNum}
                    </label>
                    <div className="shared-room-input-container">
                      <select
                        id={selectId}
                        className="shared-room-dropdown"
                        value={selectedRooms[slotIdx]}
                        onChange={(e) => handleRoomSlotChange(slotIdx, e.target.value)}
                        aria-label={`Shared Theory Room ${roomNum}`}
                      >
                        {CANDIDATE_THEORY_ROOMS.map(r => (
                          <option
                            key={r}
                            value={r}
                            disabled={selectedRooms.includes(r) && selectedRooms[slotIdx] !== r}
                          >
                            {r}
                          </option>
                        ))}
                      </select>
                      <span className="shared-room-dropdown-icon" aria-hidden="true">▼</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shared-rooms-meta-row">
              <span className="shared-rooms-count-indicator">
                <span className="shared-rooms-indicator-dot"></span>
                4 rooms configured
              </span>
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
              onChange={(e) => {
                const newSem = e.target.value;
                setTargetSemester(newSem);
                setBackendStatus(null);
                fetchBackendStatus(newSem);
              }}
            >
              <option value="Odd">Odd Semester (1st, 3rd, 5th, 7th, 9th Sem)</option>
              <option value="Even">Even Semester (4th, 6th, 8th Sem)</option>
            </select>
          </div>
        </div>

        {/* Status Grid of participating sections */}
        <div className="handoff-grid">
          {displayedSections.map(s => {
            const isGenerated = Boolean(s.generated);
            const semDisplay = s.semester ? s.semester.replace(' Semester', '') : '';
            const secIdentifier = s.name || s.section;
            let displaySecName = secIdentifier;
            if (secIdentifier === 'MT1') displaySecName = 'MT1 (M.Tech CSE)';
            else if (secIdentifier === 'MA1') displaySecName = 'MA1 (M.Tech AI)';
            else if (secIdentifier === 'CD5') displaySecName = 'CD5 (Dual Degree)';

            return (
              <div
                key={s.secKey || `${secIdentifier}_${s.year}_${s.semester}`}
                className={`handoff-item ${isGenerated ? 'item-generated' : 'item-missing'}`}
              >
                <div className="handoff-sec-header">
                  <span className="handoff-sec-name">{displaySecName}</span>
                  <span className="handoff-sec-sem">{semDisplay} Semester</span>
                </div>
                <span className={`handoff-status-tag ${isGenerated ? 'status-generated' : 'status-missing'}`}>
                  {isGenerated ? '✓ Base Timetable Generated' : '× Base Timetable Not Generated'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="handoff-footer">
          <div className={`handoff-summary ${isExportAllowed ? 'summary-ready' : 'summary-incomplete'}`}>
            {isExportAllowed ? (
              <span>✓ All required sections generated ({backendStatus?.totalGenerated || 0}/{backendStatus?.totalRequired || 0} sections ready for Export JSON &amp; TT_TRACKER handoff).</span>
            ) : (
              <span>
                Generation Incomplete: {backendStatus?.totalGenerated || 0}/{backendStatus?.totalRequired || 0} sections generated.
                {missingSections.length > 0 && (
                  <span>
                    {' '}Missing:{' '}
                    {missingSections.map(s => {
                      const id = s.name || s.section;
                      if (id === 'MT1') return 'MT1 (M.Tech CSE)';
                      if (id === 'MA1') return 'MA1 (M.Tech AI)';
                      if (id === 'CD5') return 'CD5 (Dual Degree)';
                      return id;
                    }).join(', ')}
                  </span>
                )}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-studio btn-export"
              disabled={!isExportAllowed || isHandoffLoading}
              onClick={handleExportJson}
              title={
                isExportAllowed
                  ? `Export JSON for ${targetSemester} Semester and handoff to TT_TRACKER`
                  : `Export JSON is disabled: All required sections for ${targetSemester} Semester must generate base timetables first.`
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export JSON {isExportAllowed ? `(${backendStatus?.totalRequired || 0} Sections)` : ''}
            </button>
          </div>
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
        onConfirm={handleConfirmExportAndHandoff}
        onCancel={() => {
          if (!isHandoffLoading) setIsConfirmModalOpen(false);
        }}
      />
    </main>
  );
}
