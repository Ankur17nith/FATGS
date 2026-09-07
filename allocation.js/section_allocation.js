
const funcs = require('../FATGS/entities/functions.js');
const sections = funcs.subject_parse(path.join(__dirname, 'data/subjects_new_format.json'));

const randomInt = (max) => Math.floor(Math.random() * max);

const LAB_BLOCKS = [
  [0, 1],
  [2, 3]
];

const isFacultyFree = (faculty, dayIdx, slotIdx) => {
  return !sections.some(s => s.slots[dayIdx][slotIdx].faculty === faculty);
};


const lab_alloc = (sectionName,semester)=>{

  const index = data.findIndex(s => s.name === sectionName && s.semester === semester);
 if (index === -1) {
    console.warn(`No section found for ${sectionName} / ${semester}`);
    return null;
  }
  
  const section = sections[index];
  const totalCombos = section.days.length * LAB_BLOCKS.length;


   for (const lab of section.labs) {
    const alreadytried = new Set();
    let placed = false;

    while (tried.size < totalCombos && !placed) {
      const a = randomInt(section.days.length); 
      const b = randomInt(LAB_BLOCKS.length);  
      const comboKey = `${a}_${b}`;

      if (alreadytried.has(comboKey)) continue; 
      alreadytried.add(comboKey);

      const [i, j] = LAB_BLOCKS[b];
      const daySlots = section.slots[a];
  const slotA = daySlots[i];
      const slotB = daySlots[j];

      const bothFree = !slotA.booked && !slotB.booked && !slotA.isLunch && !slotB.isLunch
        && isFacultyFree(lab.faculty, a, i) && isFacultyFree(lab.faculty, a, j);

      if (bothFree) {
    slotA.booked = true;
        slotA.subject = lab.code;
    slotB.booked = true;
    slotB.subject = lab.code;
        placed = true;
      }


    }

if (!placed) {
      console.log(`Could not place lab ${lab.code} for section ${section.name}`);
    }
  }

  return section;
};


const subject_alloc= (sectionName,semester)

module.exports = { lab_alloc };

  