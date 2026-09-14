/**
 * FATGS Backend Server & TT_TRACKER Handoff Service
 * Department of Computer Science & Engineering, NIT Hamirpur
 *
 * Provides API endpoints for:
 *  - Health status
 *  - TT_TRACKER configuration status
 *  - Authenticated server-to-server timetable handoff to TT_TRACKER
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple .env parser to avoid third-party dependencies
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
}

// Load environment on require
loadEnv();

const STATE_FILE_PATH = path.join(__dirname, 'output/generation_state.json');
const SESSIONS_DIR = path.join(__dirname, 'output/sessions');
const SESSIONS = new Map();
let activeSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const INTERVALS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:00' },
  { start: '13:00', end: '14:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' }
];

/**
 * Initializes a new generation session.
 */
function initSession(customSessionId = null) {
  const sId = customSessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const session = {
    sessionId: sId,
    createdAt: new Date().toISOString(),
    academicYear: '2025-2026',
    records: {}
  };
  SESSIONS.set(sId, session);
  activeSessionId = sId;
  return session;
}

function getActiveSessionId() {
  return activeSessionId;
}

// Ensure startup starts with a clean ephemeral session (master data is never touched)
initSession(activeSessionId);

/**
 * Normalizes semester representation to canonical machine value: 'Odd' or 'Even'.
 * Protects TT_TRACKER contract where semesterType must strictly be 'Odd' or 'Even'.
 */
function normalizeSemesterType(raw) {
  if (!raw || typeof raw !== 'string') return 'Odd';
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'even' || cleaned === 'even semester') {
    return 'Even';
  }
  if (cleaned === 'odd' || cleaned === 'odd semester') {
    return 'Odd';
  }
  return raw;
}

/**
 * Returns subjects array from subjects.json or custom path.
 */
function getSubjectsData(customPath) {
  const filePath = customPath || path.join(__dirname, 'data/subjects.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[FATGS] Failed to read subjects data:', err.message);
    return [];
  }
}

/**
 * Returns rooms array from rooms.json or custom path.
 */
function getRoomsData(customPath) {
  const filePath = customPath || path.join(__dirname, 'data/rooms.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[FATGS] Failed to read rooms data:', err.message);
    return [];
  }
}

/**
 * Returns faculty array from faculty.json or custom path.
 */
function getFacultyData(customPath) {
  const filePath = customPath || path.join(__dirname, 'data/faculty.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[FATGS] Failed to read faculty data:', err.message);
    return [];
  }
}

/**
 * Resolves required academic sections (B.Tech, Dual Degree, and M.Tech) for a given semester cycle.
 * Dynamically evaluates whether each section actually has classes scheduled.
 */
function getRequiredSections(semesterTerm = 'Odd', subjectsData = null) {
  const norm = normalizeSemesterType(semesterTerm);
  const subjects = subjectsData || getSubjectsData();
  const filtered = subjects.filter(sec => {
    if (norm === 'Odd') {
      const isOdd = sec.semester.includes('1st') || sec.semester.includes('3rd') ||
                    sec.semester.includes('5th') || sec.semester.includes('7th') ||
                    sec.semester.includes('9th');
      if (!isOdd) return false;
    } else if (norm === 'Even') {
      const isEven = sec.semester.includes('2nd') || sec.semester.includes('4th') ||
                     sec.semester.includes('6th') || sec.semester.includes('8th') ||
                     sec.semester.includes('10th');
      if (!isEven) return false;
    } else {
      if (sec.semester !== semesterTerm) return false;
    }
    return true;
  });

  const seenKeys = new Set();
  const result = [];
  for (const sec of filtered) {
    const secKey = `${sec.name}_${sec.year}_${sec.semester}`;
    if (seenKeys.has(secKey)) continue;
    seenKeys.add(secKey);
    const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
    const hasClasses = totalClasses > 0;
    result.push({
      name: sec.name,
      year: sec.year,
      semester: sec.semester,
      secKey,
      hasClasses,
      totalClasses
    });
  }
  return result;
}

/**
 * Converts HH:MM string to total minutes since midnight.
 */
