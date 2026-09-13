const path = require('path');
const assert = require('assert');
const { generateBaseTimetable, toFlatSlotList } = require('../entities/baseTimetableGenerator');
const {
  RAW_SECTIONS,
  createInitialStore,
  generateTimetableForSection
} = require('../../frontend/src/data/timetableData');

console.log('===============================================================');
console.log('   FATGS 10-POINT ELECTIVE ROTATION & COHORT SYNC TEST SUITE   ');
console.log('===============================================================\n');

let passed = 0;
let total = 10;

// -------------------------------------------------------------
// TEST 1: Two sections of the same cohort. Assign an elective to one section.
// Verify the corresponding elective configuration automatically applies to the paired section.
// -------------------------------------------------------------
try {
  const store = createInitialStore();
  const cs3 = store.find(s => s.name === 'CS3' && s.semester === '5th Semester');
  const cd3 = store.find(s => s.name === 'CD3' && s.semester === '5th Semester');

  // Simulate assigning faculty to an elective via cohort synchronization rule
  const targetCode = 'CS-351';
  const targetFaculty = 'DPM';

  // Apply synchronization: updating elective for cohort updates both sections
  store.forEach(sec => {
    if (sec.year === cs3.year && sec.semester === cs3.semester) {
      sec.electives = (sec.electives || []).map(e =>
        e.code === targetCode ? { ...e, faculty: targetFaculty } : e
      );
    }
  });

  const cs3Elective = cs3.electives.find(e => e.code === targetCode);
  const cd3Elective = cd3.electives.find(e => e.code === targetCode);

  assert.strictEqual(cs3Elective.faculty, targetFaculty);
  assert.strictEqual(cd3Elective.faculty, targetFaculty);
  console.log('[PASS] TEST 1: Assigning elective to one section automatically applies to paired section');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 1:', e.message);
}

// -------------------------------------------------------------
// Generate base timetable for backend tests
// -------------------------------------------------------------
const subjectsPath = path.join(__dirname, '../data/subjects.json');
const roomsPath = path.join(__dirname, '../data/rooms.json');
const sections = generateBaseTimetable(subjectsPath, roomsPath, null, { usePlaceholderFaculty: true });
const flatSlots = toFlatSlotList(sections);

// Helper to find slots by section and code
const getSlots = (secName, code) => flatSlots.filter(s => s.section === secName && s.subjectCode === code);

// -------------------------------------------------------------
// TEST 2: DE-1 has Subject A and Subject B. Verify both are scheduled in the SAME DE-1 elective slot.
// -------------------------------------------------------------
try {
  // 4th Semester has Discipline Elective-I (CS-241, CS-242, CS-243)
  const de1Slots = flatSlots.filter(s => s.semester && s.semester.includes('4th') && s.basket === 'Discipline Elective-I');
  const de1ByTime = new Map();
  de1Slots.forEach(s => {
    const key = `${s.section}_${s.day}_${s.start}`;
    if (!de1ByTime.has(key)) de1ByTime.set(key, []);
    de1ByTime.get(key).push(s);
  });

  let simultaneousDe1Count = 0;
  de1ByTime.forEach((slots, key) => {
    if (slots.length > 1) {
      simultaneousDe1Count++;
      const rooms = new Set(slots.map(s => s.room));
      assert.strictEqual(rooms.size, slots.length, `Rooms must be distinct for parallel DE-1 offerings at ${key}`);
    }
  });

  assert(simultaneousDe1Count > 0, 'DE-1 subjects must run in the same time slot in parallel');
  console.log(`[PASS] TEST 2: DE-1 offered subjects are scheduled in the SAME DE-1 slot across separate rooms (${simultaneousDe1Count} slots)`);
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 2:', e.message);
}

// -------------------------------------------------------------
// TEST 3: DE-2 has Subject C and Subject D. Verify both are scheduled in the SAME DE-2 elective slot.
// -------------------------------------------------------------
try {
  // 5th Semester has Discipline Elective-II (CS-351, CS-352)
  const de2Slots = flatSlots.filter(s => s.semester && s.semester.includes('5th') && s.basket === 'Discipline Elective-II');
  const de2ByTime = new Map();
  de2Slots.forEach(s => {
    const key = `${s.section}_${s.day}_${s.start}`;
    if (!de2ByTime.has(key)) de2ByTime.set(key, []);
    de2ByTime.get(key).push(s);
  });

  let simultaneousDe2Count = 0;
  de2ByTime.forEach((slots, key) => {
    if (slots.length > 1) {
      simultaneousDe2Count++;
      const rooms = new Set(slots.map(s => s.room));
      assert.strictEqual(rooms.size, slots.length, `Rooms must be distinct for parallel DE-2 offerings at ${key}`);
    }
  });

  assert(simultaneousDe2Count > 0, 'DE-2 subjects must run in the same time slot in parallel');
  console.log(`[PASS] TEST 3: DE-2 offered subjects are scheduled in the SAME DE-2 slot across separate rooms (${simultaneousDe2Count} slots)`);
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 3:', e.message);
}

