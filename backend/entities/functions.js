const fs = require('fs');
const Room = require('./Room.js');
const { Subject, Lab, Elective } = require('./Subject.js');
const { Section } = require('./Section.js');

function room_parse(room_json) {
    const file = fs.readFileSync(room_json);
    const data = JSON.parse(file);
    const rooms = data.map(roomData =>
        new Room(
            roomData.roomNo,
            roomData.labOrClass,
            roomData.building
        )
    );
    return rooms;
}

// Returns an array of Section objects that have the appropriate lists updated
function subject_parse(subject_json) {
    const file = fs.readFileSync(subject_json);
    const data = JSON.parse(file);

    let sections = [];
    for (let item of data) {
        let curr = new Section(item.name, item.year, item.semester);

        // Theory / normal taught subjects
        for (let subject of (item.subjects || [])) {
            const totalPeriods = (subject.L !== undefined ? (subject.L + (subject.T || 0)) : subject.credits) || 3;
            const sessionDuration = subject.duration || 1;
            let remaining = totalPeriods;
            if (sessionDuration > 1 && remaining >= sessionDuration) {
                curr.subjects.push(new Subject(subject.code, subject.name, subject.credits, subject.type || "Theory", {
                    L: subject.L,
                    T: subject.T,
                    P: subject.P || 0,
                    faculty: subject.faculty || null,
                    facultyName: subject.facultyName || null,
                    isNonScheduled: subject.isNonScheduled || false,
                    duration: sessionDuration
                }));
                remaining -= sessionDuration;
            }
            while (remaining > 0) {
                curr.subjects.push(new Subject(subject.code, subject.name, subject.credits, subject.type || "Theory", {
                    L: subject.L,
                    T: subject.T,
                    P: subject.P || 0,
                    faculty: subject.faculty || null,
                    facultyName: subject.facultyName || null,
                    isNonScheduled: subject.isNonScheduled || false,
                    duration: 1
                }));
                remaining -= 1;
            }
        }

        // Labs - contiguous 2-hour practical sessions
        for (let lab of (item.labs || [])) {
            const duration = lab.P || 2;
            curr.labs.push(new Lab(lab.code, lab.name, lab.credits, {
                L: 0,
                T: 0,
                P: duration,
                faculty: lab.faculty || null,
                facultyName: lab.facultyName || null,
                preferredRoom: lab.preferredRoom || null,
                duration: duration
            }));
        }

        // Electives (OE and DE)
        for (let elective of (item.electives || [])) {
            const periods = (elective.L !== undefined ? elective.L : elective.credits) || 3;
            const electiveType = elective.type === "OE" || elective.code.startsWith("CS-30") ? "OE" : (elective.type || "DE");
            const basket = elective.basket || (electiveType === "OE" ? "Open Elective" : "Discipline Elective");
            for (let i = 0; i < periods; i++) {
                curr.electives.push(new Elective(elective.code, elective.name, elective.credits, {
                    L: elective.L,
                    T: elective.T,
                    P: elective.P || 0,
                    faculty: elective.faculty || null,
                    facultyName: elective.facultyName || null,
                    electiveType: electiveType,
                    basket: basket,
                    duration: 1
                }));
            }
        }

        // Special activities like SA-201
        for (let activity of (item.activities || [])) {
            curr.activities.push(new Subject(activity.code, activity.name, activity.credits, "Activity", {
                isReservedEmpty: activity.isReservedEmpty || false,
                duration: activity.P || 2
            }));
        }

        // Non-scheduled components (e.g. Summer Training CS-416, UG Project CS-499)
        if (item.nonScheduled) {
            curr.nonScheduled = item.nonScheduled.map(ns => new Subject(ns.code, ns.name, ns.credits, ns.type || "Project", {
                isNonScheduled: true
            }));
        }

        sections.push(curr);
    }
    return sections;
}

module.exports = { room_parse, subject_parse };
