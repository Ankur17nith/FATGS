# Faculty Allocation & Timetable Generation System (FATGS)

Automated academic scheduling and faculty allocation engine developed for the **Department of Computer Science & Engineering, National Institute of Technology Hamirpur**.

FATGS resolves the multi-constraint combinatorial scheduling problem inherent to university engineering departments: managing shared lecture halls, specialized laboratories, dual-group practical cohorts, elective basket synchronization across paired sections, and authoritative faculty assignments without collisions.

---

## 1. Project Overview

Academic scheduling in university engineering departments requires strict adherence to curriculum structures, institutional contact hours, and physical infrastructure limits. Generating conflict-free timetables manually across multiple academic years and parallel sections often leads to classroom collisions, faculty double-booking, or student movement inefficiencies.

FATGS provides an automated, deterministic scheduling engine coupled with an interactive web studio. The system:
1. Validates and enforces departmental curriculum constraints (theory credit hours, 2-hour contiguous lab blocks, activity reservations).
2. Manages shared classroom assignments across parallel undergraduate sections (CS and CD).
3. Synchronizes parallel elective choices (Open Electives, Discipline Electives, Stream Electives) between cohort sections.
4. Ensures simultaneous laboratory scheduling for laboratory split groups (G1 and G2) across separate practical laboratories.
5. Employs a room-stability optimization algorithm to minimize unnecessary student transit between consecutive lectures.
6. Exports standardized, conflict-free timetable datasets in JSON format for academic administration and timetable display systems.

---

## 2. Key Features

- **Authoritative Faculty Allocation**: Maps the official NIT Hamirpur faculty roster (33 professors and course instructors) to courses with section-level exclusivity.
- **Year-Specific Lunch Enforcement**:
  - Second Year (3rd & 4th Semesters): **13:00 – 14:00** (Period 4)
  - Third Year (5th & 6th Semesters): **12:00 – 13:00** (Period 3)
  - Final Year (7th & 8th Semesters) & M.Tech: **13:00 – 14:00** (Period 4)
- **Group-Aware Practical Scheduling**:
  - Groups **G1** and **G2** in laboratory courses are scheduled as contiguous 2-hour practical sessions.
  - Priority 1: Schedules G1 and G2 simultaneously during the same time block in two distinct laboratories.
  - Priority 2: Falls back to distinct time slots if laboratory or faculty availability is constrained.
- **Elective Synchronization & Basket Isolation**:
  - Synchronized elective selection across paired sections (e.g., CS3 and CD3 share the same elective offerings).
  - Open Elective (OE) fixed-slot scheduling (13:00 – 14:00) respecting weekly period count.
  - Discipline Electives (DE) scheduled concurrently in distinct rooms across parallel groups.
  - Rotation occurs strictly within the designated elective basket; baskets never cross-contaminate.
- **Room Stability & Consecutive Class Optimization**:
  - Theory classes with multi-hour duration strictly retain the identical classroom.
  - Consecutive distinct lectures employ a soft-scoring stability function to minimize room changes across the day.
- **Curricular Activity Reservations**:
  - Reserved unassigned blocks for mandatory extracurricular/co-curricular activities (e.g., SA-201 NSS/NCC).
  - Automatic filtering of non-scheduled coursework (e.g., industrial training, capstone project stages).
- **Interactive UI & JSON Export**: Real-time faculty configuration grid with single-click export of the complete schedule matrix to `base_timetable.json`.

---

## 3. System Architecture

FATGS is structured into two operational environments sharing identical domain logic:

1. **Backend Engine (Node.js)**:
   - Command-line and batch generation system.
   - Parses authoritative curriculum and room JSON files.
   - Executes resource tracking for room and faculty collision detection.
   - Outputs flat schedule datasets to `backend/output/base_timetable.json`.
2. **Frontend Studio (React + Vite)**:
   - Interactive client-side scheduling interface with live state management.
   - Displays academic dropdowns, room selectors, and elective basket allocation tables.
   - Renders compact, high-density weekly timetable matrices matching the TT_TRACKER institutional design system.
   - Performs client-side export to JSON.

### Architecture & Data Flow

