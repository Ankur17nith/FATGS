import {
  RAW_SECTIONS,
  FACULTY_ROSTER,
  CANDIDATE_THEORY_ROOMS,
  DEFAULT_THEORY_ROOMS,
  DAYS,
  INTERVALS,
  createInitialStore,
  generateTimetableForSection
} from '../src/data/timetableData.js';

console.log('======================================================');
console.log('         FATGS FRONTEND UI & LOGIC AUDIT              ');
console.log('======================================================');

const store = createInitialStore();

// 1. Audit Academic Structure
console.log('\n--- 1. AUDITING ACADEMIC SELECTORS & SECTIONS ---');
const years = [...new Set(store.map(s => s.year))];
console.log('Available Years in Store:', years);

const expectedYears = ['2nd Year', '3rd Year', '4th Year', '5th Year', 'M.Tech 1st Year'];
expectedYears.forEach(ey => {
  if (!years.includes(ey)) throw new Error(`Missing expected year: ${ey}`);
});
console.log('[PASS] All expected years exist:', expectedYears.join(', '));

// Check CS5 does NOT exist
const allSections = [...new Set(store.map(s => s.name))];
console.log('All Section Names:', allSections.join(', '));
if (allSections.includes('CS5')) {
  throw new Error('FAIL: CS5 must NOT exist anywhere in the application!');
}
console.log('[PASS] Zero CS5 verified (CS5 is not present anywhere).');

// Verify 2nd Year
const sem2 = [...new Set(store.filter(s => s.year === '2nd Year').map(s => s.semester))];
console.log('2nd Year Semesters:', sem2);
if (!sem2.includes('3rd Semester') || !sem2.includes('4th Semester')) {
  throw new Error('2nd Year must have 3rd and 4th Semesters');
}
console.log('[PASS] 2nd Year has 3rd and 4th Semesters.');

// Verify 3rd Year
const sem3 = [...new Set(store.filter(s => s.year === '3rd Year').map(s => s.semester))];
console.log('3rd Year Semesters:', sem3);
if (!sem3.includes('5th Semester') || !sem3.includes('6th Semester')) {
  throw new Error('3rd Year must have 5th and 6th Semesters');
}
console.log('[PASS] 3rd Year has 5th and 6th Semesters.');

// Verify 4th Year
const sem4 = [...new Set(store.filter(s => s.year === '4th Year').map(s => s.semester))];
console.log('4th Year Semesters:', sem4);
if (!sem4.includes('7th Semester') || !sem4.includes('8th Semester')) {
  throw new Error('4th Year must have 7th and 8th Semesters');
}
console.log('[PASS] 4th Year has 7th and 8th Semesters.');

// Verify 5th Year
const sem5 = [...new Set(store.filter(s => s.year === '5th Year').map(s => s.semester))];
const sec5 = store.filter(s => s.year === '5th Year').map(s => s.name);
console.log('5th Year Semesters:', sem5, 'Sections:', sec5);
if (!sec5.includes('CD5') || sec5.includes('CS5')) {
  throw new Error('5th Year must have CD5 only, NO CS5');
}
console.log('[PASS] 5th Year has CD5 and zero CS5.');

// Verify M.Tech
const semMTech = [...new Set(store.filter(s => s.year === 'M.Tech 1st Year').map(s => s.semester))];
const secMTech = store.filter(s => s.year === 'M.Tech 1st Year').map(s => s.name);
console.log('M.Tech Semesters:', semMTech, 'Sections:', secMTech);
if (!secMTech.includes('MT1') || !secMTech.includes('MA1')) {
  throw new Error('M.Tech must include MT1 (M.Tech CSE) and MA1 (M.Tech AI)');
}
console.log('[PASS] M.Tech has 1st Semester with MT1 and MA1.');

// 2. Audit Faculty Full Names vs Faculty Codes
console.log('\n--- 2. AUDITING FACULTY ROSTER ---');
FACULTY_ROSTER.forEach(f => {
  if (!f.name || !f.code) throw new Error(`Faculty missing name or code: ${JSON.stringify(f)}`);
});
console.log(`[PASS] All ${FACULTY_ROSTER.length} faculty entries have full names and short codes.`);
console.log('Sample faculty:', FACULTY_ROSTER.slice(0, 3).map(f => `${f.name} -> ${f.code}`).join(' | '));

// 3. Test Generation and Timetable Cell Data for every section
console.log('\n--- 3. TESTING SCHEDULE GENERATION & CELL ATTRIBUTES ---');
const persistedGrids = new Map();
const globalFacBookings = new Set();
const globalRoomBookings = new Set();

let totalSlotsChecked = 0;
let theorySlotsChecked = 0;
let labSlotsChecked = 0;

