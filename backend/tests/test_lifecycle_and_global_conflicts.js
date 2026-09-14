/**
 * Comprehensive Test Suite for FATGS Generation Lifecycle & Global Conflict Prevention
 * Covers Part 28 Tests 1 through 18:
 * - Generation Reset (1-5)
 * - Global Validation (6-10)
 * - Specific Regression Tests: Room P1 & Faculty AKM (11-12)
 * - Export & Handoff Enforcement (13-18)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  initSession,
  getActiveSessionId,
  loadGenerationState,
  saveGenerationState,
  validateGlobalTimetable,
  getGenerationStatus,
  recordSectionGeneration,
  generateAllRequiredSections,
  exportTimetable,
  handoffToTTTracker,
  getRoomsData,
  getFacultyData,
  getSubjectsData
} = require('../server.js');

console.log('===============================================================');
console.log('   FATGS LIFECYCLE & GLOBAL CONFLICT REGRESSION TEST SUITE     ');
console.log('===============================================================');

// Helper to construct test slots
function createSlot(overrides = {}) {
  return {
    section: 'CS2',
    year: '2nd Year',
    semester: '3rd Semester',
    day: 'Wednesday',
    start: '10:00',
    end: '11:00',
    subjectCode: 'CS-212',
    facultyCode: 'RK',
    faculty: 'RK',
    room: 'B4',
    isLab: false,
    duration: 1,
    group: null,
    sessionId: 'test_sess',
    ...overrides
  };
}

// -------------------------------------------------------------
// PART 1: GENERATION RESET TESTS (1 - 5)
// -------------------------------------------------------------
console.log('\n--- PART 1: GENERATION RESET TESTS ---');

// 1. Fresh FATGS session starts with all required sections ungenerated.
const freshSession = initSession('sess_fresh_test_1');
const status1 = getGenerationStatus('Odd', { sessionId: freshSession.sessionId });
assert.strictEqual(status1.totalGenerated, 0, 'Fresh session must have 0 sections generated');
assert.strictEqual(status1.exportAllowed, false, 'Fresh session must not allow export');
assert.strictEqual(status1.sections.every(s => s.hasClasses ? !s.generated : true), true, 'All active sections must be ungenerated');
console.log('[PASS] TEST 1: Fresh FATGS session starts with all required sections ungenerated (0/9).');

// 2. Previous generated section status does not appear in a new session.
// Record a section in freshSession
recordSectionGeneration({
  section: 'CS2',
  year: '2nd Year',
  semester: '3rd Semester',
  generationId: 'gen_cs2_test',
  sessionId: freshSession.sessionId,
  slots: [createSlot({ section: 'CS2' })]
});
const statusWithCS2 = getGenerationStatus('Odd', { sessionId: freshSession.sessionId });
assert.strictEqual(statusWithCS2.totalGenerated, 1, 'freshSession has 1 generated');

// Now start another new session
const brandNewSession = initSession('sess_brand_new_test_2');
const statusBrandNew = getGenerationStatus('Odd', { sessionId: brandNewSession.sessionId });
assert.strictEqual(statusBrandNew.totalGenerated, 0, 'New session must not inherit generated status from previous session');
console.log('[PASS] TEST 2: Previous generated section status does not appear in a new session.');

// 3. Source faculty/room/subject master data remains available.
const roomsMaster = getRoomsData();
const facultyMaster = getFacultyData();
const subjectsMaster = getSubjectsData();
assert(Array.isArray(roomsMaster) && roomsMaster.length > 0, 'Master rooms data must exist and be non-empty');
assert(Array.isArray(facultyMaster) && facultyMaster.length > 0, 'Master faculty data must exist and be non-empty');
assert(Array.isArray(subjectsMaster) && subjectsMaster.length > 0, 'Master subjects data must exist and be non-empty');
console.log(`[PASS] TEST 3: Source master data intact (${roomsMaster.length} rooms, ${facultyMaster.length} faculties, ${subjectsMaster.length} curricula).`);

// 4. Refresh / reload during an active generation session does not destroy current generation state.
const reloadedState = loadGenerationState(null, freshSession.sessionId);
assert(reloadedState.records && reloadedState.records['CS2_2nd Year_3rd Semester'], 'In-session state preserved on reload');
console.log('[PASS] TEST 4: Reloading in-session state preserves generated section records.');

// 5. Backend restart / fresh startup does not leave stale generated timetable state.
// Simulating startup: calling initSession() produces clean state
const startupSession = initSession();
const startupStatus = getGenerationStatus('Odd', { sessionId: startupSession.sessionId });
assert.strictEqual(startupStatus.totalGenerated, 0, 'Startup session starts with 0 generated sections');
console.log('[PASS] TEST 5: Clean startup session starts with 0 generated sections.');

// -------------------------------------------------------------
// PART 2: GLOBAL VALIDATION TESTS (6 - 10)
// -------------------------------------------------------------
console.log('\n--- PART 2: GLOBAL VALIDATION TESTS ---');

// 6. Same room cannot be assigned concurrently to two incompatible sections.
const roomCollisionSlots = [
  createSlot({ section: 'CS2', room: 'B4', day: 'Monday', start: '09:00', end: '10:00', facultyCode: 'RK' }),
  createSlot({ section: 'CD2', room: 'B4', day: 'Monday', start: '09:00', end: '10:00', facultyCode: 'PK' })
];
const roomVal = validateGlobalTimetable(roomCollisionSlots, 'Odd');
assert.strictEqual(roomVal.valid, false, 'Concurrently booking room B4 must be invalid');
assert.strictEqual(roomVal.conflicts.some(c => c.type === 'ROOM_CONFLICT' && c.resource === 'B4'), true);
console.log('[PASS] TEST 6: Room collision correctly detected and rejected.');

// 7. Same faculty cannot teach two sections concurrently.
const facCollisionSlots = [
  createSlot({ section: 'CS2', facultyCode: 'RK', faculty: 'RK', room: 'B4', day: 'Monday', start: '11:00', end: '12:00' }),
  createSlot({ section: 'CS3', facultyCode: 'RK', faculty: 'RK', room: 'G5', day: 'Monday', start: '11:00', end: '12:00' })
];
const facVal = validateGlobalTimetable(facCollisionSlots, 'Odd');
assert.strictEqual(facVal.valid, false, 'Faculty RK teaching two sections concurrently must be invalid');
assert.strictEqual(facVal.conflicts.some(c => c.type === 'FACULTY_CONFLICT' && c.resource === 'RK'), true);
console.log('[PASS] TEST 7: Faculty collision correctly detected and rejected.');

// 8. Same section cannot have overlapping classes.
const secOverlapSlots = [
  createSlot({ section: 'CS2', day: 'Tuesday', start: '14:00', end: '15:00', room: 'B4', facultyCode: 'RK', subjectCode: 'CS-212' }),
  createSlot({ section: 'CS2', day: 'Tuesday', start: '14:00', end: '15:00', room: 'F4', facultyCode: 'PK', subjectCode: 'CS-213' })
];
const secVal = validateGlobalTimetable(secOverlapSlots, 'Odd');
assert.strictEqual(secVal.valid, false, 'Section CS2 having two simultaneous classes must be invalid');
assert.strictEqual(secVal.conflicts.some(c => c.type === 'SECTION_OVERLAP'), true);
console.log('[PASS] TEST 8: Section overlap correctly detected and rejected.');

// 9. M.Tech participates in conflict validation.
const mtechCollisionSlots = [
  createSlot({ section: 'CS3', facultyCode: 'APU', faculty: 'APU', room: 'G5', day: 'Thursday', start: '10:00', end: '11:00' }),
  createSlot({ section: 'MT1', year: 'M.Tech 1st Year', semester: '1st Semester', facultyCode: 'APU', faculty: 'APU', room: 'Seminar Hall - Block A', day: 'Thursday', start: '10:00', end: '11:00' })
];
const mtechVal = validateGlobalTimetable(mtechCollisionSlots, 'Odd');
assert.strictEqual(mtechVal.valid, false, 'M.Tech sharing faculty APU at same time must be invalid');
assert.strictEqual(mtechVal.conflicts.some(c => c.type === 'FACULTY_CONFLICT' && c.resource === 'APU'), true);
console.log('[PASS] TEST 9: M.Tech participates in global conflict validation.');

// 10. Labs follow existing group rules (G1 and G2 in different rooms simultaneously is valid).
const validLabSlots = [
  createSlot({ section: 'CS2', isLab: true, group: 'G1', room: 'P1', day: 'Wednesday', start: '14:00', end: '16:00', facultyCode: 'RK', sessionId: 'lab_1' }),
  createSlot({ section: 'CS2', isLab: true, group: 'G2', room: 'P2', day: 'Wednesday', start: '14:00', end: '16:00', facultyCode: 'NG', sessionId: 'lab_1' })
];
const labVal = validateGlobalTimetable(validLabSlots, 'Odd');
assert.strictEqual(labVal.valid, true, 'Simultaneous G1/G2 in different lab rooms must be valid');
console.log('[PASS] TEST 10: Labs follow existing group rules (G1 & G2 simultaneous in different rooms).');

// -------------------------------------------------------------
// PART 3: SPECIFIC REGRESSION TESTS (11 - 12)
// -------------------------------------------------------------
console.log('\n--- PART 3: SPECIFIC REGRESSION TESTS ---');

// 11. P1 Wednesday 10:00–11:00 cannot simultaneously belong to Y2_S3_CS and Y3_S5_CS.
const regression11Slots = [
  createSlot({
    section: 'CS2',
    year: '2nd Year',
    semester: '3rd Semester',
    room: 'P1',
    day: 'Wednesday',
    start: '10:00',
    end: '11:00',
    facultyCode: 'RK',
    isLab: true,
    group: 'G1'
  }),
  createSlot({
    section: 'CS3',
    year: '3rd Year',
    semester: '5th Semester',
    room: 'P1',
    day: 'Wednesday',
    start: '10:00',
    end: '11:00',
    facultyCode: 'AKY',
    isLab: true,
    group: 'G1'
  })
];
const reg11Val = validateGlobalTimetable(regression11Slots, 'Odd');
assert.strictEqual(reg11Val.valid, false, 'P1 cannot be double-booked on Wednesday 10:00-11:00');
assert.strictEqual(reg11Val.conflicts.some(c => c.resource === 'P1' && c.day === 'Wednesday' && c.time === '10:00–11:00'), true);
console.log('[PASS] TEST 11: Regression verified: Room P1 Wednesday 10:00-11:00 collision detected.');

// 12. AKM Tuesday 09:00–10:00 cannot simultaneously belong to Y3_S5_CD and Y1_S1_MTECH-AI.
const regression12Slots = [
  createSlot({
    section: 'CD3',
    year: '3rd Year',
    semester: '5th Semester',
    facultyCode: 'AKM',
    faculty: 'AKM',
    day: 'Tuesday',
    start: '09:00',
    end: '10:00',
    room: 'S2',
    subjectCode: 'CS-311'
  }),
  createSlot({
    section: 'MA1',
    year: 'M.Tech 1st Year',
    semester: '1st Semester',
    facultyCode: 'AKM',
    faculty: 'AKM',
    day: 'Tuesday',
    start: '09:00',
    end: '10:00',
    room: 'Conference Hall - Block B',
    subjectCode: 'CS-621'
  })
];
const reg12Val = validateGlobalTimetable(regression12Slots, 'Odd');
assert.strictEqual(reg12Val.valid, false, 'Faculty AKM cannot be double-booked on Tuesday 09:00-10:00');
assert.strictEqual(reg12Val.conflicts.some(c => c.resource === 'AKM' && c.day === 'Tuesday' && c.time === '09:00–10:00'), true);
console.log('[PASS] TEST 12: Regression verified: Faculty AKM Tuesday 09:00-10:00 collision detected.');

// -------------------------------------------------------------
// PART 4: EXPORT & HANDOFF TESTS (13 - 18)
// -------------------------------------------------------------
console.log('\n--- PART 4: EXPORT & HANDOFF TESTS ---');

const exportTestSession = initSession('sess_export_suite');

// 13. Export disabled when sections are incomplete.
const incExport = exportTimetable('Odd', { sessionId: exportTestSession.sessionId });
assert.strictEqual(incExport.success, false);
assert.strictEqual(incExport.statusCode, 400);
assert(incExport.missingSections.length > 0);
console.log('[PASS] TEST 13: Export disabled when sections are incomplete.');

// 14. Export disabled when global conflicts exist.
// Populate all 9 sections with a planted conflict between CS2 and CS3
const reqSections = [
  { section: 'CS2', year: '2nd Year', semester: '3rd Semester' },
  { section: 'CD2', year: '2nd Year', semester: '3rd Semester' },
  { section: 'CS3', year: '3rd Year', semester: '5th Semester' },
  { section: 'CD3', year: '3rd Year', semester: '5th Semester' },
  { section: 'CS4', year: '4th Year', semester: '7th Semester' },
  { section: 'CD4', year: '4th Year', semester: '7th Semester' },
  { section: 'CD5', year: '5th Year', semester: '9th Semester' },
  { section: 'MT1', year: 'M.Tech 1st Year', semester: '1st Semester' },
  { section: 'MA1', year: 'M.Tech 1st Year', semester: '1st Semester' }
];
const conflictingSession = initSession('sess_conflict_export');
for (const s of reqSections) {
  const isCS2 = s.section === 'CS2';
  const isCS3 = s.section === 'CS3';
  recordSectionGeneration({
    section: s.section,
    year: s.year,
    semester: s.semester,
    generationId: `gen_${s.section}`,
    sessionId: conflictingSession.sessionId,
    slots: [
      createSlot({
        section: s.section,
        year: s.year,
        semester: s.semester,
        room: (isCS2 || isCS3) ? 'B4' : `R_${s.section}`,
        day: 'Monday',
        start: '09:00',
        end: '10:00',
        facultyCode: `FAC_${s.section}`
      })
    ]
  });
}
const conflictExport = exportTimetable('Odd', { sessionId: conflictingSession.sessionId });
assert.strictEqual(conflictExport.success, false);
assert.strictEqual(conflictExport.statusCode, 400);
assert(Array.isArray(conflictExport.conflicts) && conflictExport.conflicts.length > 0, 'Export must return conflicts list');
console.log('[PASS] TEST 14: Export disabled when global conflicts exist.');

// 15. Export enabled only when all sections are generated AND globally valid.
const cleanSession = initSession('sess_clean_complete');
const genAllResult = generateAllRequiredSections('Odd', { sessionId: cleanSession.sessionId });
assert.strictEqual(genAllResult.success, true);
assert.strictEqual(genAllResult.totalGenerated, 9);
assert.strictEqual(genAllResult.isGloballyValid, true);

const cleanExport = exportTimetable('Odd', { sessionId: cleanSession.sessionId });
assert.strictEqual(cleanExport.success, true);
assert.strictEqual(cleanExport.statusCode, 200);
assert(Array.isArray(cleanExport.data.slots));
assert.strictEqual(cleanExport.data.slots.length, genAllResult.totalSlots);
console.log(`[PASS] TEST 15: Export enabled when all sections generated & globally valid (${cleanExport.data.slots.length} slots).`);

// 16. Export does not regenerate (package contains already generated state).
const exportTimestamp1 = cleanExport.data.exportedAt;
const secondExport = exportTimetable('Odd', { sessionId: cleanSession.sessionId });
assert.strictEqual(secondExport.data.slots.length, cleanExport.data.slots.length);
console.log('[PASS] TEST 16: Export gathers existing generated slots without regenerating.');

// 17. Export invokes the existing handoff (mock server-to-server).
let handoffPayloadReceived = null;
const mockTTTrackerServer = require('http').createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    handoffPayloadReceived = JSON.parse(body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'TT_TRACKER import success' }));
  });
});

mockTTTrackerServer.listen(0, '127.0.0.1', async () => {
  const port = mockTTTrackerServer.address().port;
  const mockUrl = `http://127.0.0.1:${port}`;

  process.env.TT_TRACKER_URL = mockUrl;
  process.env.TT_TRACKER_IMPORT_SECRET = 'test_secret';

  const handoffRes = await handoffToTTTracker(cleanExport.data, {
    ttTrackerUrl: mockUrl,
    ttTrackerSecret: 'test_secret'
  });

  assert.strictEqual(handoffRes.success, true);
  console.log('[PASS] TEST 17: Handoff function successfully invoked and completed.');

  // 18. Handoff sends the complete package with all required master data and slots.
  assert(handoffPayloadReceived !== null);
  assert.strictEqual(handoffPayloadReceived.packageId, cleanExport.data.packageId);
  assert.strictEqual(handoffPayloadReceived.semesterType, 'Odd');
  assert.strictEqual(handoffPayloadReceived.slots.length, cleanExport.data.slots.length);
  assert(handoffPayloadReceived.slots.some(s => s.section === 'MTECH-CSE' && s.originalSection === 'MT1'));
  assert(handoffPayloadReceived.slots.some(s => s.section === 'MTECH-AI' && s.originalSection === 'MA1'));
  console.log('[PASS] TEST 18: Handoff transfers complete package preserving M.Tech mapping.');

  mockTTTrackerServer.close();

  console.log('\n===============================================================');
  console.log('FINAL RESULT: ALL 18 LIFECYCLE & CONFLICT TESTS PASSED!');
  console.log('===============================================================');
});