function timeToMinutes(tStr) {
  if (!tStr || typeof tStr !== 'string') return 0;
  const [h, m] = tStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Checks whether two time intervals overlap.
 */
function intervalsOverlap(s1, e1, s2, e2) {
  return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Authoritative Global Conflict Validation Engine for FATGS.
 * Validates cross-section faculty conflicts, room conflicts, section overlaps,
 * lab group rules, and dedicated lab room usage.
 */
function validateGlobalTimetable(slots, semesterType = 'Odd') {
  if (!Array.isArray(slots) || slots.length === 0) {
    return { valid: true, conflicts: [] };
  }

  const conflicts = [];
  const DEDICATED_LAB_ROOMS = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);

  const normSlots = slots.map((s, idx) => ({
    idx,
    section: s.section || '',
    year: s.year || '',
    semester: s.semester || '',
    subjectCode: s.subjectCode || s.code || '',
    faculty: s.facultyCode || s.faculty || null,
    room: s.room || null,
    day: s.day || '',
    start: s.start || '',
    end: s.end || '',
    startMin: timeToMinutes(s.start),
    endMin: timeToMinutes(s.end),
    isLab: Boolean(s.isLab),
    group: s.group || null,
    sessionId: s.sessionId || null,
    electiveType: s.electiveType || null
  }));

  // 1. Dedicated lab room check
  for (const s of normSlots) {
    if (!s.isLab && s.room && DEDICATED_LAB_ROOMS.has(s.room)) {
      conflicts.push({
        type: 'ROOM_TYPE_VIOLATION',
        resource: s.room,
        day: s.day,
        time: `${s.start}–${s.end}`,
        section1: s.section,
        section2: null,
        subject1: s.subjectCode,
        subject2: null,
        message: `Invalid room assignment: Theory subject ${s.subjectCode} (${s.section}) is scheduled in dedicated lab room ${s.room} on ${s.day} ${s.start}–${s.end}.`
      });
    }
  }

  // 2. Pairwise collision checks across slots on the same day with overlapping times
  for (let i = 0; i < normSlots.length; i++) {
    const s1 = normSlots[i];
    if (!s1.day || s1.startMin >= s1.endMin) continue;

    for (let j = i + 1; j < normSlots.length; j++) {
      const s2 = normSlots[j];
      if (s1.day !== s2.day) continue;
      if (!intervalsOverlap(s1.startMin, s1.endMin, s2.startMin, s2.endMin)) continue;

      const isSharedCohortSession = Boolean(
        s1.sessionId &&
        s2.sessionId &&
        s1.sessionId === s2.sessionId &&
        s1.subjectCode === s2.subjectCode &&
        s1.faculty === s2.faculty &&
        s1.room === s2.room
      );

      // A. Faculty Collision: faculty cannot be scheduled concurrently for different/incompatible sessions
      if (s1.faculty && s2.faculty && s1.faculty === s2.faculty) {
        if (!isSharedCohortSession) {
          const overlapStart = Math.max(s1.startMin, s2.startMin) === s1.startMin ? s1.start : s2.start;
          const overlapEnd = Math.min(s1.endMin, s2.endMin) === s1.endMin ? s1.end : s2.end;
          conflicts.push({
            type: 'FACULTY_CONFLICT',
            resource: s1.faculty,
            day: s1.day,
            time: `${overlapStart}–${overlapEnd}`,
            section1: s1.section,
            section2: s2.section,
            subject1: s1.subjectCode,
            subject2: s2.subjectCode,
            message: `Faculty conflict: Faculty ${s1.faculty} is scheduled concurrently for ${s1.section} (${s1.subjectCode}) and ${s2.section} (${s2.subjectCode}) on ${s1.day} ${overlapStart}–${overlapEnd}.`
          });
        }
      }

      // B. Room Collision: room cannot be booked concurrently for different/incompatible sessions
      if (s1.room && s2.room && s1.room === s2.room) {
        if (!isSharedCohortSession) {
          const overlapStart = Math.max(s1.startMin, s2.startMin) === s1.startMin ? s1.start : s2.start;
          const overlapEnd = Math.min(s1.endMin, s2.endMin) === s1.endMin ? s1.end : s2.end;
          conflicts.push({
            type: 'ROOM_CONFLICT',
            resource: s1.room,
            day: s1.day,
            time: `${overlapStart}–${overlapEnd}`,
            section1: s1.section,
            section2: s2.section,
            subject1: s1.subjectCode,
            subject2: s2.subjectCode,
            message: `Room conflict in import package: Room ${s1.room} is booked concurrently for: ${s1.section} (${s1.subjectCode}) and ${s2.section} (${s2.subjectCode}) on ${s1.day} ${overlapStart}–${overlapEnd}.`
          });
        }
      }

      // C. Section Overlap Collision
      if (s1.section && s2.section && s1.section === s2.section) {
        // 1. Simultaneous lab groups (e.g. G1 in P1 and G2 in P2)
        const isSimLab = s1.isLab && s2.isLab && s1.group && s2.group && s1.group !== s2.group && s1.room !== s2.room;
        // 2. Synchronized parallel elective basket options (different rooms for parallel choices)
        const isParallelElective = (s1.electiveType || s1.basket) && (s2.electiveType || s2.basket) && s1.room !== s2.room;

        if (!isSimLab && !isParallelElective) {
          conflicts.push({
            type: 'SECTION_OVERLAP',
            resource: s1.section,
            day: s1.day,
            time: `${s1.start}–${s1.end}`,
            section1: s1.section,
            section2: s2.section,
            subject1: s1.subjectCode,
            subject2: s2.subjectCode,
            message: `Section conflict: Section ${s1.section} has overlapping classes (${s1.subjectCode} vs ${s2.subjectCode}) on ${s1.day} ${s1.start}–${s1.end}.`
          });
        }
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

/**
 * Extracts compact booking keys for frontend occupancy synchronization.
 */
function getOccupiedBookings(slots) {
  if (!Array.isArray(slots)) return { facBookings: [], roomBookings: [] };
  const facBookings = [];
  const roomBookings = [];
  for (const s of slots) {
    const dayIdx = DAYS.indexOf(s.day);
    if (dayIdx === -1) continue;
    const sMin = timeToMinutes(s.start);
    const eMin = timeToMinutes(s.end);
    INTERVALS.forEach((interval, pIdx) => {
      const pStart = timeToMinutes(interval.start);
      const pEnd = timeToMinutes(interval.end);
      if (intervalsOverlap(sMin, eMin, pStart, pEnd)) {
        if (s.facultyCode || s.faculty) {
          facBookings.push(`${s.facultyCode || s.faculty}_${dayIdx}_${pIdx}`);
        }
        if (s.room) {
          roomBookings.push(`${s.room}_${dayIdx}_${pIdx}`);
        }
      }
    });
  }
  return {
    facBookings: [...new Set(facBookings)],
    roomBookings: [...new Set(roomBookings)]
  };
}

/**
 * Loads persistent generation state from disk or in-memory session.
 */
function loadGenerationState(customStatePath, sessionId = null) {
  if (customStatePath) {
    if (!fs.existsSync(customStatePath)) {
      return { academicYear: '2025-2026', records: {} };
    }
    try {
      const raw = fs.readFileSync(customStatePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed.records || typeof parsed.records !== 'object') parsed.records = {};
      return parsed;
    } catch (err) {
      return { academicYear: '2025-2026', records: {} };
    }
  }

  const sId = sessionId || activeSessionId;
  if (!SESSIONS.has(sId)) {
    // Check if session file exists on disk
    const sFile = path.join(SESSIONS_DIR, `${sId}.json`);
    if (fs.existsSync(sFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(sFile, 'utf8'));
        if (!parsed.records || typeof parsed.records !== 'object') parsed.records = {};
        SESSIONS.set(sId, parsed);
        return parsed;
      } catch (e) {
        // Fallback to fresh session
      }
    }
    const newSess = { sessionId: sId, createdAt: new Date().toISOString(), academicYear: '2025-2026', records: {} };
    SESSIONS.set(sId, newSess);
    return newSess;
  }
  return SESSIONS.get(sId);
}

function safeWriteFileSync(targetPath, data) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${targetPath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  fs.writeFileSync(tempPath, data, 'utf8');
  try {
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (_) {}
    }
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    try {
      fs.writeFileSync(targetPath, data, 'utf8');
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    } catch (writeErr) {
      console.error(`[FATGS] Failed to write file ${targetPath}:`, writeErr.message);
    }
  }
}

/**
 * Saves generation state to disk atomically or into session.
 */
function saveGenerationState(state, customStatePath, sessionId = null) {
  const serialized = JSON.stringify(state, null, 2);
  if (customStatePath) {
    safeWriteFileSync(customStatePath, serialized);
    return;
  }

  const sId = sessionId || state.sessionId || activeSessionId;
  state.sessionId = sId;
  SESSIONS.set(sId, state);

  try {
    const sFile = path.join(SESSIONS_DIR, `${sId}.json`);
    safeWriteFileSync(sFile, serialized);
  } catch (err) {
    console.error('[FATGS] Failed to write session state to disk:', err.message);
  }
}

/**
 * Answers whether each required section has successfully generated its base timetable
 * and verifies global conflict-free validity across the complete package.
 */
function getGenerationStatus(semesterTerm = 'Odd', customOptions = {}) {
  const canonical = normalizeSemesterType(semesterTerm);
  const state = loadGenerationState(customOptions.statePath, customOptions.sessionId);
  const requiredList = getRequiredSections(canonical, customOptions.subjectsData);

  const sectionsWithStatus = requiredList.map(sec => {
    const record = state.records && state.records[sec.secKey];
    const generated = Boolean(
      record &&
      record.generated === true &&
      Array.isArray(record.slots) &&
      record.slots.length > 0
    );

    return {
      section: sec.name,
      name: sec.name,
      year: sec.year,
      semester: sec.semester,
      secKey: sec.secKey,
      hasClasses: sec.hasClasses,
      required: sec.hasClasses, // Empty sections do not block completion
      generated,
      generatedAt: record?.generatedAt || null,
      generationId: record?.generationId || null,
      slotCount: record?.slotCount || (record?.slots?.length || 0)
    };
  });

  const activeRequired = sectionsWithStatus.filter(s => s.hasClasses);
  const totalRequired = activeRequired.length;
  const totalGenerated = activeRequired.filter(s => s.generated).length;
  const allRequiredGenerated = totalRequired > 0 && totalGenerated === totalRequired;

  // Gather all generated slots across active sections
  const allSlots = [];
  for (const sec of activeRequired) {
    const rec = state.records && state.records[sec.secKey];
    if (rec && rec.generated && Array.isArray(rec.slots)) {
      allSlots.push(...rec.slots);
    }
  }

  // Global validation check across complete set of currently generated slots
  const validation = validateGlobalTimetable(allSlots, canonical);
  const occupiedBookings = getOccupiedBookings(allSlots);
  const isGloballyValid = validation.valid;
  const exportAllowed = allRequiredGenerated && isGloballyValid;

  return {
    success: true,
    sessionId: state.sessionId || customOptions.sessionId || activeSessionId,
    semester: canonical,
    semesterType: canonical,
    academicYear: state.academicYear || '2025-2026',
    sections: sectionsWithStatus,
    totalRequired,
    totalGenerated,
    allRequiredGenerated,
    isGloballyValid,
    conflicts: validation.conflicts,
    occupiedBookings,
    exportAllowed
  };
}

/**
 * Persists a successful base timetable generation record for a section,
 * strictly validating against cross-section conflicts with already generated sections.
 */
function recordSectionGeneration(payload, customOptions = {}) {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload must be an object.' };
  }

  const { section, year, semester, generationId, slots } = payload;
  if (!section || typeof section !== 'string') {
    return { success: false, error: 'Missing or invalid "section" identifier.' };
  }
  if (!year || typeof year !== 'string') {
    return { success: false, error: 'Missing or invalid "year" identifier.' };
  }
  if (!semester || typeof semester !== 'string') {
    return { success: false, error: 'Missing or invalid "semester" identifier.' };
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return { success: false, error: `Slots array for section ${section} must contain at least one scheduled slot.` };
  }

  // Verify basic slot structure
  for (let i = 0; i < Math.min(slots.length, 5); i++) {
    const s = slots[i];
    if (!s || !s.day || !s.start || !s.end || !s.subjectCode) {
      return { success: false, error: `Slot at index ${i} is missing required fields (day, start, end, subjectCode).` };
    }
  }

  const state = loadGenerationState(customOptions.statePath, customOptions.sessionId || payload.sessionId);
  if (!state.records) state.records = {};

  const academicYr = payload.academicYear || state.academicYear || '2025-2026';
  state.academicYear = academicYr;

  const secKey = `${section}_${year}_${semester}`;
  const genId = generationId || `gen_${secKey}_${Date.now()}`;

  const secCanonicalSem = normalizeSemesterType(semester);

  // Cross-section conflict validation against already-generated sections in the same semester cycle
  const otherSlots = [];
  for (const k of Object.keys(state.records)) {
    if (k !== secKey && state.records[k].generated && Array.isArray(state.records[k].slots)) {
      const recSem = normalizeSemesterType(state.records[k].semester);
      if (recSem === secCanonicalSem) {
        otherSlots.push(...state.records[k].slots);
      }
    }
  }

  const combinedSlots = [...otherSlots, ...slots];
  const validation = validateGlobalTimetable(combinedSlots, secCanonicalSem);
  const secConflicts = validation.conflicts.filter(c => c.section1 === section || c.section2 === section);

  if (secConflicts.length > 0) {
    return {
      success: false,
      statusCode: 400,
      error: `Cannot record section generation for ${section}: Timetable conflict detected (${secConflicts[0].message}).`,
      conflicts: secConflicts
    };
  }

  state.records[secKey] = {
    section,
    year,
    semester,
    academicYear: academicYr,
    secKey,
    generationId: genId,
    generated: true,
    generatedAt: new Date().toISOString(),
    slotCount: slots.length,
    slots
  };

  saveGenerationState(state, customOptions.statePath, customOptions.sessionId || payload.sessionId);

  return {
    success: true,
    message: `Base timetable generation successfully recorded for ${section} (${semester}).`,
    generationId: genId,
    slotCount: slots.length
  };
}

/**
 * Resets/clears generation records (for a specific section, semester, or all).
 */
function resetGeneration(filter = {}, customOptions = {}) {
  const state = loadGenerationState(customOptions.statePath, customOptions.sessionId || filter.sessionId);
  if (!state.records) state.records = {};

  if (filter.section && filter.year && filter.semester) {
    const key = `${filter.section}_${filter.year}_${filter.semester}`;
    delete state.records[key];
  } else if (filter.section) {
    Object.keys(state.records).forEach(k => {
      if (state.records[k].section === filter.section) {
        delete state.records[k];
      }
    });
  } else if (filter.semester) {
    const canonical = normalizeSemesterType(filter.semester);
    const req = getRequiredSections(canonical, customOptions.subjectsData);
    const keysToDelete = new Set(req.map(r => r.secKey));
    Object.keys(state.records).forEach(k => {
      if (keysToDelete.has(k)) {
        delete state.records[k];
      }
    });
  } else {
    state.records = {};
  }

  saveGenerationState(state, customOptions.statePath, customOptions.sessionId || filter.sessionId);
  return { success: true, message: 'Generation state reset successfully.' };
}

/**
 * Generates all required sections simultaneously with global conflict avoidance
 * and atomically records them into the active generation session.
 */
function generateAllRequiredSections(semesterTerm = 'Odd', customOptions = {}) {
  const canonical = normalizeSemesterType(semesterTerm);
  const subjectsPath = customOptions.subjectsPath || path.join(__dirname, 'data/subjects.json');
  const roomsPath = customOptions.roomsPath || path.join(__dirname, 'data/rooms.json');
  const selectedRooms = customOptions.selectedTheoryRooms || ['B4', 'F4', 'G5', 'S2'];

  const { generateBaseTimetable, toFlatSlotList } = require('./entities/baseTimetableGenerator');

  const filterFn = s => {
    if (canonical === 'Odd') {
      return s.semester.includes('1st') || s.semester.includes('3rd') ||
             s.semester.includes('5th') || s.semester.includes('7th') ||
             s.semester.includes('9th');
    } else {
      return s.semester.includes('2nd') || s.semester.includes('4th') ||
             s.semester.includes('6th') || s.semester.includes('8th') ||
             s.semester.includes('10th');
    }
  };

  const sections = generateBaseTimetable(
    subjectsPath,
    roomsPath,
    filterFn,
    {
      includeMTech: true,
      usePlaceholderFaculty: true,
      selectedTheoryRooms: selectedRooms
    }
  );

  const flatSlots = toFlatSlotList(sections);
  const validation = validateGlobalTimetable(flatSlots, canonical);

  // Group slots by section and record in state
  const state = loadGenerationState(customOptions.statePath, customOptions.sessionId);
  if (!state.records) state.records = {};

  const slotsBySec = {};
  for (const slot of flatSlots) {
    const secKey = `${slot.section}_${slot.year}_${slot.semester}`;
    if (!slotsBySec[secKey]) slotsBySec[secKey] = [];
    slotsBySec[secKey].push(slot);
  }

  const reqList = getRequiredSections(canonical, customOptions.subjectsData);
  let recordedCount = 0;
  for (const req of reqList) {
    if (!req.hasClasses) continue;
    const secSlots = slotsBySec[req.secKey] || [];
    if (secSlots.length > 0) {
      state.records[req.secKey] = {
        section: req.name,
        year: req.year,
        semester: req.semester,
        academicYear: state.academicYear || '2025-2026',
        secKey: req.secKey,
        generationId: `gen_${req.secKey}_${Date.now()}`,
        generated: true,
        generatedAt: new Date().toISOString(),
        slotCount: secSlots.length,
        slots: secSlots
      };
      recordedCount++;
    }
  }

  saveGenerationState(state, customOptions.statePath, customOptions.sessionId);

  return {
    success: true,
    message: `Generated and recorded ${recordedCount} sections for ${canonical} Semester.`,
    totalGenerated: recordedCount,
    totalSlots: flatSlots.length,
    isGloballyValid: validation.valid,
    conflicts: validation.conflicts
  };
}

/**
 * Gathers existing generated slots across all required sections without regenerating.
 * Strictly verifies that all required sections are generated AND that the combined
 * package passes global conflict validation before allowing export.
 */
function exportTimetable(semesterTerm = 'Odd', customOptions = {}) {
  const canonical = normalizeSemesterType(semesterTerm);
  const status = getGenerationStatus(canonical, customOptions);

  if (!status.allRequiredGenerated) {
    const missing = status.sections
      .filter(s => s.hasClasses && !s.generated)
      .map(s => `${s.name} (${s.semester})`);
    return {
      success: false,
      statusCode: 400,
      error: `Cannot export timetable: Base timetable generation is incomplete for ${canonical} Semester. All required sections must be successfully generated before export. Missing: ${missing.join(', ')}.`,
      missingSections: missing
    };
  }

  if (!status.isGloballyValid) {
    return {
      success: false,
      statusCode: 400,
      error: `Cannot export timetable: Generated timetable contains ${status.conflicts.length} global conflict(s). All conflicts must be resolved before export. First conflict: ${status.conflicts[0].message}`,
      conflicts: status.conflicts
    };
  }

  const state = loadGenerationState(customOptions.statePath, customOptions.sessionId);
  const allSlots = [];
  const activeSections = status.sections.filter(s => s.hasClasses);

  for (const s of activeSections) {
    const rec = state.records && state.records[s.secKey];
    if (rec && Array.isArray(rec.slots)) {
      allSlots.push(...rec.slots);
    }
  }

  const pkgId = `pkg_${canonical.toLowerCase()}_${Date.now()}`;

  // Load master academic collections
  const rawRooms = getRoomsData(customOptions.roomsPath);
  const rawFaculty = getFacultyData(customOptions.facultyPath);
  const rawSubjects = getSubjectsData(customOptions.subjectsPath);

  const formattedRooms = rawRooms.map(r => ({
    roomNo: r.roomNo,
    labOrClass: r.labOrClass || (r.isLab ? 'Lab' : 'Class'),
    building: r.building || 'Department of CSE',
    isLab: Boolean(r.isLab || r.labOrClass === 'Lab')
  }));

  const formattedFaculties = rawFaculty.map(f => ({
    facultyId: f.code || f.facultyCode,
    name: f.name || f.facultyFullName
  }));

  const subjectsMap = new Map();
  if (Array.isArray(rawSubjects)) {
    for (const sec of rawSubjects) {
      const subList = [...(sec.subjects || []), ...(sec.labs || []), ...(sec.electives || [])];
      for (const sub of subList) {
        if (sub && sub.code && !subjectsMap.has(sub.code)) {
          subjectsMap.set(sub.code, {
            subjectCode: sub.code,
            name: sub.name || sub.code,
            credits: sub.credits || 3,
            type: sub.type || 'Theory'
          });
        }
      }
    }
  }

  // Ensure any subject referenced in slots (such as SA-201) is included in package subjects master data
  for (const slot of allSlots) {
    const code = slot.subjectCode || slot.code;
    if (code && !subjectsMap.has(code)) {
      subjectsMap.set(code, {
        subjectCode: code,
        name: code === 'SA-201' ? 'Student Activities' : (slot.subjectName || code),
        credits: slot.credits !== undefined ? slot.credits : 0,
        type: slot.isLab ? 'Lab' : (code === 'SA-201' ? 'Activity' : 'Theory')
      });
    }
  }

  const formattedSections = activeSections.map(s => {
    let mappedSec = s.name;
    let mappedSecId = `${s.name}_${s.year}_${s.semester}`;
    if (s.name === 'MT1') {
      mappedSec = 'MTECH-CSE';
      mappedSecId = 'Y1_S1_MTECH-CSE';
    } else if (s.name === 'MA1') {
      mappedSec = 'MTECH-AI';
      mappedSecId = 'Y1_S1_MTECH-AI';
    }
    return {
      section: mappedSec,
      originalSection: s.name,
      year: s.year,
      semester: s.semester,
      sectionId: mappedSecId
    };
  });

  return {
    success: true,
    statusCode: 200,
    data: {
      packageId: pkgId,
      source: 'FATGS',
      semester: canonical,
      semesterType: canonical,
      academicYear: status.academicYear,
      exportedAt: new Date().toISOString(),
      rooms: formattedRooms,
      faculties: formattedFaculties,
      subjects: Array.from(subjectsMap.values()),
      sections: formattedSections,
      totalSlots: allSlots.length,
      slots: allSlots,
      timetable: allSlots
    }
  };
}


/**
 * Validates the complete semester timetable package structure.
 */
function validateSemesterPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, error: 'Timetable package must be an object.' };
  }

  const semVal = pkg.semesterType || pkg.semester;
  if (!semVal || typeof semVal !== 'string') {
    return { valid: false, error: 'Package must specify a valid semester or semesterType name.' };
  }

  const canonical = normalizeSemesterType(semVal);
  if (canonical !== 'Odd' && canonical !== 'Even') {
    return { valid: false, error: `Invalid semesterType "${semVal}": Must be "Odd" or "Even".` };
  }

  if (!pkg.academicYear || typeof pkg.academicYear !== 'string') {
    return { valid: false, error: 'Package must specify an academicYear (e.g. 2025-2026).' };
  }

  if (pkg.sections !== undefined && (!Array.isArray(pkg.sections) || pkg.sections.length === 0)) {
    return { valid: false, error: 'Package must specify a non-empty array of participating sections.' };
  }

  const slotsList = Array.isArray(pkg.slots) ? pkg.slots : pkg.timetable;
  if (!Array.isArray(slotsList) || slotsList.length === 0) {
    return { valid: false, error: 'Package timetable must contain at least one scheduled slot.' };
  }

  // Check slot records
  for (let i = 0; i < slotsList.length; i++) {
    const slot = slotsList[i];
    if (!slot || typeof slot !== 'object') {
      return { valid: false, error: `Invalid slot record at index ${i}.` };
    }
    if (!slot.section || !slot.day || !slot.start || !slot.end || !slot.subjectCode) {
      return {
        valid: false,
        error: `Slot record at index ${i} missing required fields (section, day, start, end, subjectCode).`
      };
    }
  }

  return { valid: true };
}

