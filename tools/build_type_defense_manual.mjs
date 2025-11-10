// tools/build_type_defense_manual.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

// ???????????????OK?
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, '../develop/data/type_defense.json');

// 18???????
const TYPES = [
  'normal','fire','water','grass','electric','ice',
  'fighting','poison','ground','flying','psychic',
  'bug','rock','ghost','dragon','dark','steel','fairy'
];

// ???
const JA = {
  normal:'????', fire:'???', water:'??', grass:'??',
  electric:'???', ice:'???', fighting:'????', poison:'??',
  ground:'???', flying:'???', psychic:'????', bug:'??',
  rock:'??', ghost:'????', dragon:'????', dark:'??',
  steel:'???', fairy:'?????'
};

// ????????????1.6?
const SUPER = {
  normal: [],
  fire:    ['grass','ice','bug','steel'],
  water:   ['fire','ground','rock'],
  electric:['water','flying'],
  grass:   ['water','ground','rock'],
  ice:     ['grass','ground','flying','dragon'],
  fighting:['normal','ice','rock','dark','steel'],
  poison:  ['grass','fairy'],
  ground:  ['fire','electric','poison','rock','steel'],
  flying:  ['grass','fighting','bug'],
  psychic: ['fighting','poison'],
  bug:     ['grass','psychic','dark'],
  rock:    ['fire','ice','flying','bug'],
  ghost:   ['psychic','ghost'],
  dragon:  ['dragon'],
  dark:    ['psychic','ghost'],
  steel:   ['ice','rock','fairy'],
  fairy:   ['fighting','dragon','dark']
};

// ?????????????0.625?
const NOT_VERY = {
  normal:['rock','steel'],
  fire:['fire','water','rock','dragon'],
  water:['water','grass','dragon'],
  electric:['electric','grass','dragon'],
  grass:['fire','grass','poison','flying','bug','dragon','steel'],
  ice:['fire','water','ice','steel'],
  fighting:['poison','flying','psychic','bug','fairy'],
  poison:['poison','ground','rock','ghost'],
  ground:['grass','bug'],
  flying:['electric','rock','steel'],
  psychic:['psychic','steel'],
  bug:['fire','fighting','poison','flying','ghost','steel','fairy'],
  rock:['fighting','ground','steel'],
  ghost:['dark'],
  dragon:['steel'],
  dark:['fighting','dark','fairy'],
  steel:['fire','water','electric','steel'],
  fairy:['fire','poison','steel']
};

// ??????????????0.39?
const IMMUNE = {
  normal:['ghost'],
  fire:[],
  water:[],
  electric:['ground'],
  grass:[],
  ice:[],
  fighting:['ghost'],
  poison:['steel'],
  ground:['flying'],
  flying:[],
  psychic:['dark'],
  bug:[],
  rock:[],
  ghost:['normal'],
  dragon:['fairy'],
  dark:[],
  steel:[],
  fairy:[]
};

// GO ??????1.6 / 0.625 / 0.39 / 1.0?
// ???? value ?????+1:????, 0:??, -1:?????, -2:?????
function getMultiplier(att, def) {
  if (IMMUNE[att]?.includes(def))  return { mult: 0.39,  value: -2 };
  if (SUPER[att]?.includes(def))   return { mult: 1.6,   value:  1 };
  if (NOT_VERY[att]?.includes(def))return { mult: 0.625, value: -1 };
  return { mult: 1.0, value: 0 };
}

// ?????????????????????????????
const out = TYPES.map(defEn => {
  const defJa = JA[defEn];
  const effects = TYPES.map(attEn => {
    const attJa = JA[attEn];
    const { mult, value } = getMultiplier(attEn, defEn);
    return {
      type: attEn,      // ?????(?)
      typeJa: attJa,    // ?????(?)
      multiplier: mult, // 1.6 / 1.0 / 0.625 / 0.39
      value: value      // +1 / 0 / -1 / -2
    };
  });
  return {
    type: defEn,   // ?????(?)
    typeJa: defJa, // ?????(?)
    effect: effects
  };
});

// JSON ??
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote:', OUTPUT, `(rows=${out.length})`);