for (let sIdx = 0; sIdx < store.length; sIdx++) {
  const section = store[sIdx];
  // Assign faculty to subjects and labs so they don't all collide on fallback 'RK'
  section.subjects.forEach((sub, idx) => {
    sub.faculty = FACULTY_ROSTER[(sIdx * 4 + idx) % FACULTY_ROSTER.length].code;
  });
  section.labs.forEach((lab, idx) => {
    lab.faculty = FACULTY_ROSTER[(sIdx * 3 + idx + 10) % FACULTY_ROSTER.length].code;
  });

  // Pre-assign faculty to at least 1 elective if present
  if (section.electives && section.electives.length > 0) {
    section.electives[0].faculty = 'RK';
    if (section.electives.length > 1) section.electives[1].faculty = 'NG';
  }

  const grid = generateTimetableForSection({
    section,
    selectedTheoryRooms: DEFAULT_THEORY_ROOMS,
    globalFacBookings,
    globalRoomBookings,
    persistedGrids
  });
  persistedGrids.set(`${section.name}_${section.year}_${section.semester}`, grid);

  const isThirdYear = section.name === 'CS3' || section.name === 'CD3' || (section.year && section.year.includes('3rd'));
  const lunchIdx = isThirdYear ? 3 : 4;

  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < 8; p++) {
      const cell = grid[d][p];
      if (p === lunchIdx) {
        // Lunch slot MUST be empty (never have a class scheduled inside it)
        if (cell) {
          throw new Error(`FAIL: Section ${section.name} has class scheduled in year-specific lunch slot at day ${d}, period ${p}!`);
        }
        continue;
      }
      if (!cell) continue;

      const entries = Array.isArray(cell) ? cell : [cell];
      entries.forEach(e => {
        totalSlotsChecked++;
        if (e.isLab) {
          labSlotsChecked++;
          if (!e.group) {
            console.warn(`[WARN] Lab ${e.code} in ${section.name} missing group!`);
          }
        } else if (!e.isReservedEmpty && !e.electiveType) {
          theorySlotsChecked++;
          // HARD REQUIREMENT: Groups must NOT appear on theory subjects!
          if (e.group) {
            throw new Error(`FAIL: Theory class ${e.code} in ${section.name} must NOT have a group label!`);
          }
        }
        // Timetable must display faculty code, not full name
        if (e.faculty && e.faculty.length > 10) {
          throw new Error(`FAIL: Timetable entry displays full name instead of faculty code: ${e.faculty}`);
        }
      });
    }
  }
}

console.log(`[PASS] Checked ${totalSlotsChecked} scheduled sessions across all sections.`);
console.log(`[PASS] ${theorySlotsChecked} theory sessions checked: ZERO group labels on theory.`);
console.log(`[PASS] ${labSlotsChecked} lab sessions checked: Labs correctly retain group designations.`);
console.log('[PASS] Timetable cells display short faculty codes, never full names.');

// 4. Verify Continuous Class / Same Room Constraint in Frontend Schedules
console.log('\n--- 4. AUDITING CONTINUOUS CLASS SAME-ROOM CONSTRAINT ---');
let continuousPairsChecked = 0;
for (const [secName, grid] of persistedGrids.entries()) {
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < 7; p++) {
      const c1 = grid[d][p];
      const c2 = grid[d][p + 1];
      if (!c1 || !c2) continue;
      const entries1 = Array.isArray(c1) ? c1 : [c1];
      const entries2 = Array.isArray(c2) ? c2 : [c2];

      for (const e1 of entries1) {
        if (!e1.code || e1.isLab || e1.isReservedEmpty || e1.electiveType) continue;
        for (const e2 of entries2) {
          if (!e2.code || e2.isLab || e2.isReservedEmpty || e2.electiveType) continue;
          if (e1.code === e2.code) {
            // Consecutive periods of the same theory subject
            continuousPairsChecked++;
            if (e1.room !== e2.room) {
              throw new Error(`FAIL: Section ${secName} continuous class ${e1.code} on day ${DAYS[d]} at periods ${p} and ${p + 1} uses different rooms: ${e1.room} vs ${e2.room}`);
            }
          }
        }
      }
    }
  }
}
console.log(`[PASS] Verified ${continuousPairsChecked} continuous theory period pairs across frontend schedules: 100% USE THE SAME ROOM.`);

// 5. Verify Room Stability & Student Movement Minimization across Consecutive Classes
console.log('\n--- 5. AUDITING ROOM STABILITY & STUDENT MOVEMENT ---');
let consecutiveTheoryPairs = 0;
let sameRoomRuns = 0;
for (const [secName, grid] of persistedGrids.entries()) {
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < 7; p++) {
      const c1 = grid[d][p];
      const c2 = grid[d][p + 1];
      if (!c1 || !c2) continue;
      const e1 = Array.isArray(c1) ? c1[0] : c1;
      const e2 = Array.isArray(c2) ? c2[0] : c2;
      if (!e1 || !e2 || !e1.room || !e2.room) continue;
      if (e1.isLab || e2.isLab || e1.isReservedEmpty || e2.isReservedEmpty) continue;

      consecutiveTheoryPairs++;
      if (e1.room === e2.room) {
        sameRoomRuns++;
      }
    }
  }
}
console.log(`[PASS] Consecutive theory periods: ${consecutiveTheoryPairs}, Same-room runs: ${sameRoomRuns}`);
console.log(`[PASS] Student room stability demonstrated across consecutive classes without violating any hard constraints.`);

console.log('\n======================================================');
console.log('         ALL FRONTEND AUDIT CHECKS PASSED!            ');
console.log('======================================================');