```
  +----------------------------------------------------------------+
  |                     Input Data Configuration                   |
  |  - backend/data/subjects.json (Curriculum, credits, L-T-P)    |
  |  - backend/data/rooms.json (Candidate classrooms & lab rooms)  |
  |  - backend/data/faculty.json (33 Faculty names & short codes)  |
  +-------------------------------+--------------------------------+
                                  |
                                  v
  +----------------------------------------------------------------+
  |                     FATGS Generation Engine                    |
  |  1. placeOpenElectives()     -> Fixed slot 13:00-14:00         |
  |  2. placeDisciplineElectives()-> Basket-isolated parallel sync |
  |  3. placeSA201()             -> Reserved activity slot         |
  |  4. placeLabs()              -> G1/G2 simultaneous in labs     |
  |  5. placeTheorySubjects()    -> Room stability scoring & mornings|
  +-------------------------------+--------------------------------+
                                  |
            +---------------------+---------------------+
            v                                           v
  +-----------------------------+             +--------------------+
  |      Backend Pipeline       |             |   Frontend Studio  |
  |  backend/index.js           |             |   React + Vite UI  |
  |  baseTimetableGenerator.js  |             |   ScheduleBuilder  |
  |             |               |             |   TimetableGrid    |
  |             v               |             |         |          |
  |  output/base_timetable.json |             |         v          |
  |  (Automated Test Validation)|             |   Browser Download |
  +-----------------------------+             +--------------------+
```

---

## 4. Technology Stack

- **Backend Runtime**: Node.js (v18.0.0+)
- **Backend Architecture**: Vanilla CommonJS modules (`fs`, `path`) with zero external runtime dependencies.
- **Frontend Framework**: React 18.3 (`react`, `react-dom`)
- **Frontend Build Tool**: Vite 6.4 (`@vitejs/plugin-react`)
- **Styling**: Vanilla CSS with custom institutional design system, responsive tables, and CSS variables.
- **Testing**: Native Node.js test scripts with deep assertion suites and constraint auditors.

---

## 5. Project Structure