/**
 * Normalizes/maps timetable slots for TT_TRACKER handoff.
 * Preserves original FATGS identifiers (MT1, MA1, etc.) while providing
 * TT_TRACKER-compatible section and sectionId fields without ambiguity.
 */
function mapSlotForTTTracker(slot) {
  if (!slot || typeof slot !== 'object') return slot;
  const mapped = { ...slot };

  // Explicit, centralized M.Tech section mapping
  if (slot.section === 'MT1') {
    mapped.section = 'MTECH-CSE';
    mapped.sectionId = 'Y1_S1_MTECH-CSE';
    mapped.year = '1st Year';
    mapped.semester = '1st Semester';
    mapped.originalSection = 'MT1';
  } else if (slot.section === 'MA1') {
    mapped.section = 'MTECH-AI';
    mapped.sectionId = 'Y1_S1_MTECH-AI';
    mapped.year = '1st Year';
    mapped.semester = '1st Semester';
    mapped.originalSection = 'MA1';
  }

  // Handle reserved empty / activity slots (like SA-201) where faculty or room is not assigned
  if (mapped.subjectCode === 'SA-201' || mapped.isReservedEmpty) {
    if (!mapped.faculty && !mapped.facultyCode) {
      const coordId = mapped.section === 'CD2' ? 'COORD_CD2' : 'COORD_CS2';
      mapped.faculty = coordId;
      mapped.facultyCode = coordId;
    }
    if (!mapped.room) {
      mapped.room = mapped.section === 'CD2' ? 'Seminar Hall' : 'Conference Hall';
    }
  }

  return mapped;
}

