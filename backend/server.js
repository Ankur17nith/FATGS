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
 * Normalizes semester representation to canonical machine value: 'Odd' or 'Even'.
 * Protects TT_TRACKER contract where semesterType must strictly be 'Odd' or 'Even'.
 */
function normalizeSemesterType(raw) {
  if (!raw || typeof raw !== 'string') return 'Odd';
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'even' || cleaned === 'even semester') {
    return 'Even';
  }
  if (cleaned === 'odd' || cleaned === 'odd semester') {
    return 'Odd';
  }
  return raw;
}

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
 * Returns rooms array from rooms.json or custom path.
 */
function getRoomsData(customPath) {
  const filePath = customPath || path.join(__dirname, 'data/rooms.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[FATGS] Failed to read rooms data:', err.message);
    return [];
  }
}

/**
 * Returns faculty array from faculty.json or custom path.
 */
function getFacultyData(customPath) {
  const filePath = customPath || path.join(__dirname, 'data/faculty.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error('[FATGS] Failed to read faculty data:', err.message);
    return [];
  }
}

/**
 * Resolves required academic sections (B.Tech, Dual Degree, and M.Tech) for a given semester cycle.
 * Dynamically evaluates whether each section actually has classes scheduled.
 */
function getRequiredSections(semesterTerm = 'Odd', subjectsData = null) {
  const norm = normalizeSemesterType(semesterTerm);
  const subjects = subjectsData || getSubjectsData();
  const filtered = subjects.filter(sec => {
    if (norm === 'Odd') {
      const isOdd = sec.semester.includes('1st') || sec.semester.includes('3rd') ||
                    sec.semester.includes('5th') || sec.semester.includes('7th') ||
                    sec.semester.includes('9th');
      if (!isOdd) return false;
    } else if (norm === 'Even') {
      const isEven = sec.semester.includes('2nd') || sec.semester.includes('4th') ||
                     sec.semester.includes('6th') || sec.semester.includes('8th') ||
                     sec.semester.includes('10th');
      if (!isEven) return false;
    } else {
      if (sec.semester !== semesterTerm) return false;
    }
    return true;
  });

  const seenKeys = new Set();
  const result = [];
  for (const sec of filtered) {
    const secKey = `${sec.name}_${sec.year}_${sec.semester}`;
    if (seenKeys.has(secKey)) continue;
    seenKeys.add(secKey);
    const totalClasses = (sec.subjects?.length || 0) + (sec.labs?.length || 0) + (sec.electives?.length || 0);
    const hasClasses = totalClasses > 0;
    result.push({
      name: sec.name,
      year: sec.year,
      semester: sec.semester,
      secKey,
      hasClasses,
      totalClasses
    });
  }
  return result;
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
function getGenerationStatus(semesterTerm = 'Odd', customOptions = {}) {
  const canonical = normalizeSemesterType(semesterTerm);
  const state = loadGenerationState(customOptions.statePath);
  const requiredList = getRequiredSections(canonical, customOptions.subjectsData);

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
    semester: canonical,
    semesterType: canonical,
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

  const academicYr = payload.academicYear || state.academicYear || '2025-2026';
  state.academicYear = academicYr;

  const secKey = `${section}_${year}_${semester}`;
  const genId = generationId || `gen_${secKey}_${Date.now()}`;

  state.records[secKey] = {
    section,
    year,
    semester,
    academicYear: academicYr,
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
    const canonical = normalizeSemesterType(filter.semester);
    const req = getRequiredSections(canonical, customOptions.subjectsData);
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
function exportTimetable(semesterTerm = 'Odd', customOptions = {}) {
  const canonical = normalizeSemesterType(semesterTerm);
  const status = getGenerationStatus(canonical, customOptions);
  if (!status.exportAllowed) {
    const missing = status.sections
      .filter(s => s.hasClasses && !s.generated)
      .map(s => `${s.name} (${s.semester})`);
    return {
      success: false,
      statusCode: 400,
      error: `Cannot export timetable: Base timetable generation is incomplete for ${canonical} Semester. All required sections must be successfully generated before export. Missing: ${missing.join(', ')}.`,
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

  const pkgId = `pkg_${canonical.toLowerCase()}_${Date.now()}`;

  // Load master academic collections
  const rawRooms = getRoomsData(customOptions.roomsPath);
  const rawFaculty = getFacultyData(customOptions.facultyPath);
  const rawSubjects = getSubjectsData(customOptions.subjectsPath);

  const formattedRooms = rawRooms.map(r => ({
    roomNo: r.roomNo,
    labOrClass: r.labOrClass || (r.isLab ? 'Lab' : 'Class'),
    building: r.building || 'Department of CSE',
    isLab: Boolean(r.isLab || r.labOrClass === 'Lab')
  }));

  const formattedFaculties = rawFaculty.map(f => ({
    facultyId: f.code || f.facultyCode,
    name: f.name || f.facultyFullName
  }));

  const subjectsMap = new Map();
  if (Array.isArray(rawSubjects)) {
    for (const sec of rawSubjects) {
      const subList = [...(sec.subjects || []), ...(sec.labs || []), ...(sec.electives || [])];
      for (const sub of subList) {
        if (sub && sub.code && !subjectsMap.has(sub.code)) {
          subjectsMap.set(sub.code, {
            subjectCode: sub.code,
            name: sub.name || sub.code,
            credits: sub.credits || 3,
            type: sub.type || 'Theory'
          });
        }
      }
    }
  }

  const formattedSections = activeSections.map(s => {
    let mappedSec = s.name;
    let mappedSecId = `${s.name}_${s.year}_${s.semester}`;
    if (s.name === 'MT1') {
      mappedSec = 'MTECH-CSE';
      mappedSecId = 'Y1_S1_MTECH-CSE';
    } else if (s.name === 'MA1') {
      mappedSec = 'MTECH-AI';
      mappedSecId = 'Y1_S1_MTECH-AI';
    }
    return {
      section: mappedSec,
      originalSection: s.name,
      year: s.year,
      semester: s.semester,
      sectionId: mappedSecId
    };
  });

  return {
    success: true,
    statusCode: 200,
    data: {
      packageId: pkgId,
      source: 'FATGS',
      semester: canonical,
      semesterType: canonical,
      academicYear: status.academicYear,
      exportedAt: new Date().toISOString(),
      rooms: formattedRooms,
      faculties: formattedFaculties,
      subjects: Array.from(subjectsMap.values()),
      sections: formattedSections,
      totalSlots: allSlots.length,
      slots: allSlots,
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

  const semVal = pkg.semesterType || pkg.semester;
  if (!semVal || typeof semVal !== 'string') {
    return { valid: false, error: 'Package must specify a valid semester or semesterType name.' };
  }

  const canonical = normalizeSemesterType(semVal);
  if (canonical !== 'Odd' && canonical !== 'Even') {
    return { valid: false, error: `Invalid semesterType "${semVal}": Must be "Odd" or "Even".` };
  }

  if (!pkg.academicYear || typeof pkg.academicYear !== 'string') {
    return { valid: false, error: 'Package must specify an academicYear (e.g. 2025-2026).' };
  }

  if (pkg.sections !== undefined && (!Array.isArray(pkg.sections) || pkg.sections.length === 0)) {
    return { valid: false, error: 'Package must specify a non-empty array of participating sections.' };
  }

  const slotsList = Array.isArray(pkg.slots) ? pkg.slots : pkg.timetable;
  if (!Array.isArray(slotsList) || slotsList.length === 0) {
    return { valid: false, error: 'Package timetable must contain at least one scheduled slot.' };
  }

  // Check slot records
  for (let i = 0; i < slotsList.length; i++) {
    const slot = slotsList[i];
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
 * Normalizes/maps timetable slots for TT_TRACKER handoff.
 * Preserves original FATGS identifiers (MT1, MA1, etc.) while providing
 * TT_TRACKER-compatible section and sectionId fields without ambiguity.
 */
function mapSlotForTTTracker(slot) {
  if (!slot || typeof slot !== 'object') return slot;
  const mapped = { ...slot };

  // Explicit, centralized M.Tech section mapping
  if (slot.section === 'MT1') {
    mapped.section = 'MTECH-CSE';
    mapped.sectionId = 'Y1_S1_MTECH-CSE';
    mapped.year = '1st Year';
    mapped.semester = '1st Semester';
    mapped.originalSection = 'MT1';
  } else if (slot.section === 'MA1') {
    mapped.section = 'MTECH-AI';
    mapped.sectionId = 'Y1_S1_MTECH-AI';
    mapped.year = '1st Year';
    mapped.semester = '1st Semester';
    mapped.originalSection = 'MA1';
  }

  return mapped;
}

/**
 * Transforms an export package into TT_TRACKER's expected envelope:
 * {
 *   packageId: string,
 *   academicYear: string,
 *   semesterType: string, // Strictly 'Odd' or 'Even'
 *   slots: Array<Object>
 * }
 */
function prepareTTTrackerPayload(pkg) {
  const rawSlots = Array.isArray(pkg.slots) ? pkg.slots : (Array.isArray(pkg.timetable) ? pkg.timetable : []);
  const mappedSlots = rawSlots.map(mapSlotForTTTracker);

  const rawSem = pkg.semesterType || pkg.semester || 'Odd';
  const canonicalSemesterType = normalizeSemesterType(rawSem);

  // Extract or load master collections
  const rawRooms = Array.isArray(pkg.rooms) ? pkg.rooms : getRoomsData();
  const rawFaculty = Array.isArray(pkg.faculties) ? pkg.faculties : getFacultyData();
  const rawSubjects = Array.isArray(pkg.subjects) ? pkg.subjects : getSubjectsData();

  const formattedRooms = rawRooms.map(r => ({
    roomNo: r.roomNo,
    labOrClass: r.labOrClass || (r.isLab ? 'Lab' : 'Class'),
    building: r.building || 'Department of CSE',
    isLab: Boolean(r.isLab || r.labOrClass === 'Lab')
  }));

  const formattedFaculties = rawFaculty.map(f => ({
    facultyId: f.facultyId || f.code || f.facultyCode,
    name: f.name || f.facultyFullName
  }));

  const subjectsMap = new Map();
  if (Array.isArray(rawSubjects)) {
    for (const item of rawSubjects) {
      if (item && item.subjectCode) {
        subjectsMap.set(item.subjectCode, item);
      } else if (item && item.code) {
        subjectsMap.set(item.code, {
          subjectCode: item.code,
          name: item.name || item.code
        });
      } else if (item && typeof item === 'object') {
        const subList = [...(item.subjects || []), ...(item.labs || []), ...(item.electives || [])];
        for (const sub of subList) {
          if (sub && sub.code && !subjectsMap.has(sub.code)) {
            subjectsMap.set(sub.code, {
              subjectCode: sub.code,
              name: sub.name || sub.code
            });
          }
        }
      }
    }
  }

  return {
    packageId: pkg.packageId || `pkg_${Date.now()}`,
    academicYear: pkg.academicYear || '2025-2026',
    semesterType: canonicalSemesterType,
    rooms: formattedRooms,
    faculties: formattedFaculties,
    subjects: Array.from(subjectsMap.values()),
    sections: Array.isArray(pkg.sections) ? pkg.sections : [],
    slots: mappedSlots
  };
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

  const endpointPath = options.endpoint || process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import';
  const targetUrl = new URL(endpointPath, ttTrackerUrl).toString();

  const payload = prepareTTTrackerPayload(pkg);

  // Structured logging (NEVER log the secret)
  console.log(`[FATGS -> TT_TRACKER] Handoff started: packageId=${payload.packageId}, academicYear=${payload.academicYear}, semesterType=${payload.semesterType}, slots=${payload.slots.length}, targetEndpoint=${targetUrl}`);

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-import-secret': secret,
        'x-tt-tracker-secret': secret,
        'Authorization': `Bearer ${secret}`
      },
      body: JSON.stringify(payload),
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

    console.log(`[FATGS -> TT_TRACKER] TT_TRACKER response status=${response.status}`);

    if (response.ok && responseData && responseData.success) {
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
        message: responseData.message || 'Timetable package accepted and activated in TT_TRACKER.',
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

    console.warn(`[FATGS -> TT_TRACKER] Handoff rejected: ${errorMsg}`);

    return {
      success: false,
      statusCode: response.status,
      error: `TT_TRACKER import failed: ${errorMsg}`
    };
  } catch (err) {
    clearTimeout(timeoutId);

    console.error(`[FATGS -> TT_TRACKER] Handoff connection failure: ${err.message}`);

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
        ttTrackerUrl: process.env.TT_TRACKER_URL || null,
        importEndpoint: process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import'
      });
      return;
    }

    // GET /api/timetable/generation-status
    if (req.method === 'GET' && pathname === '/api/timetable/generation-status') {
      const rawSemester = parsedUrl.searchParams.get('semester') || 'Odd';
      const semester = normalizeSemesterType(rawSemester);
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
      const rawSemester = parsedUrl.searchParams.get('semester') || 'Odd';
      const semester = normalizeSemesterType(rawSemester);
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

        let pkg = null;
        if (payload && payload.semester && !payload.package && !payload.timetable && !payload.slots) {
          const sem = normalizeSemesterType(payload.semester);
          const exportResult = exportTimetable(sem, customOptions);
          if (!exportResult.success) {
            sendJson(res, exportResult.statusCode || 400, {
              success: false,
              error: exportResult.error,
              missingSections: exportResult.missingSections
            });
            return;
          }
          pkg = exportResult.data;
        } else {
          pkg = payload.package || payload;
          const validation = validateSemesterPackage(pkg);
          if (!validation.valid) {
            sendJson(res, 400, {
              success: false,
              error: validation.error
            });
            return;
          }

          const rawSem = pkg.semesterType || pkg.semester || 'Odd';
          const sem = normalizeSemesterType(rawSem);
          const status = getGenerationStatus(sem, customOptions);
          if (!status.allRequiredGenerated) {
            sendJson(res, 400, {
              success: false,
              error: `Cannot handoff to TT_TRACKER: Base timetable generation is incomplete for ${sem} Semester. All required sections must be successfully generated before handoff.`
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
    console.log(`[FATGS] TT_TRACKER endpoint: ${process.env.TT_TRACKER_IMPORT_ENDPOINT || '/api/timetable/import'}`);
  });
  return server;
}

module.exports = {
  loadEnv,
  normalizeSemesterType,
  getSubjectsData,
  getRoomsData,
  getFacultyData,
  getRequiredSections,
  loadGenerationState,
  saveGenerationState,
  getGenerationStatus,
  recordSectionGeneration,
  resetGeneration,
  exportTimetable,
  validateSemesterPackage,
  mapSlotForTTTracker,
  prepareTTTrackerPayload,
  handoffToTTTracker,
  createServer,
  startServer
};

if (require.main === module) {
  startServer();
}