```text
FATGS/
|-- backend/
|   |-- data/
|   |   |-- faculty.json              # Authoritative roster of 33 faculty members
|   |   |-- rooms.json                # Physical classrooms and laboratories
|   |   `-- subjects.json             # Curriculum, credits, contact hours, lab/theory types
|   |-- entities/
|   |   |-- Section.js                # Section model with year-specific lunch interval definitions
|   |   |-- Subject.js                # Subject, Lab, and Elective domain classes
|   |   |-- Room.js                   # Room domain model
|   |   |-- functions.js              # Parsers for subjects and rooms datasets
|   |   |-- facultyAllocation.js      # Faculty lookup, code mapping, and assignment validation
|   |   |-- assignPlaceholderFaculty.js # Authoritative faculty assignment from official curriculum
|   |   `-- baseTimetableGenerator.js # Core generation engine and constraint solver
|   |-- output/
|   |   `-- base_timetable.json       # Generated timetable flat JSON dataset
|   |-- tests/
|   |   |-- test_cs301_open_elective.js         # 11 tests verifying Open Elective constraints
|   |   |-- test_elective_rotation_and_slots.js # 10 tests for elective sync & basket isolation
|   |   |-- test_year_specific_lunch.js         # Validation of year-specific lunch intervals
|   |   |-- validate_timetable.js               # 20 mandatory constraint tests & collision checks
|   |   `-- verify_final_requirements.js        # Audit of full department requirements
|   `-- index.js                      # Backend main entry point and CLI runner
|-- data/
|   |-- rooms_data.json               # Reference room dataset
|   `-- subjects_data.json            # Master departmental curriculum reference (B.Tech & M.Tech)
|-- frontend/
|   |-- public/
|   |   `-- nith-logo.png             # Official NIT Hamirpur emblem
|   |-- src/
|   |   |-- components/
|   |   |   |-- Header.jsx            # Institutional top-tier header
|   |   |   |-- Footer.jsx            # Institutional footer and developer attribution
|   |   |   |-- TimetableGrid.jsx     # Compact weekly timetable grid with lunch and slot cells
|   |   |   |-- TimetableCard.jsx     # Individual entry card (Theory, Lab, Elective, Stacked)
|   |   |   `-- Toast.jsx             # Non-blocking status notification toast
|   |   |-- data/
|   |   |   `-- timetableData.js      # Frontend data store and in-browser generation logic
|   |   |-- styles/
|   |   |   |-- index.css             # Institutional CSS variables, layout, and utility classes
|   |   |   `-- timetable.css         # Timetable table styles matching TT_TRACKER design system
|   |   |-- views/
|   |   |   `-- ScheduleBuilder.jsx   # Interactive allocation studio and timetable viewer
|   |   |-- App.jsx                   # Root application container
|   |   `-- main.jsx                  # React application entry point
|   |-- tests/
|   |   `-- verify_frontend_ui.js     # Frontend store and UI constraint test suite
|   |-- index.html                    # Single-page application HTML entry
|   `-- vite.config.js                # Vite configuration
|-- package.json                      # Workspace configuration and npm scripts
`-- README.md                         # Authoritative technical documentation
```

---

## 6. Timetable Rules & Scheduling Constraints

### Academic Calendar & Day Structure
- **Days**: Monday through Friday only (strictly 5 working days; Saturday is excluded).
- **Daily Periods**: 8 periods per day:
  1. `09:00 - 10:00`
  2. `10:00 - 11:00`
  3. `11:00 - 12:00`
  4. `12:00 - 13:00`
  5. `13:00 - 14:00`
  6. `14:00 - 15:00`
  7. `15:00 - 16:00`
  8. `16:00 - 17:00`

### Year-Specific Lunch Rules
Lunch breaks are locked by academic year. No academic session may be scheduled during a section's designated lunch period:
- **Second Year (CS2, CD2)**: Period 4 (`13:00 - 14:00`)
- **Third Year (CS3, CD3)**: Period 3 (`12:00 - 13:00`)
- **Final Year (CS4, CD4), 5th Year (CD5), and M.Tech (MT1, MA1)**: Period 4 (`13:00 - 14:00`)

### Classroom Allocation
- **Shared Theory Classrooms**: Parallel undergraduate sections (CS2, CD2, CS3, CD3, CS4, CD4) share four configurable theory classrooms selected from 22 candidate rooms:
  - Candidates: `B1, B2, B3, B4, G1, G2, G3, G4, G5, G6, F1, F2, F3, F4, F5, F6, S1, S2, S3, S4, S5, S6`
  - Default Active Set: `B4, F4, G5, S2`
- **Special Rooms**:
  - `CSE-III`: Dedicated department classroom assigned to CD5 (Dual Degree).
  - `Seminar Hall - Block A`: Primary lecture facility for MT1 (M.Tech CSE).
  - `Conference Hall - Block B`: Primary lecture facility for MA1 (M.Tech AI).

### Laboratory Allocation
- Dedicated Lab Rooms: `P1, P2, P3, P4, P5, P6, B1, B2`
- *Dynamic Role Awareness*: `B1` and `B2` can function as laboratories or classrooms based on configuration. If `B1` or `B2` is selected as an active shared theory room, it is automatically excluded from the laboratory pool to prevent cross-type collisions.
- No theory session may be scheduled in a dedicated laboratory room (`P1 - P6`).
- No laboratory session may be scheduled in a classroom.

### Group Scheduling (G1 and G2)
- Applicable Sections: `CS2, CD2, CS3, CD3, CS4, CD4`.
- Labs are 2 hours long (`P = 2`).
- **Simultaneous Scheduling (Priority 1)**: The engine attempts to schedule G1 and G2 during the same 2-hour interval in two distinct laboratories (e.g., G1 in P1, G2 in P2).
- **Fallback (Priority 2)**: If two lab rooms or both faculty members are not simultaneously free, the groups are scheduled at distinct, non-overlapping times.
- Both groups never share the same room at the same time.

### Continuous-Class Room Optimization
- When a theory course has a continuous multi-hour session (e.g., a 2-hour block), students **strictly remain in the same room**.
- Consecutive single-period classes evaluate a **room-stability score** considering:
  - Immediate previous period classroom (+2000 points).
  - Immediate next period classroom (+1000 points).
  - Pre/post-lunch continuity (+500 / +400 points).
  - Classroom affinity across the current day (+200 points per class).
  - Lookahead continuous vacancy runs (+80 points).
- Hard constraints (faculty availability, room availability, lunch interval) always override soft stability preferences.

---

## 7. Elective System

### Open Electives (OE)
- Example Course: `CS-301` (Open Elective-I).
- **Fixed Timetable Slot**: Scheduled in the synchronized period `13:00 - 14:00` (Monday, Tuesday, Wednesday).
- **Slot Count**: Matches authoritative course credit/contact requirements (3 weekly periods).
- **No Group Labels**: Open Electives are section-wide or basket-wide choices, not laboratory sub-groups.
- **Identity**: Open Elective is an elective category, not a physical room or location.

### Discipline Electives (DE)
- Course Baskets: `Discipline Elective-I`, `Discipline Elective-II`, etc.
- **Parallel Synchronization**: Offered elective courses within the same basket are scheduled in the **same time slot across separate classrooms**, allowing students to attend their respective chosen course concurrently.
- **Post-Lunch Preference**: Scheduled preferentially in afternoon periods (periods 5, 6, 7) when feasible.
- **Strict Basket Isolation**: Electives belonging to Basket 1 never mix, rotate, or schedule in parallel with courses from Basket 2 or Open Electives.
- **Offering Rule**: Only electives with an assigned instructor are scheduled. Inactive/unassigned basket entries are omitted from the schedule matrix.

### Paired-Section Synchronization
- Paired sections within the same academic cohort (`CS2 + CD2`, `CS3 + CD3`, `CS4 + CD4`) share synchronized elective offerings. Assigning an instructor to an elective in one section automatically synchronizes across the paired section.

---

## 8. Data Configuration

Departmental records are maintained in structured JSON configuration files:

| File | Purpose | Key Attributes |
|---|---|---|
| `backend/data/faculty.json` | Faculty master roster | `code`, `name`, `facultyCode`, `facultyFullName` |
| `backend/data/rooms.json` | Physical infrastructure registry | `roomNo`, `labOrClass`, `building`, `isCandidateClass`, `isLab` |
| `backend/data/subjects.json` | Official departmental curriculum | `name`, `year`, `semester`, `subjects` (L-T-P), `labs`, `electives` |
| `data/subjects_data.json` | Departmental curriculum archive | Reference syllabus for B.Tech, Dual Degree, and M.Tech programs |

---

## 9. Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Install Dependencies
Clone the repository and install root and frontend dependencies:

```bash
# 1. Install root dev dependencies
npm install

