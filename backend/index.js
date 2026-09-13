/**
 * FATGS - Faculty Allocation & Timetable Generation System
 * Department of Computer Science & Engineering, NIT Hamirpur
 *
 * Main backend entry point exporting core generation utilities and models.
 */

const path = require('path');
const fs = require('fs');
const funcs = require('./entities/functions.js');
const { Section } = require('./entities/Section.js');
const { Subject, Lab, Elective } = require('./entities/Subject.js');
const Room = require('./entities/Room.js');
const facultyAllocation = require('./entities/facultyAllocation.js');
const {
  CANDIDATE_THEORY_ROOMS,
  DEFAULT_THEORY_ROOMS,
  ALL_LAB_ROOMS,
  generateBaseTimetable,
  toFlatSlotList
} = require('./entities/baseTimetableGenerator.js');
const server = require('./server.js');

module.exports = {
  funcs,
  Section,
  Subject,
  Lab,
  Elective,
  Room,
  facultyAllocation,
  CANDIDATE_THEORY_ROOMS,
  DEFAULT_THEORY_ROOMS,
  ALL_LAB_ROOMS,
  generateBaseTimetable,
  toFlatSlotList,
  server,
  startServer: server.startServer,
  createServer: server.createServer,
  validateSemesterPackage: server.validateSemesterPackage,
  handoffToTTTracker: server.handoffToTTTracker
};

if (require.main === module) {
  const subjectsPath = path.join(__dirname, 'data/subjects.json');
  const roomsPath = path.join(__dirname, 'data/rooms.json');
  const outDir = path.join(__dirname, 'output');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const sections = generateBaseTimetable(
    subjectsPath,
    roomsPath,
    s => !s.year.includes('M.Tech')
  );

  const flat = toFlatSlotList(sections);
  const outFile = path.join(outDir, 'base_timetable.json');
  fs.writeFileSync(outFile, JSON.stringify(flat, null, 2));

  console.log('[FATGS] Timetable generation complete.');
  console.log(`[FATGS] Sections processed: ${sections.length}`);
  console.log(`[FATGS] Scheduled slots written: ${flat.length} -> ${outFile}`);
}