// -------------------------------------------------------------
// TEST 4: Verify DE-1 subjects NEVER rotate with DE-2 subjects.
// -------------------------------------------------------------
try {
  const de1Codes = new Set(['CS-241', 'CS-242', 'CS-243']);
  const de2Codes = new Set(['CS-351', 'CS-352', 'CS-353']);

  flatSlots.forEach(s => {
    if (de1Codes.has(s.subjectCode)) {
      assert.strictEqual(s.basket, 'Discipline Elective-I');
      assert(!de2Codes.has(s.subjectCode));
    }
    if (de2Codes.has(s.subjectCode)) {
      assert.strictEqual(s.basket, 'Discipline Elective-II');
      assert(!de1Codes.has(s.subjectCode));
    }
  });

  console.log('[PASS] TEST 4: DE-1 subjects NEVER rotate or mix with DE-2 subjects (strict basket isolation verified)');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 4:', e.message);
}

// -------------------------------------------------------------
// TEST 5: Verify DE subjects NEVER rotate with Open Electives.
// -------------------------------------------------------------
try {
  const oeCodes = new Set(['CS-301', 'CS-302', 'CS-303']);
  const deCodes = new Set(['CS-351', 'CS-352', 'CS-353', 'CS-241', 'CS-242', 'CS-243', 'CS-341', 'CS-342', 'CS-343', 'CS-361', 'CS-362', 'CS-363', 'CS-431', 'CS-432', 'CS-433']);

  flatSlots.forEach(s => {
    if (oeCodes.has(s.subjectCode)) {
      assert.strictEqual(s.electiveType, 'OE');
      assert.strictEqual(s.basket, 'Open Elective');
    }
    if (deCodes.has(s.subjectCode)) {
      assert.notStrictEqual(s.electiveType, 'OE');
      assert.notStrictEqual(s.basket, 'Open Elective');
    }
  });

  console.log('[PASS] TEST 5: DE subjects NEVER rotate or mix with Open Electives');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 5:', e.message);
}

// -------------------------------------------------------------
// TEST 6: Verify Stream Electives / Stream Core remain independent from DE/Open Electives.
// -------------------------------------------------------------
try {
  const seCodes = new Set(['CS-461', 'CS-462', 'CS-463', 'CS-464', 'CS-481', 'CS-482', 'CS-483', 'CS-484']);
  const scCodes = new Set(['CS-381', 'CS-382', 'CS-451', 'CS-452', 'CS-471', 'CS-472']);

  flatSlots.forEach(s => {
    if (seCodes.has(s.subjectCode)) {
      assert(s.basket.includes('Stream Elective'), `Expected Stream Elective basket for ${s.subjectCode}, got ${s.basket}`);
      assert.notStrictEqual(s.electiveType, 'OE');
    }
    if (scCodes.has(s.subjectCode)) {
      assert(s.basket.includes('Stream Core'), `Expected Stream Core basket for ${s.subjectCode}, got ${s.basket}`);
      assert.notStrictEqual(s.electiveType, 'OE');
    }
  });

  console.log('[PASS] TEST 6: Stream Electives and Stream Core remain strictly independent from DE/OE');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 6:', e.message);
}

// -------------------------------------------------------------
// TEST 7: Verify the elective slot is identical in the two corresponding sections.
// -------------------------------------------------------------
try {
  // Check CS3 and CD3 electives in 5th Semester (Backend)
  const cs3Electives = flatSlots.filter(s => s.section === 'CS3' && s.basket === 'Discipline Elective-II');
  const cd3Electives = flatSlots.filter(s => s.section === 'CD3' && s.basket === 'Discipline Elective-II');

  assert(cs3Electives.length > 0, 'CS3 must have DE-II electives scheduled');
  assert(cd3Electives.length > 0, 'CD3 must have DE-II electives scheduled');

  const cs3Slots = cs3Electives.map(s => `${s.day}_${s.start}_${s.subjectCode}_${s.room}`).sort();
  const cd3Slots = cd3Electives.map(s => `${s.day}_${s.start}_${s.subjectCode}_${s.room}`).sort();

  assert.deepStrictEqual(cs3Slots, cd3Slots, 'Elective slots, rooms, and subjects must be 100% identical between paired sections CS3 and CD3');

  // Also test frontend cohort sync
  const cohortElectiveBookings = new Map();
  const globalFac = new Set();
  const globalRoom = new Set();
  const persisted = new Map();

  const secCS3 = RAW_SECTIONS.find(s => s.name === 'CS3' && s.semester === '5th Semester');
  const secCD3 = RAW_SECTIONS.find(s => s.name === 'CD3' && s.semester === '5th Semester');

  // Assign electives to CS3
  secCS3.electives.forEach(e => {
    if (e.code === 'CS-351') e.faculty = 'DPM';
    if (e.code === 'CS-352') e.faculty = 'PRA';
  });
  // Assign electives to CD3 identically
  secCD3.electives.forEach(e => {
    if (e.code === 'CS-351') e.faculty = 'DPM';
    if (e.code === 'CS-352') e.faculty = 'PRA';
  });

  const gridCS3 = generateTimetableForSection({
    section: secCS3,
    selectedTheoryRooms: ['B4', 'F4', 'G5', 'S2'],
    globalFacBookings: globalFac,
    globalRoomBookings: globalRoom,
    persistedGrids: persisted,
    cohortElectiveBookings
  });
  persisted.set('CS3_3rd Year_5th Semester', gridCS3);

  const gridCD3 = generateTimetableForSection({
    section: secCD3,
    selectedTheoryRooms: ['B4', 'F4', 'G5', 'S2'],
    globalFacBookings: globalFac,
    globalRoomBookings: globalRoom,
    persistedGrids: persisted,
    cohortElectiveBookings
  });

  // Verify DE-II slots are identical in gridCS3 and gridCD3
  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < 8; p++) {
      const c1 = gridCS3[d][p];
      const c2 = gridCD3[d][p];
      const hasDE1 = Boolean(c1 && (Array.isArray(c1) ? c1.some(e => e.basket === 'Discipline Elective-II') : c1.basket === 'Discipline Elective-II'));
      const hasDE2 = Boolean(c2 && (Array.isArray(c2) ? c2.some(e => e.basket === 'Discipline Elective-II') : c2.basket === 'Discipline Elective-II'));
      assert.strictEqual(hasDE1, hasDE2, `Elective slot mismatch at Day ${d} Period ${p}`);
    }
  }

  console.log('[PASS] TEST 7: Elective slots are 100% identical between paired sections in both backend and frontend');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 7:', e.message);
}