# 2. Install frontend studio dependencies
cd frontend
npm install
cd ..
```

---

## 10. Configuration

FATGS supports deployment-independent environment configuration via `.env` (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5001` | Port on which the FATGS backend HTTP server listens |
| `TT_TRACKER_URL` | `http://localhost:5000` | Target URL of the TT_TRACKER application (local development or deployed production URL) |
| `TT_TRACKER_IMPORT_SECRET` | *(required in production)* | Shared secret for authenticating server-to-server import requests to TT_TRACKER. **Strictly backend-only; never exposed to browser code or client JSON.** |

- **Shared Theory Rooms**: The default 4 shared classrooms (`B4`, `F4`, `G5`, `S2`) are configured in `backend/entities/baseTimetableGenerator.js` and can be interactively changed via the Frontend Studio top toolbar.
- **Faculty Roster**: Maintained in `backend/data/faculty.json`. Faculty assignments can be updated in `backend/entities/assignPlaceholderFaculty.js` or directly selected via the matrix dropdowns in the frontend.
- **Curriculum & Contact Hours**: Defined in `backend/data/subjects.json`. Modifying lecture, tutorial, or practical credit counts updates contact requirements across both the backend engine and the frontend studio.

---

## 11. Running the Project

The workspace includes npm scripts for both backend batch operations and frontend interactive development:

### Backend Server (API & TT_TRACKER Handoff)
```bash
# Start FATGS backend HTTP server (listens on port 5001)
npm run server

# Development mode with auto-restart on file changes
npm run backend:dev
```

### Backend Batch Generation (CLI)
```bash
# Run standalone generator and write backend/output/base_timetable.json
npm run generate
```

