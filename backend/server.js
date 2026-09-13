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

const STATE_FILE_PATH = path.join(__dirname, 'output/generation_state.json');

/**
 * Returns subjects array from subjects.json or custom path.
 */
function getSubjectsData(customPath) {
  const filePath = customPath || path.join(__dirname, 'data/subjects.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[FATGS] Failed to read subjects data:', err.message);
    return [];
  }
}

/**
 * Resolves required undergraduate/dual-degree sections for a given semester cycle.
 * Dynamically evaluates whether each section actually has classes scheduled.
 */
function getRequiredSections(semesterTerm = 'Odd Semester', subjectsData = null) {
  const subjects = subjectsData || getSubjectsData();
  const filtered = subjects.filter(sec => {
    const isMTech = sec.year && sec.year.includes('M.Tech');
    if (semesterTerm === 'Odd Semester') {
      if (isMTech) return false;
      const isOdd = sec.semester.includes('1st') || sec.semester.includes('3rd') ||
                    sec.semester.includes('5th') || sec.semester.includes('7th') ||
                    sec.semester.includes('9th');
      if (!isOdd) return false;
    } else if (semesterTerm === 'Even Semester') {
      if (isMTech) return false;
      const isEven = sec.semester.includes('2nd') || sec.semester.includes('4th') ||
                     sec.semester.includes('6th') || sec.semester.includes('8th') ||
                     sec.semester.includes('10th');
      if (!isEven) return false;
    } else {
      if (sec.semester !== semesterTerm) return false;
    }
    return true;
  });

  return filtered.map(sec => {
    const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
    const hasClasses = totalClasses > 0;
    return {
      name: sec.name,
      year: sec.year,
      semester: sec.semester,
      secKey: `${sec.name}_${sec.year}_${sec.semester}`,
      hasClasses,
      totalClasses
    };
  });
}

/**
 * Loads persistent generation state from disk.
 */
function loadGenerationState(customStatePath) {
  const filePath = customStatePath || STATE_FILE_PATH;
  if (!fs.existsSync(filePath)) {
    return {
      academicYear: '2025-2026',
      records: {}
    };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.records || typeof parsed.records !== 'object') {
      parsed.records = {};
    }
    return parsed;
  } catch (err) {
    console.error('[FATGS] Error parsing generation state, returning fresh state:', err.message);
    return {
      academicYear: '2025-2026',
      records: {}
    };
  }
}

/**
 * Saves generation state to disk atomically.
 */
function saveGenerationState(state, customStatePath) {
  const filePath = customStatePath || STATE_FILE_PATH;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

/**
 * Answers whether each required section has successfully generated its base timetable.
 */
function getGenerationStatus(semesterTerm = 'Odd Semester', customOptions = {}) {
  const state = loadGenerationState(customOptions.statePath);
  const requiredList = getRequiredSections(semesterTerm, customOptions.subjectsData);

  const sectionsWithStatus = requiredList.map(sec => {
    const record = state.records && state.records[sec.secKey];
    const generated = Boolean(
      record &&
      record.generated === true &&
      Array.isArray(record.slots) &&
      record.slots.length > 0
    );

    return {
      section: sec.name,
      name: sec.name,
      year: sec.year,
      semester: sec.semester,
      secKey: sec.secKey,
      hasClasses: sec.hasClasses,
      required: sec.hasClasses, // Empty sections do not block completion
      generated,
      generatedAt: record?.generatedAt || null,
      generationId: record?.generationId || null,
      slotCount: record?.slotCount || (record?.slots?.length || 0)
    };
  });

  const activeRequired = sectionsWithStatus.filter(s => s.hasClasses);
  const totalRequired = activeRequired.length;
  const totalGenerated = activeRequired.filter(s => s.generated).length;
  const allRequiredGenerated = totalRequired > 0 && totalGenerated === totalRequired;

  return {
    success: true,
    semester: semesterTerm,
    academicYear: state.academicYear || '2025-2026',
    sections: sectionsWithStatus,
    totalRequired,
    totalGenerated,
    allRequiredGenerated,
    exportAllowed: allRequiredGenerated
  };
}

/**
 * Persists a successful base timetable generation record for a section.
 */
function recordSectionGeneration(payload, customOptions = {}) {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload must be an object.' };
  }

  const { section, year, semester, generationId, slots } = payload;
  if (!section || typeof section !== 'string') {
    return { success: false, error: 'Missing or invalid "section" identifier.' };
  }
  if (!year || typeof year !== 'string') {
    return { success: false, error: 'Missing or invalid "year" identifier.' };
  }
  if (!semester || typeof semester !== 'string') {
    return { success: false, error: 'Missing or invalid "semester" identifier.' };
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    return { success: false, error: `Slots array for section ${section} must contain at least one scheduled slot.` };
  }

  // Verify basic slot structure
  for (let i = 0; i < Math.min(slots.length, 5); i++) {
    const s = slots[i];
    if (!s || !s.day || !s.start || !s.end || !s.subjectCode) {
      return { success: false, error: `Slot at index ${i} is missing required fields (day, start, end, subjectCode).` };
    }
  }

  const state = loadGenerationState(customOptions.statePath);
  if (!state.records) state.records = {};

  const secKey = `${section}_${year}_${semester}`;
  const genId = generationId || `gen_${secKey}_${Date.now()}`;

  state.records[secKey] = {
    section,
    year,
    semester,
    secKey,
    generationId: genId,
    generated: true,
    generatedAt: new Date().toISOString(),
    slotCount: slots.length,
    slots
  };

  saveGenerationState(state, customOptions.statePath);

  return {
    success: true,
    message: `Base timetable generation successfully recorded for ${section} (${semester}).`,
    generationId: genId,
    slotCount: slots.length
  };
}