/**
 * Transforms an export package into TT_TRACKER's expected envelope:
 * {
 *   packageId: string,
 *   academicYear: string,
 *   semesterType: string, // Strictly 'Odd' or 'Even'
 *   slots: Array<Object>
 * }
 */
function prepareTTTrackerPayload(pkg) {
  const rawSlots = Array.isArray(pkg.slots) ? pkg.slots : (Array.isArray(pkg.timetable) ? pkg.timetable : []);
  const mappedSlots = rawSlots.map(mapSlotForTTTracker);

  const rawSem = pkg.semesterType || pkg.semester || 'Odd';
  const canonicalSemesterType = normalizeSemesterType(rawSem);

  // Extract or load master collections
  const rawRooms = Array.isArray(pkg.rooms) ? pkg.rooms : getRoomsData();
  const rawFaculty = Array.isArray(pkg.faculties) ? pkg.faculties : getFacultyData();
  const rawSubjects = Array.isArray(pkg.subjects) ? pkg.subjects : getSubjectsData();

  const formattedRooms = rawRooms.map(r => ({
    roomNo: r.roomNo,
    labOrClass: r.labOrClass || (r.isLab ? 'Lab' : 'Class'),
    building: r.building || 'Department of CSE',
    isLab: Boolean(r.isLab || r.labOrClass === 'Lab')
  }));

  const formattedFaculties = rawFaculty.map(f => ({
    facultyId: f.facultyId || f.code || f.facultyCode,
    name: f.name || f.facultyFullName
  }));

  for (const s of mappedSlots) {
    const fId = s.faculty || s.facultyCode;
    if (fId && fId.startsWith('COORD') && !formattedFaculties.some(f => f.facultyId === fId)) {
      formattedFaculties.push({ facultyId: fId, name: `${fId} Coordinator` });
    }
  }

  const subjectsMap = new Map();
  if (Array.isArray(rawSubjects)) {
    for (const item of rawSubjects) {
      if (item && item.subjectCode) {
        subjectsMap.set(item.subjectCode, item);
      } else if (item && item.code) {
        subjectsMap.set(item.code, {
          subjectCode: item.code,
          name: item.name || item.code
        });
      } else if (item && typeof item === 'object') {
        const subList = [...(item.subjects || []), ...(item.labs || []), ...(item.electives || [])];
        for (const sub of subList) {
          if (sub && sub.code && !subjectsMap.has(sub.code)) {
            subjectsMap.set(sub.code, {
              subjectCode: sub.code,
              name: sub.name || sub.code
            });
          }
        }
      }
    }
  }

  for (const s of mappedSlots) {
    const code = s.subjectCode || s.code;
    if (code && !subjectsMap.has(code)) {
      subjectsMap.set(code, {
        subjectCode: code,
        name: code === 'SA-201' ? 'Student Activities' : code
      });
    }
  }

  return {
    packageId: pkg.packageId || `pkg_${Date.now()}`,
    academicYear: pkg.academicYear || '2025-2026',
    semesterType: canonicalSemesterType,
    rooms: formattedRooms,
    faculties: formattedFaculties,
    subjects: Array.from(subjectsMap.values()),
    sections: Array.isArray(pkg.sections) ? pkg.sections : [],
    slots: mappedSlots
  };
}