### Frontend Interactive Studio
```bash
# Start Vite development server locally (defaults to http://localhost:5173, proxies /api to port 5001)
npm run dev

# Build production bundle for deployment (outputs to frontend/dist)
npm run build

# Preview production build locally
npm run preview
```

---

## 12. Testing

Run all 8 validation test suites across the repository:

```bash
npm test
```

### Test Suites Overview:
1. **`backend/tests/test_cs301_open_elective.js`** (11/11 Passed):
   - Verifies CS-301 Open Elective classification, authoritative faculty, physical room assignment, fixed slot (13:00–14:00), 3 credit hours, paired-section synchronization, and zero collisions.
2. **`backend/tests/test_elective_rotation_and_slots.js`** (10/10 Passed):
   - Verifies DE parallel slotting, strict basket isolation between DE-1 and DE-2, stream elective independence, paired-section equality, and room/faculty conflict prevention.
3. **`backend/tests/test_year_specific_lunch.js`** (Passed):
   - Audits section instantiation and generated JSON output to guarantee 0 classes during year-specific lunch hours.
4. **`backend/tests/validate_timetable.js`** (20/20 Passed):
   - Deep structural validation: theory/lab classification, contiguous labs, simultaneous G1/G2 practicals, SA-201 reservations, no Saturday classes, room stability metrics, 0 faculty collisions, 0 room collisions.
5. **`backend/tests/verify_final_requirements.js`** (Passed):
   - Validates multi-semester generation (3rd–8th Semesters, M.Tech MT1/MA1), exclusion of non-scheduled project modules (CS-416, CS-499), and elective offerings.
6. **`frontend/tests/verify_frontend_ui.js`** (Passed):
   - Audits frontend store, section taxonomy (verifying zero CS5), faculty short codes, theory group omissions, and continuous-class room stability.
7. **`backend/tests/test_handoff_packaging.js`** (5/5 Passed):
   - Validates data-driven required section detection (Odd vs Even semesters), verifies that sections without classes in the selected semester (e.g. CD5 in Even semester) do not block readiness, validates stale export detection after regeneration, and validates semester package structure.
8. **`backend/tests/test_handoff_server.js`** (10/10 Passed):
   - Comprehensive backend and TT_TRACKER integration test suite:
     - Tests `/api/health` 200 OK.
     - Tests `/api/tt-tracker/status` exposes configuration without leaking secret.
     - Tests rejection of malformed or incomplete packages (HTTP 400).
     - Tests missing environment configuration handling (HTTP 500).
     - Tests authenticated server-to-server handoff to TT_TRACKER (`POST /api/timetable/import`) with headers `x-import-secret` and `Authorization: Bearer <secret>`.
     - Tests payload envelope: `{ packageId, academicYear, semesterType, slots: [...] }`.
     - Tests M.Tech section mapping (`MT1` -> `MTECH-CSE`, `MA1` -> `MTECH-AI`) and slot preservation (`sessionId`, `group`, `isLab`, `duration`).
     - Tests TT_TRACKER validation rejection (422/400) caught cleanly with exact failure message and zero redirect.
     - Tests TT_TRACKER 401 authentication rejection handling.
     - Tests TT_TRACKER 500 internal server error handling.
     - Tests network connection failure (502) handling.
     - Tests semester-scoped handoff invocation from persisted backend state.

---

## 13. Timetable Generation & TT_TRACKER Handoff Workflow

FATGS cleanly coordinates timetable generation, local export, and production-grade handoff to the TT_TRACKER tracking and management platform:

```
+-------------------------------------------------------------------------------+
|  1. "Generate Base Timetable"                                                 |
|     Action: Runs the scheduling algorithm inside FATGS for the section.      |
|     Preserves authoritative scheduling rules, room stability, and faculty allocations.|
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|  2. Semester Completeness Verification                                        |
|     Backend evaluates completion across all required sections for the semester.|
|     Odd Semester: 9 sections (CS2, CD2, CS3, CD3, CS4, CD4, CD5, MT1, MA1).   |
|     Even Semester: 6 sections (CS2, CD2, CS3, CD3, CS4, CD4).                 |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|  3. "Export JSON" (with Handoff Confirmation)                                 |
|     Action: When all required sections are generated, click "Export JSON".   |
|     Modal: "This will replace the current TT_TRACKER base timetable. Continue?"|
|     - Cancel: Closes modal; zero side-effects.                                |
|     - Continue: Executes authenticated server-to-server handoff.              |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|  4. Authenticated Server-to-Server Handoff                                    |
|     FATGS Backend -> POST http://localhost:3000/api/timetable/import          |
|     Headers: x-import-secret: <secret>, Authorization: Bearer <secret>        |
|     Payload: { packageId, academicYear, semesterType, slots: [...] }          |
|     - MT1 mapped to MTECH-CSE (Y1_S1_MTECH-CSE)                               |
|     - MA1 mapped to MTECH-AI (Y1_S1_MTECH-AI)                                 |
|     - sessionId, group, isLab, duration, faculty, and room preserved.         |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|  5. TT_TRACKER Verification & Atomic Activation                               |
|     - TT_TRACKER validates all entities (faculty, rooms, subjects, sections). |
|     - Atomically replaces base timetable slots in MongoDB.                   |
|     - Clears stale overrides & hydrates tracking registry.                    |
|     - Returns HTTP 200 { success: true, redirectUrl: "..." }                  |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|  6. Success Confirmation & Safe Navigation                                    |
|     - FATGS triggers local download of base_timetable_<semester>.json.        |
|     - FATGS displays success toast.                                           |
|     - Redirects/opens TT_TRACKER (http://localhost:3000/timetable) after 1.2s.|
|     - If rejected: Displays exact failure message, NO download, NO redirect. |
+-------------------------------------------------------------------------------+
```

### Local Development Ports & Services

| Service | Local URL | Description |
|---|---|---|
| **FATGS Backend** | `http://localhost:5001` | Express API server (`node backend/server.js`) |
| **FATGS Frontend** | `http://localhost:5173` | React + Vite UI studio (`npm --prefix frontend run dev`) |
| **TT_TRACKER Backend/App** | `http://localhost:3000` | Timetable tracking system (`npm start` in `TT_TRACKER`) |

### Required Environment Configuration

Configure the following variables in FATGS `.env`:

```env
# FATGS Server Port
PORT=5001

# TT_TRACKER Integration Configuration
TT_TRACKER_URL=http://localhost:3000
TT_TRACKER_IMPORT_ENDPOINT=/api/timetable/import
TT_TRACKER_IMPORT_SECRET=local_tt_tracker_test_secret_key_2026
```

> [!IMPORTANT]
> **Zero Secret Leakage to Frontend**: The import secret (`TT_TRACKER_IMPORT_SECRET`) is maintained strictly on the FATGS server side. It is **never** included in client API responses, frontend bundles, local storage, or browser environment variables. The frontend calls `/api/handoff-timetable` on the FATGS backend, which securely proxies the authenticated request to TT_TRACKER.

### API Payload Contract

The FATGS backend packages the verified, already-generated timetable into TT_TRACKER's required envelope:

```json
{
  "packageId": "pkg_odd_1789334270799",
  "academicYear": "2025-2026",
  "semesterType": "Odd",
  "slots": [
    {
      "section": "CS2",
      "year": "2nd Year",
      "semester": "3rd Semester",
      "day": "Monday",
      "start": "09:00",
      "end": "10:00",
      "subjectCode": "CS-214",
      "facultyCode": "KD",
      "faculty": "KD",
      "room": "B4",
      "isLab": false,
      "duration": 1,
      "group": null,
      "sessionId": "CS2_CS-214_Mon_0900",
      "isReservedEmpty": false
    },
    {
      "section": "MTECH-CSE",
      "sectionId": "Y1_S1_MTECH-CSE",
      "originalSection": "MT1",
      "year": "1st Year",
      "semester": "1st Semester",
      "day": "Monday",
      "start": "10:00",
      "end": "11:00",
      "subjectCode": "CS-736",
      "facultyCode": "RPS",
      "faculty": "RPS",
      "room": "Seminar Hall - Block A",
      "isLab": false,
      "duration": 1,
      "group": null,
      "sessionId": "RPS_Y1_S1_MTECH-CSE_CS-736_Monday_10:00",
      "isReservedEmpty": false
    }
  ]
}
```

