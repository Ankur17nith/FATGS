/**
 * Faculty Slot Blocking
 *
 * Lets the timetable maker close specific day/period ranges for a faculty member
 * for one semester type (Odd or Even), so the generator never schedules that
 * faculty member in those slots. The faculty member is NOT locked out entirely;
 * only the listed slots are closed.
 *
 * A block is: { id, facultyCode, day, startPeriod, endPeriod, note? }
 *  - day:         'Monday' .. 'Friday'
 *  - startPeriod: 1..8 (inclusive)   Period 1 = 09:00-10:00 ... Period 8 = 16:00-17:00
 *  - endPeriod:   startPeriod..8 (inclusive); a single period has start === end
 *  - note:        optional free text (no reason is required)
 *
 * Blocks are stored per semester type in backend/data/faculty_blocks.json:
 *   { "Odd": [ ...blocks ], "Even": [ ...blocks ] }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIOD_COUNT = 8;
const FIRST_PERIOD_HOUR = 9; // Period 1 starts at 09:00
const DEFAULT_BLOCKS_PATH = path.join(__dirname, '../data/faculty_blocks.json');

/** FATGS_DATA_DIR (a persistent disk in production) wins; otherwise the file in the repo. */
function defaultBlocksPath() {
  const dir = (process.env.FATGS_DATA_DIR || '').trim();
  return dir ? path.join(path.resolve(dir), 'faculty_blocks.json') : DEFAULT_BLOCKS_PATH;
}
const FACULTY_PATH = path.join(__dirname, '../data/faculty.json');

function normalizeSemester(sem) {
  return /even/i.test(String(sem || '')) ? 'Even' : 'Odd';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Period number (1..8) -> { start: 'HH:MM', end: 'HH:MM' } */
function periodTimes(period) {
  const h = FIRST_PERIOD_HOUR + (period - 1);
  return { start: `${pad(h)}:00`, end: `${pad(h + 1)}:00` };
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return NaN;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function loadRoster() {
  try {
    return JSON.parse(fs.readFileSync(FACULTY_PATH, 'utf8'));
  } catch (e) {
    return [];
  }
}

/** Resolves a faculty code or full name to the canonical roster entry, or null. */
function resolveFaculty(identifier, roster = loadRoster()) {
  if (identifier === undefined || identifier === null) return null;
  const needle = String(identifier).trim();
  if (!needle) return null;
  const lower = needle.toLowerCase();
  return (
    roster.find(f => String(f.code).toLowerCase() === lower) ||
    roster.find(f => String(f.name).toLowerCase() === lower) ||
    null
  );
}

function emptyStore() {
  return { Odd: [], Even: [] };
}

function loadBlocks(filePath = defaultBlocksPath()) {
  try {
    if (!fs.existsSync(filePath)) return emptyStore();
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      Odd: Array.isArray(raw.Odd) ? raw.Odd : [],
      Even: Array.isArray(raw.Even) ? raw.Even : []
    };
  } catch (e) {
    return emptyStore();
  }
}

/** Atomic write: write to a temp file, then rename over the target. */
function saveBlocks(store, filePath = defaultBlocksPath()) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function listBlocks(semester, opts = {}) {
  const store = loadBlocks(opts.filePath);
  return store[normalizeSemester(semester)].slice();
}

/**
 * Validates raw input. Returns { ok:true, value } or { ok:false, error }.
 * Accepts faculty by code or by full name.
 */
function validateBlockInput(input, opts = {}) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Block must be an object.' };
  }

  const faculty = resolveFaculty(input.facultyCode ?? input.faculty, opts.roster);
  if (!faculty) {
    return { ok: false, error: `Unknown faculty "${input.facultyCode ?? input.faculty ?? ''}". Choose a faculty member from the roster.` };
  }

  const day = DAYS.find(d => d.toLowerCase() === String(input.day || '').trim().toLowerCase());
  if (!day) {
    return { ok: false, error: `Invalid day "${input.day ?? ''}". Use Monday to Friday.` };
  }

  const start = Number(input.startPeriod);
  const end = input.endPeriod === undefined || input.endPeriod === null || input.endPeriod === ''
    ? start
    : Number(input.endPeriod);
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return { ok: false, error: 'startPeriod and endPeriod must be whole numbers between 1 and 8.' };
  }
  if (start < 1 || start > PERIOD_COUNT || end < 1 || end > PERIOD_COUNT) {
    return { ok: false, error: `Periods must be between 1 and ${PERIOD_COUNT}.` };
  }
  if (end < start) {
    return { ok: false, error: 'endPeriod cannot be earlier than startPeriod.' };
  }

  let note = null;
  if (input.note !== undefined && input.note !== null) {
    note = String(input.note).trim().slice(0, 300) || null;
  }

  return {
    ok: true,
    value: { facultyCode: faculty.code, facultyName: faculty.name, day, startPeriod: start, endPeriod: end, note }
  };
}

/**
 * Adds a block. If it overlaps an existing block for the same faculty/day/semester,
 * the existing block is extended to the union range instead of creating a duplicate.
 * Returns { success, block, merged, warnings } or { success:false, error }.
 */