/**
 * Resets/clears generation records (for a specific section, semester, or all).
 */
function resetGeneration(filter = {}, customOptions = {}) {
  const state = loadGenerationState(customOptions.statePath);
  if (!state.records) state.records = {};

  if (filter.section && filter.year && filter.semester) {
    const key = `${filter.section}_${filter.year}_${filter.semester}`;
    delete state.records[key];
  } else if (filter.section) {
    Object.keys(state.records).forEach(k => {
      if (state.records[k].section === filter.section) {
        delete state.records[k];
      }
    });
  } else if (filter.semester) {
    const req = getRequiredSections(filter.semester, customOptions.subjectsData);
    const keysToDelete = new Set(req.map(r => r.secKey));
    Object.keys(state.records).forEach(k => {
      if (keysToDelete.has(k)) {
        delete state.records[k];
      }
    });
  } else {
    state.records = {};
  }

  saveGenerationState(state, customOptions.statePath);
  return { success: true, message: 'Generation state reset successfully.' };
}

/**
 * Gathers existing generated slots across all required sections without regenerating.
 * Returns 400 if not all required sections have completed base timetable generation.
 */
function exportTimetable(semesterTerm = 'Odd Semester', customOptions = {}) {
  const status = getGenerationStatus(semesterTerm, customOptions);
  if (!status.exportAllowed) {
    const missing = status.sections
      .filter(s => s.hasClasses && !s.generated)
      .map(s => `${s.name} (${s.semester})`);
    return {
      success: false,
      statusCode: 400,
      error: `Cannot export timetable: Base timetable generation is incomplete for ${semesterTerm}. All required sections must be successfully generated before export. Missing: ${missing.join(', ')}.`,
      missingSections: missing
    };
  }

  const state = loadGenerationState(customOptions.statePath);
  const allSlots = [];
  const activeSections = status.sections.filter(s => s.hasClasses);

  for (const s of activeSections) {
    const rec = state.records && state.records[s.secKey];
    if (rec && Array.isArray(rec.slots)) {
      allSlots.push(...rec.slots);
    }
  }

  return {
    success: true,
    statusCode: 200,
    data: {
      source: 'FATGS',
      semester: semesterTerm,
      academicYear: status.academicYear,
      exportedAt: new Date().toISOString(),
      sections: activeSections.map(s => s.name),
      totalSlots: allSlots.length,
      timetable: allSlots
    }
  };
}


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

    // GET /api/timetable/generation-status
    if (req.method === 'GET' && pathname === '/api/timetable/generation-status') {
      const semester = parsedUrl.searchParams.get('semester') || 'Odd Semester';
      const status = getGenerationStatus(semester, customOptions);
      sendJson(res, 200, status);
      return;
    }

    // POST /api/timetable/record-generation
    if (req.method === 'POST' && pathname === '/api/timetable/record-generation') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 10 * 1024 * 1024) req.destroy();
      });

      req.on('end', () => {
        let payload = null;
        try {
          payload = JSON.parse(bodyStr);
        } catch (err) {
          sendJson(res, 400, { success: false, error: 'Malformed JSON payload.' });
          return;
        }

        const result = recordSectionGeneration(payload, customOptions);
        sendJson(res, result.success ? 200 : 400, result);
      });
      return;
    }

    // POST /api/timetable/reset-generation
    if (req.method === 'POST' && pathname === '/api/timetable/reset-generation') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
        if (bodyStr.length > 1024 * 1024) req.destroy();
      });

      req.on('end', () => {
        let payload = {};
        if (bodyStr.trim()) {
          try {
            payload = JSON.parse(bodyStr);
          } catch (e) {
            payload = {};
          }
        }
        const result = resetGeneration(payload, customOptions);
        sendJson(res, 200, result);
      });
      return;
    }

    // GET /api/timetable/export
    if (req.method === 'GET' && pathname === '/api/timetable/export') {
      const semester = parsedUrl.searchParams.get('semester') || 'Odd Semester';
      const result = exportTimetable(semester, customOptions);
      if (!result.success) {
        sendJson(res, result.statusCode || 400, result);
      } else {
        sendJson(res, 200, result.data);
      }
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

        if (customOptions.enforceCompleteness) {
          const status = getGenerationStatus(pkg.semester, customOptions);
          if (!status.allRequiredGenerated) {
            sendJson(res, 400, {
              success: false,
              error: `Cannot handoff to TT_TRACKER: Base timetable generation is incomplete for ${pkg.semester}. All required sections must be successfully generated.`
            });
            return;
          }
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
  getSubjectsData,
  getRequiredSections,
  loadGenerationState,
  saveGenerationState,
  getGenerationStatus,
  recordSectionGeneration,
  resetGeneration,
  exportTimetable,
  validateSemesterPackage,
  handoffToTTTracker,
  createServer,
  startServer
};

if (require.main === module) {
  startServer();
}
