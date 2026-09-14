/**
 * FATGS Unified Application Runner
 * Starts both the FATGS backend HTTP server (port 5001)
 * and the React + Vite frontend studio (port 5173) concurrently.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const isWindows = process.platform === 'win32';

console.log('===============================================================');
console.log('  Faculty Allocation & Timetable Generation System (FATGS)     ');
console.log('  Starting Backend (Port 5001) & Frontend Studio (Port 5173)...');
console.log('===============================================================');

// 1. Spawn Backend HTTP Server (port 5001)
const backend = spawn(process.execPath, [path.join(rootDir, 'backend/server.js')], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env
});

// 2. Spawn Frontend Vite Dev Server (port 5173)
const viteBin = path.join(frontendDir, 'node_modules/vite/bin/vite.js');
let frontend;
if (fs.existsSync(viteBin)) {
  frontend = spawn(process.execPath, [viteBin], {
    cwd: frontendDir,
    stdio: 'inherit',
    env: process.env
  });
} else {
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  frontend = spawn(npmCmd, ['run', 'dev'], {
    cwd: frontendDir,
    stdio: 'inherit',
    env: process.env,
    shell: isWindows
  });
}

let isShuttingDown = false;

function terminateProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (isWindows) {
      spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch (_) {}
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[FATGS] Stopping all services...');
  terminateProcess(backend);
  terminateProcess(frontend);
  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => shutdown(0));

backend.on('error', (err) => {
  console.error('[FATGS] Failed to start backend server:', err.message);
  shutdown(1);
});

frontend.on('error', (err) => {
  console.error('[FATGS] Failed to start frontend studio:', err.message);
  shutdown(1);
});

backend.on('exit', (code, signal) => {
  if (!isShuttingDown && code !== 0 && code !== null) {
    console.error(`[FATGS] Backend exited unexpectedly with code ${code || signal}`);
    shutdown(code || 1);
  }
});

frontend.on('exit', (code, signal) => {
  if (!isShuttingDown && code !== 0 && code !== null) {
    console.error(`[FATGS] Frontend exited with code ${code || signal}`);
    shutdown(code || 1);
  }
});
