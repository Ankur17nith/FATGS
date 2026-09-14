/**
 * FATGS Test Suite: Backend-Driven Generation Completeness, Semester-Scoped Lifecycle & M.Tech Support
 *
 * Validates:
 *  1. Data-driven required section evaluation based on actual subjects data:
 *     - Odd Semester: 9 sections (CS2, CD2, CS3, CD3, CS4, CD4, CD5, MT1, MA1).
 *     - Even Semester: 6 sections (CS2, CD2, CS3, CD3, CS4, CD4).
 *  2. Sections with zero classes do NOT block completion.
 *  3. Initial generation status reports ungenerated sections and export blocked.
 *  4. Incomplete export requests are independently rejected by the backend (HTTP 400).
 *  5. Failed generation payloads are rejected and do not create false state.
 *  6. M.Tech handling (MT1 and MA1 independent tracking):
 *     - MT1 generated, MA1 not -> incomplete.
 *     - MA1 generated, MT1 not -> incomplete.
 *     - Both MT1 and MA1 generated -> M.Tech requirement satisfied.
 *     - All B.Tech generated but 1 M.Tech missing -> export disabled.
 *  7. All 9 Odd Semester sections generated -> export enabled.
 *  8. Semester Switch Workflow:
 *     - Odd Semester complete (9/9) -> export allowed.
 *     - Switch to Even Semester -> Odd generation records do NOT count for Even (0/6 generated).
 *     - Even Semester export is disabled.
 *     - Generate all 6 Even Semester sections -> export enabled for Even Semester.
 *     - Export Even Semester -> contains ONLY Even Semester data.
 *     - Switch back to Odd Semester -> previous Odd generation records are preserved intact (9/9).
 *  9. Export JSON returns previously generated slots without calling any scheduler.
 * 10. Generation state is persistent on disk across server reloads.
 * 11. Stale / reset generations correctly invalidate export readiness.
 * 12. Regenerating one M.Tech section updates its identity without overwriting the other.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  createServer,
  getRequiredSections,
  getGenerationStatus,
  recordSectionGeneration,
  resetGeneration,
  exportTimetable
} = require('../server.js');

console.log('===============================================================');
console.log('   FATGS GENERATION COMPLETENESS & SEMESTER-SCOPED TESTS       ');
console.log('===============================================================');

function makeRequest(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const headers = {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers
      },
      res => {
        let raw = '';
        res.on('data', chunk => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = raw;
          }
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function mockSlot(secName, year, sem, subCode, room = null, fac = null, day = 'Monday', start = '09:00', end = '10:00') {
  const chosenRoom = room || (secName === 'CD5' ? 'CSE-III' : (secName === 'MT1' ? 'Seminar Hall - Block A' : (secName === 'MA1' ? 'Conference Hall - Block B' : `ROOM_${secName}`)));
  const chosenFac = fac || `FAC_${secName}`;
  return {
    section: secName,
    year: year,
    semester: sem,
    day: day,
    start: start,
    end: end,
    subjectCode: subCode,
    facultyCode: chosenFac,
    faculty: chosenFac,
    room: chosenRoom,
    isLab: false,
    duration: 1,
    group: null,
    sessionId: `${secName}_${subCode}_${day}_${start}`,
    electiveType: null,
    basket: null,
    isReservedEmpty: false
  };
}

async function runTests() {
  const testDir = path.join(__dirname, '../output/test_scratch');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  const testStatePath = path.join(testDir, 'test_generation_state.json');
  if (fs.existsSync(testStatePath)) fs.unlinkSync(testStatePath);

  // --- 1. AUDITING REQUIRED SECTIONS (DATA-DRIVEN) ---
  console.log('\n--- 1. AUDITING REQUIRED SECTIONS (DATA-DRIVEN: ODD & EVEN) ---');
  const oddRequired = getRequiredSections('Odd Semester');
  const oddNames = oddRequired.map(s => s.name);
  console.log('Odd Semester detected sections (9):', oddNames);
  assert.deepStrictEqual(
    oddNames.sort(),
    ['CD2', 'CD3', 'CD4', 'CD5', 'CS2', 'CS3', 'CS4', 'MA1', 'MT1'].sort(),
    'Odd Semester must require CS2, CD2, CS3, CD3, CS4, CD4, CD5, MT1, MA1'
  );
  assert.ok(oddRequired.every(s => s.hasClasses === true));
  console.log('[PASS] TEST 1A: Odd Semester requires 9 sections (7 B.Tech/Dual + 2 M.Tech).');

  const evenRequired = getRequiredSections('Even Semester');
  const evenNames = evenRequired.map(s => s.name);
  console.log('Even Semester detected sections (6):', evenNames);
  assert.deepStrictEqual(
    evenNames.sort(),
    ['CD2', 'CD3', 'CD4', 'CS2', 'CS3', 'CS4'].sort(),
    'Even Semester must require CS2, CD2, CS3, CD3, CS4, CD4'
  );
  console.log('[PASS] TEST 1B: Even Semester requires 6 sections (excludes CD5, MT1, MA1).');

  // --- 2. AUDITING SECTIONS WITH ZERO CLASSES ---
  console.log('\n--- 2. AUDITING ZERO-CLASS SECTIONS ---');
  const mockSubjects = [
    {
      name: 'CS2',
      year: '2nd Year',
      semester: '3rd Semester',
      subjects: [{ code: 'CS-212' }],
      labs: [],
      electives: []
    },
    {
      name: 'EMPTY_SEC',
      year: '2nd Year',
      semester: '3rd Semester',
      subjects: [],
      labs: [],
      electives: []
    }
  ];
  const customReq = getRequiredSections('Odd Semester', mockSubjects);
  assert.strictEqual(customReq.length, 2);
  const emptySec = customReq.find(s => s.name === 'EMPTY_SEC');
  assert.strictEqual(emptySec.hasClasses, false);

  const customStatus = getGenerationStatus('Odd Semester', {
    subjectsData: mockSubjects,
    statePath: testStatePath
  });
  assert.strictEqual(customStatus.totalRequired, 1);
  console.log('[PASS] TEST 2: Section with 0 classes does NOT block completion.');

  // --- 3. SERVER INITIALIZATION WITH ISOLATED TEST STATE ---
  console.log('\n--- 3. TESTING INITIAL SERVER GENERATION STATUS ---');
  const server = createServer({ statePath: testStatePath });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const initStatus = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(initStatus.statusCode, 200);
  assert.strictEqual(initStatus.body.totalRequired, 9);
  assert.strictEqual(initStatus.body.totalGenerated, 0);
  assert.strictEqual(initStatus.body.allRequiredGenerated, false);
  assert.strictEqual(initStatus.body.exportAllowed, false);
  console.log('[PASS] TEST 3: Initial Odd status correctly reports 0/9 generated, exportAllowed = false.');

  // --- 4. BACKEND INDEPENDENTLY REJECTS INCOMPLETE EXPORT ---
  console.log('\n--- 4. TESTING INCOMPLETE EXPORT REJECTION (HTTP 400) ---');
  const exportRes = await makeRequest(port, '/api/timetable/export?semester=Odd%20Semester');
  assert.strictEqual(exportRes.statusCode, 400);
  assert.strictEqual(exportRes.body.success, false);
  assert.ok(exportRes.body.error.includes('Base timetable generation is incomplete'));
  assert.strictEqual(exportRes.body.missingSections.length, 9);
  console.log('[PASS] TEST 4: Export independently rejected by backend with HTTP 400 and list of missing sections.');

  // --- 5. FAILED / INVALID GENERATION DOES NOT RECORD SUCCESS ---
  console.log('\n--- 5. TESTING REJECTION OF FAILED / EMPTY GENERATION ---');
  const failRes = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'CS2',
    year: '2nd Year',
    semester: '3rd Semester',
    slots: []
  });
  assert.strictEqual(failRes.statusCode, 400);
  assert.strictEqual(failRes.body.success, false);

  const statusAfterFail = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusAfterFail.body.totalGenerated, 0);
  const cs2Status = statusAfterFail.body.sections.find(s => s.name === 'CS2');
  assert.strictEqual(cs2Status.generated, false);
  console.log('[PASS] TEST 5: Empty/failed generation rejected and CS2 remains marked as NOT generated.');

  // --- 6. M.TECH INDEPENDENT GENERATION TRACKING ---
  console.log('\n--- 6. TESTING M.TECH SECTIONS GENERATION & COMPLETENESS ---');
  // Record MT1 only
  const recMT1 = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'MT1',
    year: 'M.Tech 1st Year',
    semester: '1st Semester',
    generationId: 'gen_MT1_v1',
    slots: [mockSlot('MT1', 'M.Tech 1st Year', '1st Semester', 'CS-611', 'Seminar Hall - Block A')]
  });
  assert.strictEqual(recMT1.statusCode, 200);

  const statusMT1 = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  const mt1Item = statusMT1.body.sections.find(s => s.name === 'MT1');
  const ma1Item = statusMT1.body.sections.find(s => s.name === 'MA1');
  assert.strictEqual(mt1Item.generated, true);
  assert.strictEqual(ma1Item.generated, false);
  assert.strictEqual(statusMT1.body.exportAllowed, false);
  console.log('[PASS] TEST 6A: MT1 generated, MA1 ungenerated -> Export remains disabled.');

  // Record MA1
  const recMA1 = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'MA1',
    year: 'M.Tech 1st Year',
    semester: '1st Semester',
    generationId: 'gen_MA1_v1',
    slots: [mockSlot('MA1', 'M.Tech 1st Year', '1st Semester', 'CS-621', 'Conference Hall - Block B')]
  });
  assert.strictEqual(recMA1.statusCode, 200);

  const statusBothMT = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusBothMT.body.sections.find(s => s.name === 'MT1').generated, true);
  assert.strictEqual(statusBothMT.body.sections.find(s => s.name === 'MA1').generated, true);
  assert.strictEqual(statusBothMT.body.totalGenerated, 2);
  assert.strictEqual(statusBothMT.body.exportAllowed, false); // Still missing 7 B.Tech sections
  console.log('[PASS] TEST 6B: Both MT1 and MA1 recorded independently; 7 B.Tech sections still required.');

  // --- 7. COMPLETE ODD SEMESTER GENERATION ---
  console.log('\n--- 7. GENERATING REMAINING B.TECH ODD SEMESTER SECTIONS ---');
  const oddBTech = [
    { name: 'CS2', year: '2nd Year', sem: '3rd Semester' },
    { name: 'CD2', year: '2nd Year', sem: '3rd Semester' },
    { name: 'CS3', year: '3rd Year', sem: '5th Semester' },
    { name: 'CD3', year: '3rd Year', sem: '5th Semester' },
    { name: 'CS4', year: '4th Year', sem: '7th Semester' },
    { name: 'CD4', year: '4th Year', sem: '7th Semester' },
    { name: 'CD5', year: '5th Year', sem: '9th Semester' }
  ];

  for (const s of oddBTech) {
    const r = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
      section: s.name,
      year: s.year,
      semester: s.sem,
      generationId: `gen_${s.name}_v1`,
      slots: [mockSlot(s.name, s.year, s.sem, `SUB-${s.name}`)]
    });
    assert.strictEqual(r.statusCode, 200);
  }

  const fullOddStatus = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(fullOddStatus.body.totalRequired, 9);
  assert.strictEqual(fullOddStatus.body.totalGenerated, 9);
  assert.strictEqual(fullOddStatus.body.allRequiredGenerated, true);
  assert.strictEqual(fullOddStatus.body.exportAllowed, true);
  console.log('[PASS] TEST 7: All 9 Odd Semester sections generated (including MT1 & MA1) -> Export JSON ENABLED.');

  // Verify Odd Semester Export Content
  const oddExport = await makeRequest(port, '/api/timetable/export?semester=Odd%20Semester');
  assert.strictEqual(oddExport.statusCode, 200);
  assert.strictEqual(oddExport.body.semester, 'Odd');
  assert.strictEqual(oddExport.body.semesterType, 'Odd');
  assert.strictEqual(oddExport.body.sections.length, 9);
  const oddSecNames = oddExport.body.sections.map(s => typeof s === 'string' ? s : (s.originalSection || s.section));
  assert.ok(oddSecNames.includes('MT1'));
  assert.ok(oddSecNames.includes('MA1'));
  assert.ok(oddExport.body.timetable.some(s => s.section === 'MT1' && s.room === 'Seminar Hall - Block A'));
  assert.ok(oddExport.body.timetable.some(s => s.section === 'MA1' && s.room === 'Conference Hall - Block B'));
  console.log('[PASS] TEST 7B: Odd export package includes all 9 sections and preserves distinct MT1 & MA1 data.');

  // --- 8. SEMESTER SWITCH TEST (ODD -> EVEN -> ODD) ---
  console.log('\n--- 8. TESTING SEMESTER SWITCH WORKFLOW (ODD -> EVEN -> ODD) ---');
  // Switch to Even Semester: Odd records must NOT count toward Even Semester!
  const evenStatus = await makeRequest(port, '/api/timetable/generation-status?semester=Even%20Semester');
  assert.strictEqual(evenStatus.statusCode, 200);
  assert.strictEqual(evenStatus.body.semester, 'Even');
  assert.strictEqual(evenStatus.body.semesterType, 'Even');
  assert.strictEqual(evenStatus.body.totalRequired, 6);
  assert.strictEqual(evenStatus.body.totalGenerated, 0); // None of the Even sections have been generated!
  assert.strictEqual(evenStatus.body.allRequiredGenerated, false);
  assert.strictEqual(evenStatus.body.exportAllowed, false);
  console.log('[PASS] TEST 8A: Switch to Even Semester: Odd records do NOT count for Even (0/6 generated).');

  // Even export must be rejected by backend with 400
  const evenExportBlocked = await makeRequest(port, '/api/timetable/export?semester=Even%20Semester');
  assert.strictEqual(evenExportBlocked.statusCode, 400);
  assert.strictEqual(evenExportBlocked.body.missingSections.length, 6);
  console.log('[PASS] TEST 8B: Even Semester export rejected because Even sections are ungenerated.');

  // Generate all 6 Even Semester sections
  const evenSectionsList = [
    { name: 'CS2', year: '2nd Year', sem: '4th Semester' },
    { name: 'CD2', year: '2nd Year', sem: '4th Semester' },
    { name: 'CS3', year: '3rd Year', sem: '6th Semester' },
    { name: 'CD3', year: '3rd Year', sem: '6th Semester' },
    { name: 'CS4', year: '4th Year', sem: '8th Semester' },
    { name: 'CD4', year: '4th Year', sem: '8th Semester' }
  ];

  for (const s of evenSectionsList) {
    const r = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
      section: s.name,
      year: s.year,
      semester: s.sem,
      generationId: `gen_${s.name}_even_v1`,
      slots: [mockSlot(s.name, s.year, s.sem, `EVEN-SUB-${s.name}`)]
    });
    if (r.statusCode !== 200) {
      console.error('[DEBUG EVEN RECORD ERROR]:', r.statusCode, r.body);
    }
    assert.strictEqual(r.statusCode, 200);
  }

  const evenStatusFull = await makeRequest(port, '/api/timetable/generation-status?semester=Even%20Semester');
  assert.strictEqual(evenStatusFull.body.totalRequired, 6);
  assert.strictEqual(evenStatusFull.body.totalGenerated, 6);
  assert.strictEqual(evenStatusFull.body.semester, 'Even');
  assert.strictEqual(evenStatusFull.body.semesterType, 'Even');
  assert.strictEqual(evenStatusFull.body.exportAllowed, true);
  console.log('[PASS] TEST 8C: All 6 Even Semester sections generated -> Even Export JSON ENABLED.');

  // Export Even Semester: package must contain ONLY Even Semester data!
  const evenExport = await makeRequest(port, '/api/timetable/export?semester=Even%20Semester');
  assert.strictEqual(evenExport.statusCode, 200);
  assert.strictEqual(evenExport.body.semester, 'Even');
  assert.strictEqual(evenExport.body.semesterType, 'Even');
  assert.strictEqual(evenExport.body.sections.length, 6);
  assert.strictEqual(evenExport.body.totalSlots, 6);
  // Zero Odd semester slots in Even export!
  assert.ok(evenExport.body.timetable.every(s => s.semester.includes('4th') || s.semester.includes('6th') || s.semester.includes('8th')));
  const evenSecNames = evenExport.body.sections.map(s => typeof s === 'string' ? s : (s.originalSection || s.section));
  assert.ok(!evenSecNames.includes('CD5'));
  assert.ok(!evenSecNames.includes('MT1'));
  assert.ok(!evenSecNames.includes('MA1'));
  console.log('[PASS] TEST 8D: Even Semester export contains ONLY Even Semester data (zero Odd slots, zero M.Tech slots).');

  // Switch BACK to Odd Semester: verify previous Odd Semester generation state is preserved!
  const switchBackOdd = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(switchBackOdd.body.totalRequired, 9);
  assert.strictEqual(switchBackOdd.body.totalGenerated, 9);
  assert.strictEqual(switchBackOdd.body.allRequiredGenerated, true);
  assert.strictEqual(switchBackOdd.body.exportAllowed, true);
  assert.strictEqual(switchBackOdd.body.semester, 'Odd');
  assert.strictEqual(switchBackOdd.body.semesterType, 'Odd');
  console.log('[PASS] TEST 8E: Switch back to Odd Semester: All 9 Odd Semester records PRESERVED intact.');

  // --- 9. RE-GENERATION OF M.TECH SECTION PRESERVES DISTINCT STATE ---
  console.log('\n--- 9. TESTING RE-GENERATING ONE M.TECH SECTION ---');
  const reGenMT1 = await makeRequest(port, '/api/timetable/record-generation', 'POST', {
    section: 'MT1',
    year: 'M.Tech 1st Year',
    semester: '1st Semester',
    generationId: 'gen_MT1_v2_REGENERATED',
    slots: [
      mockSlot('MT1', 'M.Tech 1st Year', '1st Semester', 'CS-611', 'Seminar Hall - Block A', 'FAC_MT1', 'Monday', '09:00', '10:00'),
      mockSlot('MT1', 'M.Tech 1st Year', '1st Semester', 'CS-612', 'Seminar Hall - Block A', 'FAC_MT1', 'Monday', '10:00', '11:00')
    ]
  });
  assert.strictEqual(reGenMT1.statusCode, 200);

  const statusAfterReGen = await makeRequest(port, '/api/timetable/generation-status?semester=Odd%20Semester');
  const mt1Updated = statusAfterReGen.body.sections.find(s => s.name === 'MT1');
  const ma1Untouched = statusAfterReGen.body.sections.find(s => s.name === 'MA1');
  assert.strictEqual(mt1Updated.generationId, 'gen_MT1_v2_REGENERATED');
  assert.strictEqual(mt1Updated.slotCount, 2);
  assert.strictEqual(ma1Untouched.generationId, 'gen_MA1_v1'); // MA1 untouched
  assert.strictEqual(ma1Untouched.slotCount, 1);
  console.log('[PASS] TEST 9: Regenerating MT1 updated its state without overwriting MA1.');

  // --- 10. DISK PERSISTENCE ACROSS SERVER RESTART ---
  console.log('\n--- 10. TESTING DISK PERSISTENCE ACROSS SERVER RESTART ---');
  await new Promise(resolve => server.close(resolve));

  const server2 = createServer({ statePath: testStatePath });
  await new Promise(resolve => server2.listen(0, '127.0.0.1', resolve));
  const port2 = server2.address().port;

  const statusRestartOdd = await makeRequest(port2, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(statusRestartOdd.body.totalGenerated, 9);
  assert.strictEqual(statusRestartOdd.body.exportAllowed, true);

  const statusRestartEven = await makeRequest(port2, '/api/timetable/generation-status?semester=Even%20Semester');
  assert.strictEqual(statusRestartEven.body.totalGenerated, 6);
  assert.strictEqual(statusRestartEven.body.exportAllowed, true);
  console.log('[PASS] TEST 10: Both Odd (9/9) and Even (6/6) generation records reloaded from disk cleanly.');

  // --- 11. RESETTING A SPECIFIC SECTION ---
  console.log('\n--- 11. TESTING SECTION RESET & EXPORT REVOCATION ---');
  const resetMT1 = await makeRequest(port2, '/api/timetable/reset-generation', 'POST', {
    section: 'MT1',
    year: 'M.Tech 1st Year',
    semester: '1st Semester'
  });
  assert.strictEqual(resetMT1.statusCode, 200);

  const oddAfterReset = await makeRequest(port2, '/api/timetable/generation-status?semester=Odd%20Semester');
  assert.strictEqual(oddAfterReset.body.totalGenerated, 8);
  assert.strictEqual(oddAfterReset.body.exportAllowed, false);
  assert.strictEqual(oddAfterReset.body.sections.find(s => s.name === 'MT1').generated, false);
  assert.strictEqual(oddAfterReset.body.sections.find(s => s.name === 'MA1').generated, true);

  // Even semester remains 6/6 complete and export allowed!
  const evenAfterOddReset = await makeRequest(port2, '/api/timetable/generation-status?semester=Even%20Semester');
  assert.strictEqual(evenAfterOddReset.body.totalGenerated, 6);
  assert.strictEqual(evenAfterOddReset.body.exportAllowed, true);
  console.log('[PASS] TEST 11: Resetting MT1 revokes Odd export readiness while Even Semester remains unaffected.');

  // Clean up
  await new Promise(resolve => server2.close(resolve));
  if (fs.existsSync(testStatePath)) fs.unlinkSync(testStatePath);

  console.log('\n===============================================================');
  console.log('FINAL RESULT: ALL GENERATION COMPLETENESS & SEMESTER TESTS PASSED!');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('\n[FAIL] Test failure:', err);
  process.exit(1);
});
