const path = require('path');
const funcs = require('./entities/functions.js');

const data = funcs.subject_parse(path.join(__dirname, 'data/subjects.json'));

console.dir(data, { depth: null, colors: true });

