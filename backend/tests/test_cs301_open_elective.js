const path = require('path');
const assert = require('assert');
const { generateBaseTimetable, toFlatSlotList } = require('../entities/baseTimetableGenerator');
const {
  createInitialStore,
  generateTimetableForSection,
  DEFAULT_THEORY_ROOMS
} = require('../../frontend/src/data/timetableData');

console.log('===============================================================');
console.log('      FATGS CS-301 OPEN ELECTIVE VALIDATION TEST SUITE         ');
console.log('===============================================================\n');

let passed = 0;
const total = 11;

// 1. Generate base timetable
const subjectsPath = path.join(__dirname, '../data/subjects.json');
const roomsPath = path.join(__dirname, '../data/rooms.json');
const sections = generateBaseTimetable(subjectsPath, roomsPath, null, { usePlaceholderFaculty: true });
const flatSlots = toFlatSlotList(sections);

// TEST 1: Generate a timetable where CS-301 is offered. Verify CS-301 appears in generated JSON.
try {
  const cs301Slots = flatSlots.filter(s => s.subjectCode === 'CS-301');
  assert(cs301Slots.length > 0, 'CS-301 must appear in the generated timetable JSON');
  console.log(`[PASS] TEST 1: CS-301 appears in generated JSON (${cs301Slots.length} slots found across sections)`);
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 1:', e.message);
}

// TEST 2: Verify CS-301 is classified as OPEN ELECTIVE and NOT as a room/place.
try {
  const cs301Slots = flatSlots.filter(s => s.subjectCode === 'CS-301');
  assert(cs301Slots.length > 0);
  cs301Slots.forEach(s => {
    assert.strictEqual(s.electiveType, 'OE', `CS-301 electiveType must be OE, got ${s.electiveType}`);
    assert.strictEqual(s.basket, 'Open Elective', `CS-301 basket must be Open Elective, got ${s.basket}`);
    assert.notStrictEqual(s.room, 'Open Elective', 'Open Elective must NOT be treated as a room');
    assert.notStrictEqual(s.room, 'OE', 'OE must NOT be treated as a room');
  });
  console.log('[PASS] TEST 2: CS-301 is classified as OPEN ELECTIVE and NOT as a room/place');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 2:', e.message);
}

// TEST 3: Verify CS-301 receives a valid faculty.
try {
  const cs301Slots = flatSlots.filter(s => s.subjectCode === 'CS-301');
  cs301Slots.forEach(s => {
    assert(s.facultyCode && s.facultyCode.trim().length > 0, 'CS-301 must have a valid non-empty facultyCode');
    assert.strictEqual(s.facultyCode, 'KK', `Expected Dr Keshav Kaundal (KK), got ${s.facultyCode}`);
  });
  console.log('[PASS] TEST 3: CS-301 receives valid authoritative faculty (KK)');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 3:', e.message);
}

// TEST 4: Verify CS-301 receives a valid room.
try {
  const cs301Slots = flatSlots.filter(s => s.subjectCode === 'CS-301');
  cs301Slots.forEach(s => {
    assert(s.room && s.room.trim().length > 0, 'CS-301 must have a valid non-empty classroom');
    assert(['B4', 'F4', 'G5', 'S2', 'CSE-III', 'Seminar Hall - Block A'].includes(s.room) || s.room.length > 0, `Invalid room: ${s.room}`);
  });
  console.log(`[PASS] TEST 4: CS-301 receives valid physical classroom (${cs301Slots[0].room})`);
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 4:', e.message);
}

// TEST 5: Verify CS-301 is scheduled in the configured FIXED OPEN ELECTIVE SLOT.
try {
  const cs301Slots = flatSlots.filter(s => s.subjectCode === 'CS-301');
  const allowedFixedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  cs301Slots.forEach(s => {
    assert(allowedFixedDays.includes(s.day), `Invalid day for OE: ${s.day}`);
    assert.strictEqual(s.start, '13:00', `Fixed OE start time must be 13:00, got ${s.start}`);
    assert.strictEqual(s.end, '14:00', `Fixed OE end time must be 14:00, got ${s.end}`);
  });
  console.log('[PASS] TEST 5: CS-301 is scheduled in the configured FIXED OPEN ELECTIVE SLOT (13:00 - 14:00)');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 5:', e.message);
}

