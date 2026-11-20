/**
 * FATGS Frontend Test: Faculty slot blocking in the in-browser section generator.
 *
 * generateTimetableForSection (used when generating a single section in the UI) must never
 * place a faculty member inside a blocked day/period range.
 */
import {
  FACULTY_ROSTER,
  OFFICIAL_ALLOCATIONS,
  DAYS,
  DEFAULT_THEORY_ROOMS,
  createInitialStore,
  generateTimetableForSection,
  buildBlockedFacultyKeys
} from '../src/data/timetableData.js';

console.log('======================================================');
console.log('   FATGS FRONTEND FACULTY SLOT BLOCKING TESTS         ');
console.log('======================================================');

let passed = 0;
function check(cond, msg) {
  if (!cond) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`  [PASS] ${msg}`);
}

// 1. Key builder
const keys = buildBlockedFacultyKeys([
  { facultyCode: 'KD', day: 'Monday', startPeriod: 1, endPeriod: 2 },
  { facultyCode: 'NC', day: 'Friday', startPeriod: 8, endPeriod: 8 },
  { facultyCode: 'XX', day: 'Sunday', startPeriod: 1, endPeriod: 1 }
]);
check(keys.has('KD_0_0') && keys.has('KD_0_1') && !keys.has('KD_0_2'), 'range block expands to the right 0-based period keys');
check(keys.has('NC_4_7'), 'single-period block on Friday period 8 -> key NC_4_7');
check(keys.size === 3, 'an invalid day is ignored');
check(buildBlockedFacultyKeys(undefined).size === 0, 'no blocks -> empty set');

// 2. Generation across all odd-semester sections with a shared booking state (as the UI does)
const store = createInitialStore();
const oddSections = store.filter(s => /1st|3rd|5th|7th|9th/.test(s.semester));
check(oddSections.length > 0, `found ${oddSections.length} odd-semester sections`);

const load = {};
Object.values(OFFICIAL_ALLOCATIONS).forEach(a => Object.values(a).forEach(code => {
  if (code) load[code] = (load[code] || 0) + 1;
}));
const busiest = Object.entries(load).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

const blocks = [];
busiest.forEach(code => {
  blocks.push({ facultyCode: code, day: 'Monday', startPeriod: 1, endPeriod: 8 });
  blocks.push({ facultyCode: code, day: 'Tuesday', startPeriod: 2, endPeriod: 5 });
});
const blockedKeys = buildBlockedFacultyKeys(blocks);

function cellEntries(cell) {
  if (!cell) return [];
  return Array.isArray(cell) ? cell : [cell];
}

for (let run = 0; run < 6; run++) {
  const globalFac = new Set();
  const globalRoom = new Set();
  const persisted = new Map();
  const cohort = new Map();
  let placed = 0;
  let violations = [];

  for (const section of oddSections) {
    const grid = generateTimetableForSection({
      section,
      selectedTheoryRooms: DEFAULT_THEORY_ROOMS,
      globalFacBookings: globalFac,
      globalRoomBookings: globalRoom,
      persistedGrids: persisted,
      cohortElectiveBookings: cohort,
      blockedFacultyKeys: blockedKeys
    });
    persisted.set(`${section.name}_${section.year}_${section.semester}`, grid);
    for (let d = 0; d < 5; d++) {
      for (let p = 0; p < 8; p++) {
        for (const e of cellEntries(grid[d][p])) {
          const fac = e.facultyCode || e.faculty;
          if (!fac) continue;
          placed++;
          if (blockedKeys.has(`${fac}_${d}_${p}`)) {
            violations.push(`${section.name}: ${fac} on ${DAYS[d]} period ${p + 1}`);
          }
        }
      }
    }
  }
  check(placed > 0 && violations.length === 0, `run ${run + 1}: ${placed} faculty placements, 0 inside blocked ranges${violations.length ? ' - ' + violations[0] : ''}`);
}

// 3. Without blocks the same faculty do get used on Monday (proves the block is what changes the result)
let usedMonday = false;
for (let run = 0; run < 6 && !usedMonday; run++) {
  const globalFac = new Set(), globalRoom = new Set(), persisted = new Map(), cohort = new Map();
  for (const section of oddSections) {
    const grid = generateTimetableForSection({
      section, selectedTheoryRooms: DEFAULT_THEORY_ROOMS,
      globalFacBookings: globalFac, globalRoomBookings: globalRoom,
      persistedGrids: persisted, cohortElectiveBookings: cohort
    });
    persisted.set(`${section.name}_${section.year}_${section.semester}`, grid);
    for (let p = 0; p < 8; p++) {
      if (cellEntries(grid[0][p]).some(e => busiest.includes(e.facultyCode || e.faculty))) usedMonday = true;
    }
  }
}
check(usedMonday, 'without blocks, the busiest faculty are scheduled on Monday (control)');

check(FACULTY_ROSTER.length > 0, 'roster available for the dropdown');
console.log('\n======================================================');
console.log(`   ALL ${passed} FRONTEND BLOCKING CHECKS PASSED!`);
console.log('======================================================');