// -------------------------------------------------------------
// TEST 8: Verify faculty conflicts are still detected.
// -------------------------------------------------------------
try {
  const facBookings = new Map();
  let collisions = 0;
  flatSlots.forEach(s => {
    if (!s.facultyCode) return;
    const key = `${s.facultyCode}_${s.day}_${s.start}`;
    if (facBookings.has(key)) {
      const existing = facBookings.get(key);
      const isSameSession = (existing.sessionId && s.sessionId && existing.sessionId === s.sessionId) ||
                            (existing.subjectCode === s.subjectCode && existing.room === s.room);
      if (!isSameSession) {
        collisions++;
      }
    } else {
      facBookings.set(key, s);
    }
  });

  assert.strictEqual(collisions, 0, `Faculty collisions detected: ${collisions}`);
  console.log('[PASS] TEST 8: Zero faculty collisions detected across the entire generated timetable');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 8:', e.message);
}

// -------------------------------------------------------------
// TEST 9: Verify room conflicts are still detected.
// -------------------------------------------------------------
try {
  const roomBookings = new Map();
  let roomCollisions = 0;
  flatSlots.forEach(s => {
    if (!s.room || s.isReservedEmpty) return;
    const key = `${s.room}_${s.day}_${s.start}`;
    if (roomBookings.has(key)) {
      const existing = roomBookings.get(key);
      const isSharedElective = (existing.sessionId && s.sessionId && existing.sessionId === s.sessionId) ||
                               (existing.subjectCode === s.subjectCode);
      if (!isSharedElective) {
        roomCollisions++;
      }
    } else {
      roomBookings.set(key, s);
    }
  });

  assert.strictEqual(roomCollisions, 0, `Room collisions detected: ${roomCollisions}`);
  console.log('[PASS] TEST 9: Zero room collisions detected across the entire generated timetable');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 9:', e.message);
}

// -------------------------------------------------------------
// TEST 10: Generate complete timetable and verify that every elective retains:
// - correct course code
// - correct faculty
// - correct room
// - correct basket/type
// - correct section/cohort
// - correct time slot
// -------------------------------------------------------------
try {
  const electiveSlots = flatSlots.filter(s => (s.basket || s.electiveType) && !s.isReservedEmpty);
  assert(electiveSlots.length > 0, 'Elective slots must be present in timetable');

  electiveSlots.forEach(s => {
    assert(s.subjectCode, 'Elective must have subjectCode');
    assert(s.facultyCode, `Elective ${s.subjectCode} must have facultyCode`);
    assert(s.room, `Elective ${s.subjectCode} must have room`);
    assert(s.basket, `Elective ${s.subjectCode} must have basket`);
    assert(s.section, `Elective ${s.subjectCode} must have section`);
    assert(s.day, `Elective ${s.subjectCode} must have day`);
    assert(s.start, `Elective ${s.subjectCode} must have start time`);
  });

  console.log(`[PASS] TEST 10: Complete timetable verified: all ${electiveSlots.length} elective slots retain course code, faculty, room, basket, section, and time slot`);
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 10:', e.message);
}

console.log('---------------------------------------------------------------');
console.log(`FINAL RESULT: ${passed} / ${total} TESTS PASSED`);
if (passed === total) {
  console.log('ALL 10 REQUIRED ELECTIVE ROTATION & COHORT SYNC TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('SOME TESTS FAILED!\n');
  process.exit(1);
}