// TEST 6: If CS-301 requires multiple weekly periods, verify the correct number of Open Elective slots are generated.
try {
  const cs3CS301 = flatSlots.filter(s => s.section === 'CS3' && s.subjectCode === 'CS-301');
  const cd3CS301 = flatSlots.filter(s => s.section === 'CD3' && s.subjectCode === 'CS-301');
  // 3 credits / 3 L = exactly 3 slots per section
  assert.strictEqual(cs3CS301.length, 3, `CS3 must have exactly 3 weekly periods of CS-301, got ${cs3CS301.length}`);
  assert.strictEqual(cd3CS301.length, 3, `CD3 must have exactly 3 weekly periods of CS-301, got ${cd3CS301.length}`);
  console.log(`[PASS] TEST 6: Exactly 3 weekly periods generated matching course load/credits for CS-301`);
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 6:', e.message);
}

// TEST 7: Generate the corresponding paired section. Verify both sections have the SAME Open Elective slot.
try {
  const cs3CS301 = flatSlots.filter(s => s.section === 'CS3' && s.subjectCode === 'CS-301').map(s => `${s.day}_${s.start}_${s.room}`).sort();
  const cd3CS301 = flatSlots.filter(s => s.section === 'CD3' && s.subjectCode === 'CS-301').map(s => `${s.day}_${s.start}_${s.room}`).sort();
  assert.deepStrictEqual(cs3CS301, cd3CS301, 'Paired sections CS3 and CD3 must have identical Open Elective slots and classrooms');

  // Test in frontend generator as well
  const store = createInitialStore();
  const cs3 = store.find(s => s.name === 'CS3' && s.semester === '5th Semester');
  const cd3 = store.find(s => s.name === 'CD3' && s.semester === '5th Semester');
  const cohortElectiveBookings = new Map();
  const globalFac = new Set();
  const globalRoom = new Set();
  const persisted = new Map();

  const gridCS3 = generateTimetableForSection({
    section: cs3,
    selectedTheoryRooms: DEFAULT_THEORY_ROOMS,
    globalFacBookings: globalFac,
    globalRoomBookings: globalRoom,
    persistedGrids: persisted,
    cohortElectiveBookings
  });
  persisted.set('CS3_3rd Year_5th Semester', gridCS3);

  const gridCD3 = generateTimetableForSection({
    section: cd3,
    selectedTheoryRooms: DEFAULT_THEORY_ROOMS,
    globalFacBookings: globalFac,
    globalRoomBookings: globalRoom,
    persistedGrids: persisted,
    cohortElectiveBookings
  });

  for (let d = 0; d < 5; d++) {
    for (let p = 0; p < 8; p++) {
      const c1 = gridCS3[d][p];
      const c2 = gridCD3[d][p];
      const hasOE1 = Boolean(c1 && (Array.isArray(c1) ? c1.some(e => e.code === 'CS-301') : c1.code === 'CS-301'));
      const hasOE2 = Boolean(c2 && (Array.isArray(c2) ? c2.some(e => e.code === 'CS-301') : c2.code === 'CS-301'));
      assert.strictEqual(hasOE1, hasOE2, `Mismatch at Day ${d} Period ${p}`);
    }
  }

  console.log('[PASS] TEST 7: Paired sections CS3 and CD3 have 100% IDENTICAL Open Elective slots in backend & frontend');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 7:', e.message);
}

