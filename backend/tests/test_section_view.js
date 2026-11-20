/**
 * FATGS Test Suite: opening a generated section's timetable
 *
 * The UI shows a green card per generated section; clicking it loads that section's
 * stored slots. This covers the lookup (including sections produced by "Generate All")
 * and its error cases, directly and over HTTP.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const server = require('../server.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fatgs-section-'));
const opts = { statePath: path.join(tmpDir, 'state.json'), blocksPath: path.join(tmpDir, 'blocks.json') };

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}\n         ${err.message}`);
    process.exitCode = 1;
    throw err;
  }
}

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path: urlPath }, res => {
      let out = '';
      res.on('data', c => (out += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(out) }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('===============================================================');
  console.log('            FATGS OPEN-SECTION TIMETABLE TESTS                 ');
  console.log('===============================================================');

  const gen = server.generateAllRequiredSections('Odd', opts);
  assert.strictEqual(gen.success, true);
  const status = server.getGenerationStatus('Odd', opts);
  const generated = status.sections.filter(s => s.generated);
  assert.ok(generated.length >= 9, 'expected all odd sections generated');
  const cs3 = status.sections.find(s => s.name === 'CS3');

  try {
    await test('returns the stored slots for a section made by Generate All', () => {
      const r = server.getSectionSlots('Odd', cs3.secKey, opts);
      assert.strictEqual(r.success, true);
      assert.strictEqual(r.section, 'CS3');
      assert.ok(r.slots.length > 0);
      assert.ok(r.slots.every(s => s.section === 'CS3'));
      assert.strictEqual(r.slots.length, cs3.slotCount);
    });

    await test('every generated section can be opened and holds only its own slots', () => {
      for (const sec of generated) {
        const r = server.getSectionSlots('Odd', sec.secKey, opts);
        assert.strictEqual(r.success, true, sec.secKey);
        assert.ok(r.slots.every(s => s.section === sec.name), sec.secKey);
      }
    });

    await test('an Even-semester section opens under Even and not under Odd', () => {
      const evenOpts = { statePath: path.join(tmpDir, 'even.json'), blocksPath: opts.blocksPath };
      assert.strictEqual(server.generateAllRequiredSections('Even', evenOpts).success, true);
      const even = server.getGenerationStatus('Even', evenOpts).sections.find(s => s.generated);
      assert.ok(even, 'expected an Even section');
      assert.strictEqual(server.getSectionSlots('Even', even.secKey, evenOpts).success, true);
      assert.strictEqual(server.getSectionSlots('Odd', even.secKey, evenOpts).success, false);
    });

    await test('an unknown section key is a 404', () => {
      const r = server.getSectionSlots('Odd', 'NOPE_9th Year_1st Semester', opts);
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.statusCode, 404);
    });

    await test('a missing key is a 404, not a crash', () => {
      assert.strictEqual(server.getSectionSlots('Odd', '', opts).statusCode, 404);
      assert.strictEqual(server.getSectionSlots('Odd', undefined, opts).statusCode, 404);
    });

    await test('an Odd section is not returned when Even is requested', () => {
      const r = server.getSectionSlots('Even', cs3.secKey, opts);
      assert.strictEqual(r.success, false);
      assert.strictEqual(r.statusCode, 404);
    });

    await test('a section that was never generated is a 404', () => {
      const fresh = { statePath: path.join(tmpDir, 'empty.json'), blocksPath: opts.blocksPath };
      assert.strictEqual(server.getSectionSlots('Odd', cs3.secKey, fresh).statusCode, 404);
    });

    const srv = server.createServer(opts);
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const port = srv.address().port;
    try {
      await test('GET /api/timetable/section-slots returns 200 with the slots', async () => {
        const r = await get(port, `/api/timetable/section-slots?semester=Odd&secKey=${encodeURIComponent(cs3.secKey)}`);
        assert.strictEqual(r.status, 200);
        assert.strictEqual(r.body.slots.length, cs3.slotCount);
      });
      await test('GET /api/timetable/section-slots returns 404 for an unknown section', async () => {
        const r = await get(port, '/api/timetable/section-slots?semester=Odd&secKey=NOPE');
        assert.strictEqual(r.status, 404);
        assert.strictEqual(r.body.success, false);
      });
    } finally {
      await new Promise(r => srv.close(r));
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\n===============================================================');
  console.log(`FINAL RESULT: ALL ${passed} OPEN-SECTION TESTS PASSED!`);
  console.log('===============================================================');
}

main().catch(err => {
  console.error('\nOpen-section test suite failed:', err.message);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  process.exit(1);
});