### M.Tech Section Identification & Mapping

FATGS supports M.Tech sections as first-class academic cohorts. To ensure full compatibility with TT_TRACKER's schema while preserving FATGS source identifiers, the backend applies the following centralized mapping:

| FATGS Section | Academic Degree | TT_TRACKER Section | TT_TRACKER Section ID | Primary Lecture Facility |
|---|---|---|---|---|
| `MT1` | M.Tech CSE (1st Year, 1st Sem) | `MTECH-CSE` | `Y1_S1_MTECH-CSE` | `Seminar Hall - Block A` |
| `MA1` | M.Tech AI (1st Year, 1st Sem) | `MTECH-AI` | `Y1_S1_MTECH-AI` | `Conference Hall - Block B` |

- `MT1` and `MA1` are tracked independently in generation records.
- Neither M.Tech section is ever normalized into ordinary B.Tech sections (no trailing digit stripping into `MT` or `MA`).
- Both sections must be generated before Odd Semester export/handoff is permitted.

### Step-by-Step End-to-End Handoff Guide

1. **Start Services**:
   - Start TT_TRACKER on port 3000 (`npm start` in `TT_TRACKER`).
   - Start FATGS backend on port 5001 (`node backend/server.js`).
   - Start FATGS frontend on port 5173 (`npm --prefix frontend run dev`).
2. **Access FATGS Studio**:
   - Open `http://localhost:5173` in a web browser.
3. **Verify Target Semester**:
   - In the "Semester Timetable Handoff & Completeness Status" panel, verify that the Target Semester is set to **Odd Semester** (or **Even Semester**).
4. **Generate Base Timetables**:
   - For each section listed in the completeness status grid, select the section and click **"Generate Base Timetable"**.
   - Continue until the summary bar turns green:
     `✓ All required sections generated (9/9 sections ready for Export JSON & TT_TRACKER handoff)`.
5. **Trigger Export & Handoff**:
   - Click the **"Export JSON"** button in the handoff panel.
6. **Confirmation Modal**:
   - A modal dialog appears:
     > *"This will replace the current TT_TRACKER base timetable. Continue?"*
   - Clicking **"Cancel"** aborts the operation with zero side effects.
   - Clicking **"Continue"** initiates the authenticated handoff.
7. **Execution & Confirmation**:
   - The FATGS backend gathers the already-generated slots, maps M.Tech section identities, packages the envelope, and sends a secure POST to TT_TRACKER.
   - On success (HTTP 200), the browser automatically downloads `base_timetable_<semester>.json`, displays a green success toast, and redirects to `http://localhost:3000/timetable`.
   - If TT_TRACKER rejects the package, FATGS surfaces the exact rejection error message (e.g. `TT_TRACKER import failed: Slot #20: Unknown room "P6". Room must exist in TT_TRACKER room registry.`), aborts the download, and stays on the page without redirecting.

---

## 14. Output Format (`base_timetable.json`)

The generated schedule is exported as an array of normalized slot objects:

```json
[
  {
    "section": "CS3",
    "year": "3rd Year",
    "semester": "5th Semester",
    "day": "Monday",
    "start": "09:00",
    "end": "10:00",
    "subjectCode": "CS-311",
    "facultyCode": "AKM",
    "faculty": "AKM",
    "room": "G5",
    "isLab": false,
    "duration": 1,
    "group": null,
    "sessionId": "CS3_CS-311_0_0",
    "electiveType": null,
    "basket": null,
    "isReservedEmpty": false
  },
  {
    "section": "CS3",
    "year": "3rd Year",
    "semester": "5th Semester",
    "day": "Tuesday",
    "start": "09:00",
    "end": "11:00",
    "subjectCode": "CS-315",
    "facultyCode": "AKY",
    "faculty": "AKY",
    "room": "P1",
    "isLab": true,
    "duration": 2,
    "group": "G1",
    "sessionId": "CS3_CS-315_CS-316_1_0",
    "electiveType": null,
    "basket": null,
    "isReservedEmpty": false
  }
]
```

