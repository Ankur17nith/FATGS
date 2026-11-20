/**
 * FATGS Test Suite: Faculty Time-Slot Blocking
 *
 * Validates:
 *  1. Input validation (unknown faculty, bad day, bad/inverted period range, note optional, name accepted).
 *  2. Add / list / remove, semester separation (Odd vs Even), merging of overlapping ranges.
 *  3. Generator never schedules a blocked faculty member inside a blocked range (many random runs),
 *     including range blocks and 2-hour labs.
 *  4. Blocking one faculty does not lock them out of unblocked slots.
 *  5. Global validator reports FACULTY_BLOCKED violations; clean timetables report none.
 *  6. Adding a block after generation makes the status invalid / export blocked; removing it restores it.
 *  7. generateAllRequiredSections honours blocks end to end.
 *  8. HTTP API: add, list, delete, error handling, status exposes blocks.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const fb = require('../entities/facultyBlocks.js');
const { generateBaseTimetable, toFlatSlotList } = require('../entities/baseTimetableGenerator.js');
const server = require('../server.js');

const SUBJECTS = path.join(__dirname, '../data/subjects.json');
const ROOMS = path.join(__dirname, '../data/rooms.json');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fatgs-blocks-'));
let counter = 0;
function tmpFile(name) {
  counter++;
  return path.join(tmpDir, `${counter}_${name}`);
}

let passed = 0;
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(() => { passed++; console.log(`  [PASS] ${name}`); });
    }
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}\n         ${err.message}`);
    process.exitCode = 1;
    throw err;
  }
}

function generate(blocks) {
  const sections = generateBaseTimetable(SUBJECTS, ROOMS, null, { includeMTech: true, facultyBlocks: blocks });
  return toFlatSlotList(sections);
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
      },
      res => {
        let out = '';
        res.on('data', c => (out += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(out); } catch (e) { /* leave null */ }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('===============================================================');
  console.log('            FATGS FACULTY TIME-SLOT BLOCKING TESTS             ');
  console.log('===============================================================');

  // ---------------------------------------------------------------- 1. validation
  console.log('\n--- 1. INPUT VALIDATION ---');
  test('rejects an unknown faculty member', () => {
    const r = fb.validateBlockInput({ facultyCode: 'ZZZ', day: 'Monday', startPeriod: 1, endPeriod: 2 });
    assert.strictEqual(r.ok, false);
    assert.match(r.error, /Unknown faculty/);
  });
  test('rejects an invalid day (Saturday)', () => {
    const r = fb.validateBlockInput({ facultyCode: 'KD', day: 'Saturday', startPeriod: 1 });
    assert.strictEqual(r.ok, false);
    assert.match(r.error, /Invalid day/);
  });
  test('rejects periods outside 1-8', () => {
    assert.strictEqual(fb.validateBlockInput({ facultyCode: 'KD', day: 'Monday', startPeriod: 0, endPeriod: 2 }).ok, false);
    assert.strictEqual(fb.validateBlockInput({ facultyCode: 'KD', day: 'Monday', startPeriod: 1, endPeriod: 9 }).ok, false);
    assert.strictEqual(fb.validateBlockInput({ facultyCode: 'KD', day: 'Monday', startPeriod: 'x' }).ok, false);
  });
  test('rejects an end period earlier than the start period', () => {
    const r = fb.validateBlockInput({ facultyCode: 'KD', day: 'Monday', startPeriod: 5, endPeriod: 3 });
    assert.strictEqual(r.ok, false);
  });
  test('a note is optional and a single period needs no end period', () => {
    const r = fb.validateBlockInput({ facultyCode: 'KD', day: 'Monday', startPeriod: 3 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.value.endPeriod, 3);
    assert.strictEqual(r.value.note, null);
  });
  test('faculty can be given by full name (case-insensitive)', () => {
    const r = fb.validateBlockInput({ facultyCode: 'dr kamlesh dutta', day: 'monday', startPeriod: 1 });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.value.facultyCode, 'KD');
    assert.strictEqual(r.value.day, 'Monday');
  });

  // ---------------------------------------------------------------- 2. storage
  console.log('\n--- 2. STORAGE, SEMESTER SEPARATION, MERGING ---');
  const storePath = tmpFile('blocks.json');
  test('adds and lists a block; stored per semester', () => {
    const a = fb.addBlock('Odd', { facultyCode: 'KD', day: 'Monday', startPeriod: 1, endPeriod: 2 }, { filePath: storePath });
    assert.strictEqual(a.success, true);
    assert.strictEqual(fb.listBlocks('Odd', { filePath: storePath }).length, 1);
    assert.strictEqual(fb.listBlocks('Even', { filePath: storePath }).length, 0);
  });
  test('"Odd Semester" style input maps to the Odd list', () => {
    assert.strictEqual(fb.listBlocks('Odd Semester', { filePath: storePath }).length, 1);
    assert.strictEqual(fb.listBlocks('even semester', { filePath: storePath }).length, 0);
  });
  test('overlapping range for the same faculty/day is merged into one block', () => {
    const a = fb.addBlock('Odd', { facultyCode: 'KD', day: 'Monday', startPeriod: 2, endPeriod: 4 }, { filePath: storePath });
    assert.strictEqual(a.merged, true);
    const list = fb.listBlocks('Odd', { filePath: storePath });
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].startPeriod, 1);
    assert.strictEqual(list[0].endPeriod, 4);
  });
  test('a different day or faculty creates a separate block', () => {
    fb.addBlock('Odd', { facultyCode: 'KD', day: 'Tuesday', startPeriod: 1 }, { filePath: storePath });
    fb.addBlock('Odd', { facultyCode: 'TPS', day: 'Monday', startPeriod: 1 }, { filePath: storePath });
    assert.strictEqual(fb.listBlocks('Odd', { filePath: storePath }).length, 3);
  });
  test('a range touching lunch periods (4-5) saves with a warning', () => {
    const a = fb.addBlock('Even', { facultyCode: 'KD', day: 'Friday', startPeriod: 4, endPeriod: 5 }, { filePath: storePath });
    assert.strictEqual(a.success, true);
    assert.ok(a.warnings.length > 0);
  });
  test('removes a block by id; unknown id is reported', () => {
    const list = fb.listBlocks('Odd', { filePath: storePath });
    assert.strictEqual(fb.removeBlock('Odd', list[0].id, { filePath: storePath }).success, true);
    assert.strictEqual(fb.listBlocks('Odd', { filePath: storePath }).length, 2);
    assert.strictEqual(fb.removeBlock('Odd', 'nope', { filePath: storePath }).success, false);
  });
  test('a missing or corrupt blocks file loads as empty', () => {
    assert.deepStrictEqual(fb.loadBlocks(tmpFile('missing.json')), { Odd: [], Even: [] });
    const bad = tmpFile('bad.json');
    fs.writeFileSync(bad, '{not json');
    assert.deepStrictEqual(fb.loadBlocks(bad), { Odd: [], Even: [] });
  });

  // ---------------------------------------------------------------- 3 & 4. generator
  console.log('\n--- 3. GENERATOR RESPECTS BLOCKS ---');
  const baseline = generate([]);
  const load = {};
  baseline.forEach(s => { if (s.facultyCode) load[s.facultyCode] = (load[s.facultyCode] || 0) + 1; });
  const busiest = Object.entries(load).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  assert.ok(busiest.length === 3, 'expected at least 3 teaching faculty in baseline');

  test('three busiest faculty fully blocked Mon-Tue, plus a mid-day range Wed: never scheduled there (12 random runs)', () => {
    const blocks = [];
    busiest.forEach(code => {
      blocks.push({ facultyCode: code, day: 'Monday', startPeriod: 1, endPeriod: 8 });
      blocks.push({ facultyCode: code, day: 'Tuesday', startPeriod: 1, endPeriod: 8 });
      blocks.push({ facultyCode: code, day: 'Wednesday', startPeriod: 2, endPeriod: 5 });
    });
    for (let i = 0; i < 12; i++) {
      const slots = generate(blocks);
      const violations = fb.findBlockViolations(slots, blocks);
      assert.strictEqual(violations.length, 0, `run ${i}: ${violations[0] && violations[0].message}`);
      assert.ok(slots.length > 0);
    }
  });

  test('a faculty member blocked for one day still teaches on the other days', () => {
    const code = busiest[0];
    const blocks = [{ facultyCode: code, day: 'Monday', startPeriod: 1, endPeriod: 8 }];
    const slots = generate(blocks);
    const mine = slots.filter(s => s.facultyCode === code);
    assert.ok(mine.length > 0, `${code} should still be scheduled on other days`);
    assert.ok(mine.every(s => s.day !== 'Monday'));
  });

  test('2-hour labs are not placed across a blocked period (block on a middle period)', () => {
    const labFaculty = [...new Set(baseline.filter(s => s.isLab && s.facultyCode).map(s => s.facultyCode))][0];
    assert.ok(labFaculty, 'expected a lab faculty member in baseline');
    const blocks = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
      { facultyCode: labFaculty, day, startPeriod: 3, endPeriod: 3 }
    ));
    for (let i = 0; i < 8; i++) {
      const slots = generate(blocks);
      assert.strictEqual(fb.findBlockViolations(slots, blocks).length, 0);
    }
  });

  test('generation without blocks is unchanged in shape (still produces a full timetable)', () => {
    assert.ok(baseline.length > 300);
    assert.strictEqual(fb.findBlockViolations(baseline, []).length, 0);
  });

  // ---------------------------------------------------------------- 5. validator
  console.log('\n--- 4. GLOBAL VALIDATOR ---');
  test('validator reports FACULTY_BLOCKED for a slot placed inside a blocked range', () => {
    const slot = baseline.find(s => s.facultyCode && !s.isReservedEmpty);
    const hit = [{ facultyCode: slot.facultyCode, day: slot.day, startPeriod: 1, endPeriod: 8 }];
    const res = server.validateGlobalTimetable([slot], 'Odd', hit);
    assert.strictEqual(res.valid, false);
    assert.ok(res.conflicts.some(c => c.type === 'FACULTY_BLOCKED'));
    assert.match(res.conflicts.find(c => c.type === 'FACULTY_BLOCKED').message, /Blocked slot violation/);
  });
  test('validator ignores a block on a different day or faculty', () => {
    const slot = baseline.find(s => s.facultyCode && !s.isReservedEmpty);
    const otherDay = fb.DAYS.find(d => d !== slot.day);
    const miss = [
      { facultyCode: slot.facultyCode, day: otherDay, startPeriod: 1, endPeriod: 8 },
      { facultyCode: 'NOT-HIM', day: slot.day, startPeriod: 1, endPeriod: 8 }
    ];
    assert.strictEqual(server.validateGlobalTimetable([slot], 'Odd', miss).conflicts.filter(c => c.type === 'FACULTY_BLOCKED').length, 0);
  });
  test('an adjacent (non-overlapping) period does not count as a violation', () => {
    const slot = baseline.find(s => s.facultyCode && s.start === '10:00' && s.end === '11:00');
    assert.ok(slot);
    const adjacent = [{ facultyCode: slot.facultyCode, day: slot.day, startPeriod: 1, endPeriod: 1 }];
    assert.strictEqual(fb.findBlockViolations([slot], adjacent).length, 0);
  });

  // ---------------------------------------------------------------- 6 & 7. end to end
  console.log('\n--- 5. END-TO-END STATUS & EXPORT GATE ---');
  const statePath = tmpFile('state.json');
  const blocksPath = tmpFile('e2e_blocks.json');
  const opts = { statePath, blocksPath };

  test('generateAllRequiredSections honours blocks and the status stays valid', () => {
    fb.addBlock('Odd', { facultyCode: busiest[0], day: 'Monday', startPeriod: 1, endPeriod: 8 }, { filePath: blocksPath });
    fb.addBlock('Odd', { facultyCode: busiest[1], day: 'Thursday', startPeriod: 3, endPeriod: 6 }, { filePath: blocksPath });
    const result = server.generateAllRequiredSections('Odd', opts);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isGloballyValid, true, result.conflicts && result.conflicts[0] && result.conflicts[0].message);
    const status = server.getGenerationStatus('Odd', opts);
    assert.strictEqual(status.facultyBlocks.length, 2);
    assert.strictEqual(status.exportAllowed, true);
  });

  test('adding a block over an existing class invalidates the status and blocks export', () => {
    const status = server.getGenerationStatus('Odd', opts);
    const state = server.loadGenerationState(statePath);
    const rec = Object.values(state.records).find(r => r.slots.some(s => s.facultyCode));
    const slot = rec.slots.find(s => s.facultyCode);
    const added = fb.addBlock('Odd', { facultyCode: slot.facultyCode, day: slot.day, startPeriod: 1, endPeriod: 8 }, { filePath: blocksPath });
    assert.strictEqual(added.success, true);
    const after = server.getGenerationStatus('Odd', opts);
    assert.strictEqual(after.isGloballyValid, false);
    assert.strictEqual(after.exportAllowed, false);
    assert.ok(after.conflicts.some(c => c.type === 'FACULTY_BLOCKED'));
    // Removing it restores a valid, exportable timetable
    const toRemove = fb.listBlocks('Odd', { filePath: blocksPath }).find(b => b.facultyCode === slot.facultyCode && b.day === slot.day && b.startPeriod === 1 && b.endPeriod === 8);
    fb.removeBlock('Odd', toRemove.id, { filePath: blocksPath });
    const restored = server.getGenerationStatus('Odd', opts);
    assert.strictEqual(status.exportAllowed, true);
    assert.strictEqual(restored.isGloballyValid, true);
    assert.strictEqual(restored.exportAllowed, true);
  });

  test('Even-semester blocks do not affect Odd generation', () => {
    const evenOnly = tmpFile('even_blocks.json');
    fb.addBlock('Even', { facultyCode: busiest[0], day: 'Monday', startPeriod: 1, endPeriod: 8 }, { filePath: evenOnly });
    assert.strictEqual(fb.listBlocks('Odd', { filePath: evenOnly }).length, 0);
    const res = server.generateAllRequiredSections('Odd', { statePath: tmpFile('state2.json'), blocksPath: evenOnly });
    assert.strictEqual(res.success, true);
  });

  // ---------------------------------------------------------------- 8. HTTP API
  console.log('\n--- 6. HTTP API ---');
  const apiBlocks = tmpFile('api_blocks.json');
  const srv = server.createServer({ statePath: tmpFile('api_state.json'), blocksPath: apiBlocks });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;

  try {
    await test('GET /api/faculty-blocks starts empty', async () => {
      const r = await request(port, 'GET', '/api/faculty-blocks?semester=Odd');
      assert.strictEqual(r.status, 200);
      assert.deepStrictEqual(r.body.blocks, []);
    });
    let createdId;
    await test('POST /api/faculty-blocks creates a block (201)', async () => {
      const r = await request(port, 'POST', '/api/faculty-blocks', { semester: 'Odd', facultyCode: 'KD', day: 'Monday', startPeriod: 1, endPeriod: 3, note: 'First-year class' });
      assert.strictEqual(r.status, 201);
      assert.strictEqual(r.body.block.note, 'First-year class');
      createdId = r.body.block.id;
    });
    await test('POST without a note works (reason not required)', async () => {
      const r = await request(port, 'POST', '/api/faculty-blocks', { semester: 'Odd', facultyCode: 'TPS', day: 'Friday', startPeriod: 7 });
      assert.strictEqual(r.status, 201);
      assert.strictEqual(r.body.block.note, null);
    });
    await test('POST with bad input returns 400 with a message', async () => {
      const r = await request(port, 'POST', '/api/faculty-blocks', { semester: 'Odd', facultyCode: 'KD', day: 'Sunday', startPeriod: 1 });
      assert.strictEqual(r.status, 400);
      assert.ok(r.body.error);
    });
    await test('POST with invalid JSON returns 400', async () => {
      const r = await new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port, path: '/api/faculty-blocks', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
          let out = ''; res.on('data', c => (out += c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(out) }));
        });
        req.on('error', reject); req.write('{oops'); req.end();
      });
      assert.strictEqual(r.status, 400);
    });
    await test('generation-status exposes the semester blocks', async () => {
      const r = await request(port, 'GET', '/api/timetable/generation-status?semester=Odd');
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.body.facultyBlocks.length, 2);
      const even = await request(port, 'GET', '/api/timetable/generation-status?semester=Even');
      assert.strictEqual(even.body.facultyBlocks.length, 0);
    });
    await test('GET /api/faculty-roster lists the roster for the dropdown', async () => {
      const r = await request(port, 'GET', '/api/faculty-roster');
      assert.strictEqual(r.status, 200);
      assert.ok(r.body.faculty.length >= 30);
      assert.ok(r.body.faculty.find(f => f.code === 'KD'));
    });
    await test('DELETE removes a block (200) and an unknown id gives 404', async () => {
      const del = await request(port, 'DELETE', `/api/faculty-blocks/${createdId}?semester=Odd`);
      assert.strictEqual(del.status, 200);
      const again = await request(port, 'DELETE', `/api/faculty-blocks/${createdId}?semester=Odd`);
      assert.strictEqual(again.status, 404);
      const list = await request(port, 'GET', '/api/faculty-blocks?semester=Odd');
      assert.strictEqual(list.body.blocks.length, 1);
    });
    await test('POST /api/timetable/generate-all uses the stored blocks', async () => {
      await request(port, 'POST', '/api/faculty-blocks', { semester: 'Odd', facultyCode: busiest[0], day: 'Wednesday', startPeriod: 1, endPeriod: 8 });
      const r = await request(port, 'POST', '/api/timetable/generate-all', { semester: 'Odd' });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.body.isGloballyValid, true);
    });
  } finally {
    await new Promise(r => srv.close(r));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\n===============================================================');
  console.log(`FINAL RESULT: ALL ${passed} FACULTY BLOCKING TESTS PASSED!`);
  console.log('===============================================================');
}

main().catch(err => {
  console.error('\nFaculty blocking test suite failed:', err.message);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  process.exit(1);
});
