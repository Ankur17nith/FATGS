/**
 * FATGS Backend Server & TT_TRACKER Handoff Service
 * Department of Computer Science & Engineering, NIT Hamirpur
 *
 * Provides API endpoints for:
 *  - Health status
 *  - TT_TRACKER configuration status
 *  - Authenticated server-to-server timetable handoff to TT_TRACKER
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple .env parser to avoid third-party dependencies
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
}

// Load environment on require
loadEnv();

/**
 * Validates the complete semester timetable package structure.
 */
function validateSemesterPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, error: 'Timetable package must be an object.' };
  }

  if (!pkg.semester || typeof pkg.semester !== 'string') {
    return { valid: false, error: 'Package must specify a valid semester name.' };
  }

  if (!pkg.academicYear || typeof pkg.academicYear !== 'string') {
    return { valid: false, error: 'Package must specify an academicYear (e.g. 2025-2026).' };
  }

  if (!Array.isArray(pkg.sections) || pkg.sections.length === 0) {
    return { valid: false, error: 'Package must specify a non-empty array of participating sections.' };
  }

  if (!Array.isArray(pkg.timetable) || pkg.timetable.length === 0) {
    return { valid: false, error: 'Package timetable must contain at least one scheduled slot.' };
  }

  // Check slot records
  for (let i = 0; i < pkg.timetable.length; i++) {
    const slot = pkg.timetable[i];
    if (!slot || typeof slot !== 'object') {
      return { valid: false, error: `Invalid slot record at index ${i}.` };
    }
    if (!slot.section || !slot.day || !slot.start || !slot.end || !slot.subjectCode) {
      return {
        valid: false,
        error: `Slot record at index ${i} missing required fields (section, day, start, end, subjectCode).`
      };
    }
  }

  return { valid: true };
}

/**
 * Performs authenticated HTTP POST to TT_TRACKER backend.
 */
async function handoffToTTTracker(pkg, options = {}) {
  const ttTrackerUrl = (options.url || process.env.TT_TRACKER_URL || '').trim();
  const secret = (options.secret || process.env.TT_TRACKER_IMPORT_SECRET || '').trim();

  if (!ttTrackerUrl) {
    return {
      success: false,
      statusCode: 500,
      error: 'TT_TRACKER_URL is not configured in FATGS backend environment.'
    };
  }

  if (!secret) {
    return {
      success: false,
      statusCode: 500,
      error: 'TT_TRACKER_IMPORT_SECRET is not configured in FATGS backend environment.'
    };
  }

  const endpointPath = options.endpoint || process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import-base';
  const targetUrl = new URL(endpointPath, ttTrackerUrl).toString();

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tt-tracker-secret': secret,
        'Authorization': `Bearer ${secret}`
      },
      body: JSON.stringify(pkg),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (err) {
        responseData = null;
      }
    } else {
      const text = await response.text();
      responseData = { message: text };
    }

    if (response.ok) {
      // Determine safe redirect destination based on trusted TT_TRACKER_URL
      let redirectUrl = new URL('/timetable', ttTrackerUrl).toString();
      if (responseData && responseData.redirectUrl) {
        try {
          const proposed = new URL(responseData.redirectUrl, ttTrackerUrl);
          // Only permit redirect within the configured TT_TRACKER host
          const trustedHost = new URL(ttTrackerUrl).host;
          if (proposed.host === trustedHost) {
            redirectUrl = proposed.toString();
          }
        } catch (e) {
          // Keep default redirectUrl if proposed URL is invalid
        }
      }

      return {
        success: true,
        statusCode: response.status,
        message: (responseData && responseData.message) || 'Timetable package accepted and activated in TT_TRACKER.',
        redirectUrl
      };
    }

    // Handle distinct error responses from TT_TRACKER
    let errorMsg = 'TT_TRACKER rejected the timetable package.';
    if (responseData && (responseData.error || responseData.message)) {
      errorMsg = responseData.error || responseData.message;
    }

    if (response.status === 401 || response.status === 403) {
      errorMsg = 'Authentication failed with TT_TRACKER. Invalid or unauthorized secret.';
    }

    return {
      success: false,
      statusCode: response.status,
      error: `TT_TRACKER (HTTP ${response.status}): ${errorMsg}`
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        success: false,
        statusCode: 504,
        error: `Request to TT_TRACKER timed out after ${timeoutMs / 1000} seconds.`
      };
    }

    return {
      success: false,
      statusCode: 502,
      error: `Unable to connect to TT_TRACKER at ${ttTrackerUrl} (${err.code || err.message}). Ensure TT_TRACKER is running.`
    };
  }
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tt-tracker-secret'
  });
  res.end(json);
}

function createServer(customOptions = {}) {
  return http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tt-tracker-secret'
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, {
        status: 'ok',
        service: 'FATGS Backend',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // GET /api/tt-tracker/status
    if (req.method === 'GET' && pathname === '/api/tt-tracker/status') {
      const configured = Boolean(process.env.TT_TRACKER_URL && process.env.TT_TRACKER_IMPORT_SECRET);
      sendJson(res, 200, {
        configured,
        ttTrackerUrl: process.env.TT_TRACKER_URL || null
      });
      return;
    }

    // POST /api/handoff-timetable
    if (req.method === 'POST' && pathname === '/api/handoff-timetable') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 10 * 1024 * 1024) {
          // Protection against excessively large payloads (>10MB)
          req.destroy();
        }
      });

      req.on('end', async () => {
        let payload = null;
        try {
          payload = JSON.parse(bodyStr);
        } catch (err) {
          sendJson(res, 400, {
            success: false,
            error: 'Malformed JSON payload in request body.'
          });
          return;
        }

        const pkg = payload.package || payload;
        const validation = validateSemesterPackage(pkg);
        if (!validation.valid) {
          sendJson(res, 400, {
            success: false,
            error: validation.error
          });
          return;
        }

        const result = await handoffToTTTracker(pkg, customOptions);
        sendJson(res, result.success ? 200 : result.statusCode || 500, result);
      });
      return;
    }

    // Not found
    sendJson(res, 404, {
      success: false,
      error: `Endpoint not found: ${req.method} ${pathname}`
    });
  });
}

function startServer(port = process.env.PORT || 5001) {
  const server = createServer();
  server.listen(port, () => {
    console.log(`[FATGS] Backend server running on http://localhost:${port}`);
    console.log(`[FATGS] TT_TRACKER target: ${process.env.TT_TRACKER_URL || 'Not Configured'}`);
  });
  return server;
}

module.exports = {
  loadEnv,
  validateSemesterPackage,
  handoffToTTTracker,
  createServer,
  startServer
};

if (require.main === module) {
  startServer();
}