function addBlock(semester, input, opts = {}) {
  const check = validateBlockInput(input, opts);
  if (!check.ok) return { success: false, error: check.error };

  const sem = normalizeSemester(semester);
  const store = loadBlocks(opts.filePath);
  const v = check.value;

  const overlapping = store[sem].filter(b =>
    b.facultyCode === v.facultyCode &&
    b.day === v.day &&
    Math.max(b.startPeriod, v.startPeriod) <= Math.min(b.endPeriod, v.endPeriod)
  );

  let block;
  let merged = false;
  if (overlapping.length > 0) {
    merged = true;
    block = overlapping[0];
    block.startPeriod = Math.min(v.startPeriod, ...overlapping.map(b => b.startPeriod));
    block.endPeriod = Math.max(v.endPeriod, ...overlapping.map(b => b.endPeriod));
    if (v.note) block.note = v.note;
    // Drop any other overlapped blocks that were absorbed
    const absorbed = new Set(overlapping.slice(1).map(b => b.id));
    store[sem] = store[sem].filter(b => !absorbed.has(b.id));
  } else {
    block = {
      id: crypto.randomUUID(),
      facultyCode: v.facultyCode,
      facultyName: v.facultyName,
      day: v.day,
      startPeriod: v.startPeriod,
      endPeriod: v.endPeriod,
      note: v.note,
      createdAt: new Date().toISOString()
    };
    store[sem].push(block);
  }

  saveBlocks(store, opts.filePath);

  const warnings = [];
  if (block.startPeriod <= 5 && block.endPeriod >= 4) {
    warnings.push('This range includes periods 4-5 (12:00-14:00), which are lunch periods for some years. The block is still saved.');
  }

  return { success: true, block, merged, warnings };
}

function removeBlock(semester, id, opts = {}) {
  const sem = normalizeSemester(semester);
  const store = loadBlocks(opts.filePath);
  const before = store[sem].length;
  store[sem] = store[sem].filter(b => b.id !== id);
  if (store[sem].length === before) {
    return { success: false, error: `Block "${id}" not found for ${sem} semester.` };
  }
  saveBlocks(store, opts.filePath);
  return { success: true };
}

function clearBlocks(semester, opts = {}) {
  const sem = normalizeSemester(semester);
  const store = loadBlocks(opts.filePath);
  const removed = store[sem].length;
  store[sem] = [];
  saveBlocks(store, opts.filePath);
  return { success: true, removed };
}

/**
 * Calls bookFn(facultyCode, dayIndex0to4, periodIndex0to7) for every blocked period.
 * Used by the generator to pre-book blocked slots so no placement step uses them.
 */
function forEachBlockedPeriod(blocks, bookFn) {
  for (const b of blocks || []) {
    const dayIdx = DAYS.indexOf(b.day);
    if (dayIdx < 0) continue;
    for (let p = b.startPeriod; p <= b.endPeriod; p++) {
      bookFn(b.facultyCode, dayIdx, p - 1);
    }
  }
}

/**
 * Set of "CODE_dayIdx_periodIdx" keys for the browser generator, which tracks
 * faculty bookings as string keys.
 */
function blockedKeySet(blocks) {
  const set = new Set();
  forEachBlockedPeriod(blocks, (code, d, p) => set.add(`${code}_${d}_${p}`));
  return set;
}

/**
 * Finds generated slots that fall inside a blocked range for their faculty.
 * `slots` use the flat format: { facultyCode|faculty, day, start, end, section, subjectCode }.
 * Returns conflict objects in the same shape the global validator uses.
 */
function findBlockViolations(slots, blocks) {
  const conflicts = [];
  if (!Array.isArray(slots) || !Array.isArray(blocks) || blocks.length === 0) return conflicts;

  for (const s of slots) {
    const fac = s.facultyCode || s.faculty;
    if (!fac || !s.day) continue;
    const sStart = timeToMinutes(s.start);
    const sEnd = timeToMinutes(s.end);
    if (!(sStart < sEnd)) continue;

    for (const b of blocks) {
      if (b.facultyCode !== fac || b.day !== s.day) continue;
      const bStart = timeToMinutes(periodTimes(b.startPeriod).start);
      const bEnd = timeToMinutes(periodTimes(b.endPeriod).end);
      if (Math.max(sStart, bStart) < Math.min(sEnd, bEnd)) {
        const subject = s.subjectCode || s.code || '';
        conflicts.push({
          type: 'FACULTY_BLOCKED',
          resource: fac,
          day: s.day,
          time: `${s.start}–${s.end}`,
          section1: s.section || '',
          section2: null,
          subject1: subject,
          subject2: null,
          message: `Blocked slot violation: Faculty ${fac} is blocked on ${b.day} ${periodTimes(b.startPeriod).start}–${periodTimes(b.endPeriod).end} but is scheduled for ${s.section || ''} (${subject}) on ${s.day} ${s.start}–${s.end}.`
        });
        break;
      }
    }
  }
  return conflicts;
}

module.exports = {
  DAYS,
  PERIOD_COUNT,
  DEFAULT_BLOCKS_PATH,
  normalizeSemester,
  periodTimes,
  resolveFaculty,
  loadBlocks,
  saveBlocks,
  listBlocks,
  validateBlockInput,
  addBlock,
  removeBlock,
  clearBlocks,
  forEachBlockedPeriod,
  blockedKeySet,
  findBlockViolations
};
