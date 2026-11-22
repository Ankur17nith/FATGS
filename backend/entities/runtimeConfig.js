/**
 * Runtime configuration helpers for running FATGS in production.
 * Everything here reads the environment at call time, so it is easy to test.
 *
 *  FATGS_DATA_DIR  Directory for state that must survive restarts: generation sessions
 *                  (<dir>/sessions) and faculty blocks (<dir>/faculty_blocks.json).
 *                  Point it at a persistent disk in production. Unset: files stay inside
 *                  the repo (backend/output and backend/data), as in development.
 *  CORS_ORIGIN     Comma-separated list of browser origins allowed to call the API.
 *                  Unset: any origin (development default).
 */

const path = require('path');

const WEAK_SECRETS = new Set([
  'development_secret_change_in_production',
  'your-secure-import-secret',
  'replace-with-a-long-random-secret',
  'change-me',
  'changeme',
  'secret'
]);

/** Absolute data directory from FATGS_DATA_DIR, or null when not configured. */
function getDataDir(env = process.env) {
  const dir = (env.FATGS_DATA_DIR || '').trim();
  return dir ? path.resolve(dir) : null;
}

/** Strips trailing slashes so "https://app.example.com/" matches "https://app.example.com". */
function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

/**
 * Decides the Access-Control-Allow-Origin value for a request.
 *  - CORS_ORIGIN unset or "*"  -> "*"
 *  - CORS_ORIGIN is a list     -> the request origin if listed, otherwise null (no CORS header)
 * `vary` is true when the answer depends on the request origin.
 */
function resolveCors(originHeader, env = process.env) {
  const configured = (env.CORS_ORIGIN || '').trim();
  if (!configured || configured === '*') return { allowOrigin: '*', vary: false };

  const allowed = configured.split(',').map(normalizeOrigin).filter(Boolean);
  const origin = normalizeOrigin(originHeader);
  return { allowOrigin: origin && allowed.includes(origin) ? origin : null, vary: true };
}

/** Problems worth shouting about at startup when NODE_ENV=production. Empty otherwise. */
function productionWarnings(env = process.env) {
  if (env.NODE_ENV !== 'production') return [];
  const warnings = [];
  const secret = (env.TT_TRACKER_IMPORT_SECRET || '').trim();

  if (!(env.TT_TRACKER_URL || '').trim()) {
    warnings.push('TT_TRACKER_URL is not set: publishing a timetable to TT_TRACKER will fail.');
  }
  if (!secret) {
    warnings.push('TT_TRACKER_IMPORT_SECRET is not set: publishing a timetable to TT_TRACKER will fail.');
  } else if (WEAK_SECRETS.has(secret.toLowerCase()) || secret.length < 16) {
    warnings.push('TT_TRACKER_IMPORT_SECRET looks weak (a sample value or shorter than 16 characters). Use a long random value.');
  }
  const cors = (env.CORS_ORIGIN || '').trim();
  if (!cors || cors === '*') {
    warnings.push('CORS_ORIGIN is not set: any website can call this API from a browser. Set it to the frontend address.');
  }
  if (!getDataDir(env)) {
    warnings.push('FATGS_DATA_DIR is not set: generated sections and faculty blocks are stored on the server disk and are lost on restart or redeploy unless that disk is persistent.');
  }
  return warnings;
}

module.exports = { getDataDir, resolveCors, productionWarnings, normalizeOrigin, WEAK_SECRETS };