/**
 * Performs authenticated HTTP POST to TT_TRACKER backend.
 */
async function handoffToTTTracker(pkg, options = {}) {
  const ttTrackerUrl = (options.url || process.env.TT_TRACKER_URL || '').trim();
  const secret = (options.secret || process.env.TT_TRACKER_IMPORT_SECRET || '').trim();

  if (!ttTrackerUrl) {
    return {
      success: false,
      statusCode: 500,
      error: 'TT_TRACKER_URL is not configured in FATGS backend environment.'
    };
  }

  if (!secret) {
    return {
      success: false,
      statusCode: 500,
      error: 'TT_TRACKER_IMPORT_SECRET is not configured in FATGS backend environment.'
    };
  }

  const endpointPath = options.endpoint || process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import';
  const targetUrl = new URL(endpointPath, ttTrackerUrl).toString();

  const payload = prepareTTTrackerPayload(pkg);

  // Structured logging (NEVER log the secret)
  console.log(`[FATGS -> TT_TRACKER] Handoff started: packageId=${payload.packageId}, academicYear=${payload.academicYear}, semesterType=${payload.semesterType}, slots=${payload.slots.length}, targetEndpoint=${targetUrl}`);

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || Number(process.env.TT_TRACKER_TIMEOUT_MS) || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-import-secret': secret,
        'x-tt-tracker-secret': secret,
        'Authorization': `Bearer ${secret}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (err) {
        responseData = null;
      }
    } else {
      const text = await response.text();
      responseData = { message: text };
    }

    console.log(`[FATGS -> TT_TRACKER] TT_TRACKER response status=${response.status}`);

    if (response.ok && responseData && responseData.success) {
      // Determine safe redirect destination based on trusted TT_TRACKER_URL
      let redirectUrl = new URL('/timetable', ttTrackerUrl).toString();
      if (responseData && responseData.redirectUrl) {
        try {
          const proposed = new URL(responseData.redirectUrl, ttTrackerUrl);
          // Only permit redirect within the configured TT_TRACKER host
          const trustedHost = new URL(ttTrackerUrl).host;
          if (proposed.host === trustedHost) {
            redirectUrl = proposed.toString();
          }
        } catch (e) {
          // Keep default redirectUrl if proposed URL is invalid
        }
      }

      return {
        success: true,
        statusCode: response.status,
        message: responseData.message || 'Timetable package accepted and activated in TT_TRACKER.',
        redirectUrl
      };
    }

    // Handle distinct error responses from TT_TRACKER
    let errorMsg = 'TT_TRACKER rejected the timetable package.';
    if (responseData && (responseData.error || responseData.message)) {
      errorMsg = responseData.error || responseData.message;
    }

    if (response.status === 401 || response.status === 403) {
      errorMsg = 'Authentication failed with TT_TRACKER. Invalid or unauthorized secret.';
    }

    console.warn(`[FATGS -> TT_TRACKER] Handoff rejected: ${errorMsg}`);

    return {
      success: false,
      statusCode: response.status,
      error: `TT_TRACKER import failed: ${errorMsg}`
    };
  } catch (err) {
    clearTimeout(timeoutId);

    console.error(`[FATGS -> TT_TRACKER] Handoff connection failure: ${err.message}`);

    if (err.name === 'AbortError') {
      return {
        success: false,
        statusCode: 504,
        error: `Request to TT_TRACKER timed out after ${timeoutMs / 1000} seconds.`
      };
    }

    return {
      success: false,
      statusCode: 502,
      error: `Unable to connect to TT_TRACKER at ${ttTrackerUrl} (${err.code || err.message}). Ensure TT_TRACKER is running.`
    };
  }
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tt-tracker-secret'
  });
  res.end(json);
}

function createServer(customOptions = {}) {
  return http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tt-tracker-secret'
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, {
        status: 'ok',
        service: 'FATGS Backend',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /api/tt-tracker/status
    if (req.method === 'GET' && pathname === '/api/tt-tracker/status') {
      const configured = Boolean(process.env.TT_TRACKER_URL && process.env.TT_TRACKER_IMPORT_SECRET);
      sendJson(res, 200, {
        configured,
        ttTrackerUrl: process.env.TT_TRACKER_URL || null,
        importEndpoint: process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import'
      });
      return;
    }

    // GET /api/timetable/session/current
    if (req.method === 'GET' && pathname === '/api/timetable/session/current') {
      const currentSess = loadGenerationState(customOptions.statePath);
      sendJson(res, 200, {
        success: true,
        sessionId: currentSess.sessionId || activeSessionId,
        academicYear: currentSess.academicYear || '2025-2026',
        createdAt: currentSess.createdAt || new Date().toISOString()
      });
      return;
    }

    // POST /api/timetable/session/new
    if (req.method === 'POST' && pathname === '/api/timetable/session/new') {
      const newSess = initSession();
      sendJson(res, 200, {
        success: true,
        sessionId: newSess.sessionId,
        message: 'New generation session created.',
        academicYear: newSess.academicYear,
        createdAt: newSess.createdAt
      });
      return;
    }

    // POST /api/timetable/generate-all
    if (req.method === 'POST' && pathname === '/api/timetable/generate-all') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 1024 * 1024) req.destroy();
      });

      req.on('end', () => {
        let payload = {};
        if (bodyStr.trim()) {
          try { payload = JSON.parse(bodyStr); } catch (e) { payload = {}; }
        }
        const semester = normalizeSemesterType(payload.semester || 'Odd');
        const options = {
          ...customOptions,
          sessionId: payload.sessionId,
          selectedTheoryRooms: payload.selectedTheoryRooms
        };
        const result = generateAllRequiredSections(semester, options);
        sendJson(res, result.success ? 200 : 400, result);
      });
      return;
    }

    // GET /api/timetable/generation-status
    if (req.method === 'GET' && pathname === '/api/timetable/generation-status') {
      const rawSemester = parsedUrl.searchParams.get('semester') || 'Odd';
      const sessionId = parsedUrl.searchParams.get('sessionId') || null;
      const semester = normalizeSemesterType(rawSemester);
      const options = { ...customOptions };
      if (sessionId) options.sessionId = sessionId;
      const status = getGenerationStatus(semester, options);
      sendJson(res, 200, status);
      return;
    }

    // POST /api/timetable/record-generation
    if (req.method === 'POST' && pathname === '/api/timetable/record-generation') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 10 * 1024 * 1024) req.destroy();
      });

      req.on('end', () => {
        let payload = null;
        try {
          payload = JSON.parse(bodyStr);
        } catch (err) {
          sendJson(res, 400, { success: false, error: 'Malformed JSON payload.' });
          return;
        }

        const options = { ...customOptions };
        if (payload && payload.sessionId) options.sessionId = payload.sessionId;
        const result = recordSectionGeneration(payload, options);
        sendJson(res, result.success ? 200 : (result.statusCode || 400), result);
      });
      return;
    }

    // POST /api/timetable/reset-generation
    if (req.method === 'POST' && pathname === '/api/timetable/reset-generation') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 1024 * 1024) req.destroy();
      });

      req.on('end', () => {
        let payload = {};
        if (bodyStr.trim()) {
          try {
            payload = JSON.parse(bodyStr);
          } catch (e) {
            payload = {};
          }
        }
        const options = { ...customOptions };
        if (payload && payload.sessionId) options.sessionId = payload.sessionId;
        const result = resetGeneration(payload, options);
        sendJson(res, 200, result);
      });
      return;
    }

    // GET /api/timetable/export
    if (req.method === 'GET' && pathname === '/api/timetable/export') {
      const rawSemester = parsedUrl.searchParams.get('semester') || 'Odd';
      const sessionId = parsedUrl.searchParams.get('sessionId') || null;
      const semester = normalizeSemesterType(rawSemester);
      const options = { ...customOptions };
      if (sessionId) options.sessionId = sessionId;
      const result = exportTimetable(semester, options);
      if (!result.success) {
        sendJson(res, result.statusCode || 400, result);
      } else {
        sendJson(res, 200, result.data);
      }
      return;
    }

    // POST /api/handoff-timetable
    if (req.method === 'POST' && pathname === '/api/handoff-timetable') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 10 * 1024 * 1024) {
          req.destroy();
        }
      });

      req.on('end', async () => {
        let payload = null;
        try {
          payload = JSON.parse(bodyStr);
        } catch (err) {
          sendJson(res, 400, {
            success: false,
            error: 'Malformed JSON payload in request body.'
          });
          return;
        }

        const handoffOptions = { ...customOptions };
        if (payload && payload.sessionId) handoffOptions.sessionId = payload.sessionId;

        let pkg = null;
        if (payload && payload.semester && !payload.package && !payload.timetable && !payload.slots) {
          const sem = normalizeSemesterType(payload.semester);
          const exportResult = exportTimetable(sem, handoffOptions);
          if (!exportResult.success) {
            sendJson(res, exportResult.statusCode || 400, {
              success: false,
              error: exportResult.error,
              missingSections: exportResult.missingSections,
              conflicts: exportResult.conflicts
            });
            return;
          }
          pkg = exportResult.data;
        } else {
          pkg = payload.package || payload;
          const validation = validateSemesterPackage(pkg);
          if (!validation.valid) {
            sendJson(res, 400, {
              success: false,
              error: validation.error
            });
            return;
          }

          const rawSem = pkg.semesterType || pkg.semester || 'Odd';
          const sem = normalizeSemesterType(rawSem);
          const pkgSlots = Array.isArray(pkg.slots) ? pkg.slots : (Array.isArray(pkg.timetable) ? pkg.timetable : []);
          const globalVal = validateGlobalTimetable(pkgSlots, sem);

          if (!globalVal.valid) {
            sendJson(res, 400, {
              success: false,
              error: `Cannot handoff to TT_TRACKER: Timetable package contains ${globalVal.conflicts.length} global conflict(s). Timetable must be globally valid before handoff. First conflict: ${globalVal.conflicts[0].message}`,
              conflicts: globalVal.conflicts
            });
            return;
          }
        }

        const result = await handoffToTTTracker(pkg, handoffOptions);
        sendJson(res, result.success ? 200 : result.statusCode || 500, result);
      });
      return;
    }

    // Not found
    sendJson(res, 404, {
      success: false,
      error: `Endpoint not found: ${req.method} ${pathname}`
    });
  });
}

function startServer(port = process.env.PORT || 5001) {
  const server = createServer();
  server.listen(port, () => {
    console.log(`[FATGS] Backend server running on http://localhost:${port}`);
    console.log(`[FATGS] Active generation session: ${activeSessionId}`);
    console.log(`[FATGS] TT_TRACKER target: ${process.env.TT_TRACKER_URL || 'Not Configured'}`);
    console.log(`[FATGS] TT_TRACKER endpoint: ${process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import'}`);
  });
  return server;
}

module.exports = {
  loadEnv,
  normalizeSemesterType,
  getSubjectsData,
  getRoomsData,
  getFacultyData,
  getRequiredSections,
  initSession,
  getActiveSessionId,
  validateGlobalTimetable,
  getOccupiedBookings,
  loadGenerationState,
  saveGenerationState,
  getGenerationStatus,
  recordSectionGeneration,
  resetGeneration,
  generateAllRequiredSections,
  exportTimetable,
  validateSemesterPackage,
  mapSlotForTTTracker,
  prepareTTTrackerPayload,
  handoffToTTTracker,
  createServer,
  startServer
};

if (require.main === module) {
  startServer();
}