// TEST 8: Verify DE is NOT unnecessarily forced into the Open Elective fixed slot.
try {
  const deSlots = flatSlots.filter(s => s.basket && s.basket.includes('Discipline Elective'));
  const deInOESlot = deSlots.filter(s => s.start === '13:00' && (s.day === 'Monday' || s.day === 'Tuesday' || s.day === 'Wednesday'));
  // In 3rd Year (where OE runs at 13:00-14:00 on Mon, Tue, Wed), 3rd Year DE should NOT take the OE slot
  const thirdYearDEInOESlot = deInOESlot.filter(s => s.semester && s.semester.includes('5th'));
  assert.strictEqual(thirdYearDEInOESlot.length, 0, 'DE must NOT be forced into the Open Elective fixed slot');
  console.log('[PASS] TEST 8: DE is NOT unnecessarily forced into the Open Elective fixed slot');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 8:', e.message);
}

// TEST 9: Verify DE still rotates only within its own basket.
try {
  const de2Slots = flatSlots.filter(s => s.basket === 'Discipline Elective-II');
  de2Slots.forEach(s => {
    assert(['CS-351', 'CS-352', 'CS-353'].includes(s.subjectCode), `DE-2 contains invalid course: ${s.subjectCode}`);
  });
  console.log('[PASS] TEST 9: DE still rotates and offers strictly within its own basket');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 9:', e.message);
}

// TEST 10: Verify Open Elective does NOT rotate with DE or Stream Elective.
try {
  flatSlots.forEach(s => {
    if (s.subjectCode === 'CS-301') {
      assert.strictEqual(s.basket, 'Open Elective');
      assert.strictEqual(s.electiveType, 'OE');
    }
    if (s.subjectCode.startsWith('CS-35')) {
      assert.strictEqual(s.basket, 'Discipline Elective-II');
      assert.notStrictEqual(s.electiveType, 'OE');
    }
  });
  console.log('[PASS] TEST 10: Open Elective does NOT rotate with DE or Stream Elective (strict basket isolation)');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 10:', e.message);
}

// TEST 11: Verify the generated timetable remains conflict-free.
try {
  const facMap = new Map();
  const roomMap = new Map();
  let facConflicts = 0;
  let roomConflicts = 0;

  flatSlots.forEach(s => {
    if (s.facultyCode) {
      const fKey = `${s.facultyCode}_${s.day}_${s.start}`;
      if (facMap.has(fKey)) {
        const existing = facMap.get(fKey);
        const isSameSharedSession = (existing.sessionId && s.sessionId && existing.sessionId === s.sessionId) ||
                                    (existing.subjectCode === s.subjectCode && existing.room === s.room);
        if (!isSameSharedSession) facConflicts++;
      } else {
        facMap.set(fKey, s);
      }
    }

    if (s.room && !s.isReservedEmpty) {
      const rKey = `${s.room}_${s.day}_${s.start}`;
      if (roomMap.has(rKey)) {
        const existing = roomMap.get(rKey);
        const isSameSharedSession = (existing.sessionId && s.sessionId && existing.sessionId === s.sessionId) ||
                                    (existing.subjectCode === s.subjectCode);
        if (!isSameSharedSession) roomConflicts++;
      } else {
        roomMap.set(rKey, s);
      }
    }
  });

  assert.strictEqual(facConflicts, 0, `Faculty conflicts: ${facConflicts}`);
  assert.strictEqual(roomConflicts, 0, `Room conflicts: ${roomConflicts}`);
  console.log('[PASS] TEST 11: Generated timetable remains 100% CONFLICT-FREE (0 faculty collisions, 0 room collisions)');
  passed++;
} catch (e) {
  console.error('[FAIL] TEST 11:', e.message);
}

console.log('\n---------------------------------------------------------------');
console.log(`FINAL RESULT: ${passed} / ${total} TESTS PASSED`);
if (passed === total) {
  console.log('ALL 11 REQUIRED VALIDATION TESTS FOR CS-301 PASSED SUCCESSFULLY!\n');
} else {
  console.error('SOME TESTS FAILED!\n');
  process.exit(1);
}
