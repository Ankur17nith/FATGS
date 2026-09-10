# FATGS — Faculty Allocation & Timetable Generation System

Academic timetable generation system for the **Department of Computer Science & Engineering, NIT Hamirpur**.

Generates conflict-free, load-balanced weekly timetables for B.Tech and M.Tech sections with automatic faculty and room allocation.

## Project Structure

```
FATGS/
├── backend/              # Timetable generation engine (Node.js)
│   ├── index.js          # Entry point — parse & inspect section data
│   ├── data/             # Input data (subjects, rooms)
│   ├── entities/         # Core logic (entities, allocation, generation)
│   └── output/           # Generated timetable JSON (gitignored)
├── frontend/             # Browser-based UI (standalone HTML)
│   ├── index.html        # Interactive Timetable Studio
│   └── viewer.html       # Read-only timetable viewer
└── _archive/             # Deprecated / experimental code
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Generate a timetable

```bash
npm run generate
```

This runs the timetable generator and writes output to `backend/output/base_timetable.json`.

### 3. Use the interactive studio

Open `frontend/index.html` in any browser. Select year → semester → section, assign faculty, and generate timetables with live conflict detection.

### 4. View generated output

Open `frontend/viewer.html` in any browser to view the pre-generated timetable with a section picker.

## Features

- **Constraint-based scheduling**: Labs placed as contiguous 2-period blocks, theory subjects load-balanced across weekdays
- **Conflict detection**: Real-time faculty and room conflict tracking across all sections
- **Faculty allocation**: GUI-driven faculty assignment with validity checking
- **Multiple sections**: Supports CS2, CD2 (2nd Year) and CS3, CD3 (3rd Year) across all semesters
- **JSON export**: Download generated timetables as JSON for further processing

## Tech Stack

- **Backend**: Node.js (no external runtime dependencies)
- **Frontend**: Vanilla HTML/CSS/JS (no build step, no framework)
- **Data**: JSON-based configuration

## License

Internal academic project — NIT Hamirpur, Department of CSE.
