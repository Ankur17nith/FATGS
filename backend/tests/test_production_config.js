/**
 * FATGS Test Suite: production configuration
 *
 *  1. CORS: any origin by default; an allowlist when CORS_ORIGIN is set (checked over HTTP).
 *  2. Safe response headers on API responses.
 *  3. Startup warnings in production for unsafe settings.
 *  4. FATGS_DATA_DIR: faculty blocks and generation sessions go to the configured directory.
 *  5. The process shuts down cleanly on SIGTERM and prints the production warnings.
 *  6. Deployment files: npm start runs the backend; render.yaml holds no secrets.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const rc = require('../entities/runtimeConfig.js');
const fb = require('../entities/facultyBlocks.js');
const server = require('../server.js');

const root = path.join(__dirname, '../..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fatgs-prod-'));
const savedEnv = { ...process.env };

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

function resetEnv() {
  for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
  Object.assign(process.env, savedEnv);
  delete process.env.CORS_ORIGIN;
  delete process.env.FATGS_DATA_DIR;
}

function request(port, method, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, res => {
      let out = '';
      res.on('data', c => (out += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: out }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('===============================================================');
  console.log('              FATGS PRODUCTION CONFIGURATION TESTS             ');
  console.log('===============================================================');

  resetEnv();

  console.log('\n--- 1. CORS ---');
  await test('resolveCors: unset or "*" allows any origin', () => {
    assert.deepStrictEqual(rc.resolveCors('https://a.example', {}), { allowOrigin: '*', vary: false });
    assert.deepStrictEqual(rc.resolveCors('https://a.example', { CORS_ORIGIN: '*' }), { allowOrigin: '*', vary: false });
  });
  await test('resolveCors: a listed origin is echoed, an unlisted one gets nothing', () => {
    const env = { CORS_ORIGIN: 'https://web.example, https://admin.example/' };
    assert.deepStrictEqual(rc.resolveCors('https://web.example', env), { allowOrigin: 'https://web.example', vary: true });
    assert.deepStrictEqual(rc.resolveCors('https://admin.example/', env), { allowOrigin: 'https://admin.example', vary: true });
    assert.strictEqual(rc.resolveCors('https://evil.example', env).allowOrigin, null);
    assert.strictEqual(rc.resolveCors(undefined, env).allowOrigin, null);
  });

  const srv = server.createServer({ statePath: path.join(tmpDir, 'state.json'), blocksPath: path.join(tmpDir, 'blocks.json') });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  try {
    await test('HTTP default: any origin allowed', async () => {
      const r = await request(port, 'GET', '/api/health', { Origin: 'https://anything.example' });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.headers['access-control-allow-origin'], '*');
    });
    process.env.CORS_ORIGIN = 'https://web.example';
    await test('HTTP with CORS_ORIGIN: the listed origin is allowed and Vary is set', async () => {
      const r = await request(port, 'GET', '/api/health', { Origin: 'https://web.example' });
      assert.strictEqual(r.headers['access-control-allow-origin'], 'https://web.example');
      assert.match(r.headers['vary'] || '', /Origin/);
    });
    await test('HTTP with CORS_ORIGIN: an unlisted origin gets no CORS header', async () => {
      const r = await request(port, 'GET', '/api/health', { Origin: 'https://evil.example' });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.headers['access-control-allow-origin'], undefined);
    });
    await test('HTTP with CORS_ORIGIN: preflight from the listed origin is 204 with methods incl. DELETE', async () => {
      const r = await request(port, 'OPTIONS', '/api/faculty-blocks/x', { Origin: 'https://web.example', 'Access-Control-Request-Method': 'DELETE' });
      assert.strictEqual(r.status, 204);
      assert.strictEqual(r.headers['access-control-allow-origin'], 'https://web.example');
      assert.match(r.headers['access-control-allow-methods'], /DELETE/);
    });
    await test('HTTP with CORS_ORIGIN: preflight from an unlisted origin carries no allow header', async () => {
      const r = await request(port, 'OPTIONS', '/api/faculty-blocks', { Origin: 'https://evil.example' });
      assert.strictEqual(r.headers['access-control-allow-origin'], undefined);
    });
    resetEnv();

    console.log('\n--- 2. RESPONSE HEADERS ---');
    await test('API responses are not cacheable and are not content-sniffed', async () => {
      const r = await request(port, 'GET', '/api/health');
      assert.strictEqual(r.headers['cache-control'], 'no-store');
      assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
      assert.match(r.headers['content-type'], /application\/json/);
    });
    await test('an unknown route is still a JSON 404 with the same headers', async () => {
      const r = await request(port, 'GET', '/api/nope');
      assert.strictEqual(r.status, 404);
      assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
    });
  } finally {
    await new Promise(r => srv.close(r));
    resetEnv();
  }

  console.log('\n--- 3. STARTUP WARNINGS ---');
  const strong = {
    NODE_ENV: 'production',
    TT_TRACKER_URL: 'https://tt.example',
    TT_TRACKER_IMPORT_SECRET: 'a-very-long-random-secret-value-123',
    CORS_ORIGIN: 'https://web.example',
    FATGS_DATA_DIR: '/var/data/fatgs'
  };
  await test('no warnings outside production', () => {
    assert.deepStrictEqual(rc.productionWarnings({}), []);
    assert.deepStrictEqual(rc.productionWarnings({ NODE_ENV: 'development' }), []);
  });
  await test('a fully configured production environment has no warnings', () => {
    assert.deepStrictEqual(rc.productionWarnings(strong), []);
  });
  await test('an empty production environment warns about every unsafe setting', () => {
    const w = rc.productionWarnings({ NODE_ENV: 'production' });
    assert.strictEqual(w.length, 4);
    ['TT_TRACKER_URL', 'TT_TRACKER_IMPORT_SECRET', 'CORS_ORIGIN', 'FATGS_DATA_DIR'].forEach(k => assert.ok(w.some(x => x.includes(k)), k));
  });
  await test('sample and short secrets are called weak', () => {
    for (const secret of ['development_secret_change_in_production', 'replace-with-a-long-random-secret', 'short']) {
      const w = rc.productionWarnings({ ...strong, TT_TRACKER_IMPORT_SECRET: secret });
      assert.strictEqual(w.length, 1, secret);
      assert.match(w[0], /weak/);
    }
  });
  await test('CORS_ORIGIN="*" is flagged in production', () => {
    const w = rc.productionWarnings({ ...strong, CORS_ORIGIN: '*' });
    assert.strictEqual(w.length, 1);
    assert.match(w[0], /CORS_ORIGIN/);
  });

  console.log('\n--- 4. FATGS_DATA_DIR ---');
  await test('getDataDir: null when unset, absolute path when set', () => {
    assert.strictEqual(rc.getDataDir({}), null);
    assert.strictEqual(rc.getDataDir({ FATGS_DATA_DIR: '  ' }), null);
    assert.ok(path.isAbsolute(rc.getDataDir({ FATGS_DATA_DIR: 'relative/dir' })));
  });
  await test('faculty blocks are stored under FATGS_DATA_DIR and the repo file stays empty', () => {
    const dir = path.join(tmpDir, 'persistent');
    process.env.FATGS_DATA_DIR = dir;
    try {
      const repoFile = path.join(root, 'backend/data/faculty_blocks.json');
      const before = fs.readFileSync(repoFile, 'utf8');
      const r = fb.addBlock('Odd', { facultyCode: 'KD', day: 'Monday', startPeriod: 1, endPeriod: 2 });
      assert.strictEqual(r.success, true);
      const file = path.join(dir, 'faculty_blocks.json');
      assert.ok(fs.existsSync(file), 'blocks file in the data dir');
      assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).Odd.length, 1);
      assert.strictEqual(fb.listBlocks('Odd').length, 1);
      assert.strictEqual(fs.readFileSync(repoFile, 'utf8'), before, 'tracked blocks file untouched');
    } finally {
      resetEnv();
    }
  });
  await test('generation sessions are written under FATGS_DATA_DIR/sessions, not the repo', () => {
    const dir = path.join(tmpDir, 'persistent2');
    process.env.FATGS_DATA_DIR = dir;
    const id = `sess_prodcfg_${Date.now()}`;
    try {
      server.saveGenerationState({ sessionId: id, records: {} }, undefined, id);
      assert.ok(fs.existsSync(path.join(dir, 'sessions', `${id}.json`)), 'session file in the data dir');
      assert.ok(!fs.existsSync(path.join(root, 'backend/output/sessions', `${id}.json`)), 'not written into the repo');
    } finally {
      resetEnv();
    }
  });

  console.log('\n--- 5. PROCESS LIFECYCLE ---');
  await test('SIGTERM stops the server cleanly (exit 0) and production warnings are printed', () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'backend/server.js')], {
      env: { ...process.env, PORT: '0', NODE_ENV: 'production', TT_TRACKER_URL: '', TT_TRACKER_IMPORT_SECRET: '', CORS_ORIGIN: '', FATGS_DATA_DIR: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    let killed = false;
    const onData = d => {
      out += d.toString();
      if (!killed && /running on port/.test(out) && /WARNING/.test(out)) {
        killed = true;
        child.kill('SIGTERM');
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('server did not start and stop in time:\n' + out)); }, 15000);
    child.on('exit', code => {
      clearTimeout(timer);
      try {
        assert.strictEqual(code, 0, `exit code ${code}\n${out}`);
        assert.match(out, /SIGTERM received/);
        assert.match(out, /TT_TRACKER_IMPORT_SECRET is not set/);
        assert.match(out, /CORS_ORIGIN is not set/);
        resolve();
      } catch (e) { reject(e); }
    });
  }));

  console.log('\n--- 6. DEPLOYMENT FILES ---');
  await test('npm start runs the backend, node engine is declared, dev scripts remain', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.scripts.start, 'node backend/server.js');
    assert.ok(pkg.engines && pkg.engines.node);
    assert.ok(pkg.scripts.dev && pkg.scripts.build);
  });
  await test('render.yaml defines the API and the static site and holds no secret values', () => {
    const y = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
    assert.match(y, /healthCheckPath: \/api\/health/);
    assert.match(y, /startCommand: node backend\/server\.js/);
    assert.match(y, /staticPublishPath: frontend\/dist/);
    assert.match(y, /npm --prefix frontend ci --include=dev/, 'Vite is a dev dependency: the build must install it even when NODE_ENV=production');
    assert.match(y, /destination: \/index\.html/);
    for (const key of ['TT_TRACKER_IMPORT_SECRET', 'TT_TRACKER_URL', 'CORS_ORIGIN', 'VITE_API_BASE_URL']) {
      const m = y.match(new RegExp(`- key: ${key}\\n\\s+(\\w+): ([^\\n]*)`));
      assert.ok(m && m[1] === 'sync' && m[2] === 'false', `${key} must be sync: false (asked in the dashboard)`);
    }
  });
  await test('.env.example contains no real-looking secret', () => {
    const e = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    const line = e.split('\n').find(l => l.startsWith('TT_TRACKER_IMPORT_SECRET='));
    assert.ok(rc.WEAK_SECRETS.has(line.split('=')[1].trim()), 'the sample secret must be one production flags as weak');
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('\n===============================================================');
  console.log(`FINAL RESULT: ALL ${passed} PRODUCTION CONFIGURATION TESTS PASSED!`);
  console.log('===============================================================');
}

main().catch(err => {
  console.error('\nProduction configuration test suite failed:', err.message);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  process.exit(1);
});
