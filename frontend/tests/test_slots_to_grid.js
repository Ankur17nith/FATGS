/**
 * FATGS Frontend Test: slotsToGrid
 *
 * Opening a green section card rebuilds the 5x8 grid from the slots stored on the
 * backend. The rebuilt grid must put every slot in the right cell and keep parallel
 * entries (G1/G2 labs, elective choices) together.
 */
import { createRequire } from 'module';
import { slotsToGrid, DAYS, INTERVALS } from '../src/data/timetableData.js';

const require = createRequire(import.meta.url);
const { generateBaseTimetable, toFlatSlotList } = require('../../backend/entities/baseTimetableGenerator.js');

console.log('======================================================');
console.log('        FATGS FRONTEND slotsToGrid TESTS              ');
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
const entriesOf = cell => (cell ? (Array.isArray(cell) ? cell : [cell]) : []);

const empty = slotsToGrid([]);
check(empty.length === DAYS.length && empty.every(r => r.length === INTERVALS.length && r.every(c => c === null)), 'no slots -> empty 5x8 grid');
check(slotsToGrid(undefined).length === 5, 'undefined slots do not crash');
check(slotsToGrid([{ day: 'Sunday', start: '09:00', subjectCode: 'X' }]).flat().every(c => c === null), 'a slot on an unknown day is ignored');
check(slotsToGrid([{ day: 'Monday', start: '08:00', subjectCode: 'X' }]).flat().every(c => c === null), 'a slot at an unknown time is ignored');

const one = slotsToGrid([{ day: 'Tuesday', start: '10:00', end: '11:00', subjectCode: 'CS-201', facultyCode: 'KD', room: 'B4', isLab: false }]);
check(one[1][1] && !Array.isArray(one[1][1]) && one[1][1].code === 'CS-201' && one[1][1].faculty === 'KD' && one[1][1].room === 'B4', 'a single slot becomes one entry in the right cell (Tuesday, 10:00)');

const two = slotsToGrid([
  { day: 'Monday', start: '09:00', subjectCode: 'L1', facultyCode: 'A', room: 'P1', isLab: true, group: 'G1' },
  { day: 'Monday', start: '09:00', subjectCode: 'L2', facultyCode: 'B', room: 'P2', isLab: true, group: 'G2' }
]);
check(Array.isArray(two[0][0]) && two[0][0].length === 2 && two[0][0][0].group === 'G1' && two[0][0][1].group === 'G2', 'parallel slots in one cell stay together as an array');

// Real generated timetable: every slot of every section must land in its cell
const sections = generateBaseTimetable('backend/data/subjects.json', 'backend/data/rooms.json', null, { includeMTech: true });
const flat = toFlatSlotList(sections);
const names = [...new Set(flat.map(s => `${s.section}|${s.year}|${s.semester}`))];
check(names.length >= 9, `generated ${names.length} sections to rebuild`);

let total = 0;
let rebuilt = 0;
let misplaced = 0;
for (const key of names) {
  const [section, year, semester] = key.split('|');
  const slots = flat.filter(s => s.section === section && s.year === year && s.semester === semester);
  const grid = slotsToGrid(slots);
  total += slots.length;
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < 8; p++) {
      for (const e of entriesOf(grid[d][p])) {
        rebuilt++;
        const match = slots.some(s => s.day === DAYS[d] && s.start === INTERVALS[p].start && s.subjectCode === e.code && (s.facultyCode || s.faculty || null) === e.facultyCode && (s.room || null) === e.room);
        if (!match) misplaced++;
      }
    }
  }
}
check(rebuilt === total, `every slot is rebuilt exactly once (${rebuilt}/${total})`);
check(misplaced === 0, 'every rebuilt entry matches its slot (day, time, subject, faculty, room)');

const lab = flat.find(s => s.isLab && s.duration === 2);
const labGrid = slotsToGrid(flat.filter(s => s.section === lab.section && s.year === lab.year && s.semester === lab.semester));
const labCells = [];
for (let d = 0; d < 5; d++) for (let p = 0; p < 8; p++) if (entriesOf(labGrid[d][p]).some(e => e.sessionId === lab.sessionId)) labCells.push([d, p]);
check(labCells.length >= 2 && labCells.every(([d]) => d === labCells[0][0]) && labCells[1][1] - labCells[0][1] === 1, '2-hour lab shows in two consecutive periods on the same day');

console.log('\n======================================================');
console.log(`   ALL ${passed} slotsToGrid CHECKS PASSED!`);
console.log('======================================================');
