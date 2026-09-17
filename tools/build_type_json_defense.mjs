/*
raw data
https://pokeminers.com/ からDL
*/

// tools/build_type_json_defense.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const INPUT  = path.resolve(__dirname, '../develop/data/raw/game_master.json');
const OUTPUT = path.resolve(__dirname, '../develop/data/type_defense.json');

// 出力順（画面・既存 type_defense.json と同じ）
const TYPES = [
  ['NORMAL','ノーマル'],
  ['FIRE','ほのお'],
  ['WATER','みず'],
  ['GRASS','くさ'],
  ['ELECTRIC','でんき'],
  ['ICE','こおり'],
  ['FIGHTING','かくとう'],
  ['POISON','どく'],
  ['GROUND','じめん'],
  ['FLYING','ひこう'],
  ['PSYCHIC','エスパー'],
  ['BUG','むし'],
  ['ROCK','いわ'],
  ['GHOST','ゴースト'],
  ['DRAGON','ドラゴン'],
  ['DARK','あく'],
  ['STEEL','はがね'],
  ['FAIRY','フェアリー']
];

// Game Master の attackScalar インデックス順
const GM_TYPE_ORDER = [
  'NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL',
  'FIRE','WATER','GRASS','ELECTRIC','PSYCHIC','ICE','DRAGON','DARK','FAIRY'
];

const jaByEn = Object.fromEntries(TYPES.map(([en, ja]) => [en.toLowerCase(), ja]));

function loadGM(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function toValue(mul) {
  if (Math.abs(mul - 1.6) < 1e-9) return 1;
  if (Math.abs(mul - 0.625) < 1e-9) return -1;
  if (Math.abs(mul - 0.390625) < 1e-9) return -2;
  return 0;
}

function build() {
  console.log('Reading:', INPUT);
  const gm = loadGM(INPUT);

  const byDef = {};
  TYPES.forEach(([en]) => {
    byDef[en.toLowerCase()] = {};
  });

  let rows = 0;
  for (const entry of gm || []) {
    const te = entry?.data?.typeEffective;
    if (!te) continue;

    const atkEn = String(te.attackType || '')
      .replace(/^POKEMON_TYPE_/, '')
      .toLowerCase();
    if (!jaByEn[atkEn]) continue;

    const scalars = te.attackScalar;
    if (!Array.isArray(scalars) || !scalars.length) continue;
    if (scalars.length !== GM_TYPE_ORDER.length) {
      console.warn(
        `[type_defense] ${te.attackType} attackScalar length=${scalars.length}, expected ${GM_TYPE_ORDER.length}`
      );
    }

    GM_TYPE_ORDER.forEach((defUpper, i) => {
      if (i >= scalars.length) return;
      const defEn = defUpper.toLowerCase();
      if (!jaByEn[defEn]) return;
      const mul = Number(scalars[i]);
      if (!Number.isFinite(mul)) return;
      byDef[defEn][atkEn] = mul;
    });
    rows += 1;
  }

  console.log('[type_defense] typeEffective rows =', rows);
  if (rows === 0) {
    throw new Error('typeEffective が見つかりません');
  }

  const out = TYPES.map(([defEn, defJa]) => {
    const defKey = defEn.toLowerCase();
    const effects = TYPES.map(([atkEn]) => {
      const atkKey = atkEn.toLowerCase();
      const mul = Number(byDef[defKey][atkKey] ?? 1);
      return {
        type: atkKey,
        typeJa: jaByEn[atkKey],
        multiplier: mul,
        value: toValue(mul)
      };
    });
    return {
      type: defKey,
      typeJa: defJa,
      effect: effects
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote:', OUTPUT, `(rows=${out.length})`);
}

try {
  build();
} catch (e) {
  console.error(e);
  process.exit(1);
}