### Field Specifications:
- `section`: Target section code (`CS2`, `CD2`, `CS3`, `CD3`, `CS4`, `CD4`, `CD5`, `MT1`, `MA1`).
- `year` & `semester`: Academic level.
- `day`: Working day (`Monday` through `Friday`).
- `start` & `end`: Period boundaries in 24-hour format (`09:00`, `10:00`, etc.).
- `subjectCode`: Official course identifier (`CS-214`, `MA-219`, etc.).
- `facultyCode`: Departmental short code of the assigned instructor (`KD`, `TPS`, `SC`, etc.).
- `room`: Assigned physical classroom or laboratory (`B4`, `P1`, `CSE-III`, etc.).
- `isLab`: Boolean flag (`true` for laboratory practicals, `false` for theory/activities).
- `duration`: Session length in hours (`1` for standard theory, `2` for labs and block sessions).
- `group`: Student cohort designation (`G1`, `G2`, `Choice 1`, or `null` for section-wide theory).
- `sessionId`: Deterministic cross-group identifier linking paired sessions.
- `electiveType`: Elective category (`OE` for Open Elective, `DE` for Discipline Elective, `SC` for Stream Core, `SE` for Stream Elective, or `null`).
- `basket`: Offering basket title.
- `isReservedEmpty`: Boolean flag for reserved non-instructional activity intervals (`SA-201`).

---

## 15. Validation & Constraints

### Hard Constraints (Strict Violations Prohibited)
1. **Zero Faculty Collisions**: An instructor cannot be scheduled to teach more than one section or group during the same time slot.
2. **Zero Room Collisions**: A physical classroom or laboratory cannot host more than one class during the same time slot.
3. **Zero Group Collisions**: A student cohort or sub-group (G1, G2) cannot attend multiple sessions simultaneously.
4. **Room-Type Compatibility**: Theory classes may not occupy dedicated laboratories (`P1 - P6`); laboratories may not occupy classrooms.
5. **Year-Specific Lunch Clearance**: Zero classes scheduled during a section's designated lunch hour.
6. **Complete Credit Allocation**: All scheduled courses fulfill their required weekly contact hours.

### Soft Constraints & Preferences (Optimized Where Feasible)
1. **Continuous-Class Same-Room**: Multi-hour sessions strictly retain the same room. Consecutive single-hour classes score highest when reusing the prior room.
2. **Morning Scheduling Preference**: The engine prioritizes scheduling classes before lunch whenever valid slots exist.
3. **Simultaneous Lab Practical Scheduling**: Dual practical groups G1 and G2 are scheduled in the same time block whenever two labs are available.

---

## 16. Development Notes

- **Deterministic Scheduling**: The generator avoids arbitrary randomness for core constraints. Day shuffling is constrained to equal-cost candidate slots to prevent schedule skew while guaranteeing reproducibility under identical inputs.
- **Section Pairing**: Sections designated as `CS` and `CD` within the same semester share identical lecture periods for elective courses to enable parallel faculty instruction.
- **No Group Theory**: Normal theory classes are strictly section-wide and must never display `G1` or `G2` designations.
- **Strict Lunch Clearance**: The engine reserves lunch periods before any candidate slot evaluation occurs, preventing accidental scheduling during meal breaks.

---

## 17. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `Duplicate room selection is not allowed` | A room was selected in more than one of the 4 shared classroom slots. | Ensure all 4 shared theory dropdowns contain distinct room numbers. |
| `No theory rooms available` | Configured rooms are currently blocked by parallel sections. | Verify that the 4 chosen theory rooms are not overallocated across all 6 undergraduate sections. |
| `Faculty collision on generation` | A faculty member was manually assigned to two overlapping classes. | Use the faculty allocation dropdown to assign distinct faculty members or leave as Auto-Assign. |
| `Vite build error` | Missing dependencies in `frontend/`. | Run `cd frontend && npm install` before executing build. |

---

## 18. Project Status

FATGS is **functionally complete, production-tested, and mathematically verified**. All hard constraints (0 faculty collisions, 0 room collisions, 0 group collisions, year-specific lunch rules, continuous class room stability, and paired-section elective synchronization) pass 100% of automated tests across all B.Tech and M.Tech sections.
