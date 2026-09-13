class Subject {
    constructor(code, name, credit, type = "Theory", options = {}) {
        this.code = code;
        this.name = name;
        this.credit = credit;
        this.type = type;
        this.L = options.L !== undefined ? options.L : (type === "Lab" ? 0 : credit);
        this.T = options.T || 0;
        this.P = options.P !== undefined ? options.P : (type === "Lab" ? 2 : 0);
        this.faculty = options.faculty || null;
        this.facultyName = options.facultyName || null;
        this.isLab = (type === "Lab");
        this.duration = options.duration || (this.isLab ? 2 : 1);
        this.electiveType = options.electiveType || null;
        this.basket = options.basket || null;
        this.isReservedEmpty = options.isReservedEmpty || false;
        this.isNonScheduled = options.isNonScheduled || false;
        this.preferredRoom = options.preferredRoom || null;
    }
}

class Lab extends Subject {
    constructor(code, name, credit, options = {}) {
        super(code, name, credit, "Lab", { ...options, isLab: true, duration: options.duration || 2 });
    }
}

class Elective extends Subject {
    constructor(code, name, credit, options = {}) {
        super(code, name, credit, "Elective", options);
    }
}

module.exports = { Subject, Lab, Elective };