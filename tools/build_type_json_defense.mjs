/*
raw data
https://pokeminers.com/ からDL
*/

// tools/build_type_json_defense.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

// === 入出力パス ===
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const INPUT  = path.resolve(__dirname, '../develop/data/raw/game_master.json');
const OUTPUT = path.resolve(__dirname, '../develop/data/type_defense.json');

// === 対応する18タイプ（GO準拠・和名表） ===
// ※ GOの倍率: 1.6(ばつぐん) / 1.0(等倍) / 0.625(いまひとつ) / 0(効果なし)
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

// GAME_MASTER のキー文字列
const toGM = t => `POKEMON_TYPE_${t}`;

// 和名辞書
const jaByEn = Object.fromEntries(TYPES.map(([en,ja]) => [en.toLowerCase(), ja]));

// 初期化（防御→攻撃の表: Map<defJa, Map<atkJa, multiplier>>）
const table = new Map();
TYPES.forEach(([defEn, defJa]) => {
  table.set(defJa, new Map(TYPES.map(([atkEn, atkJa]) => [jaByEn[atkEn.toLowerCase()], 1.0])));
});

function loadGM(file) {
  const txt = fs.readFileSync(file, 'utf8');
  return JSON.parse(txt);
}

function build() {
  console.log('Reading:', INPUT);
  const gm = loadGM(INPUT);

  // COMBAT_TYPE_EFFECTIVENESS の配列を抽出
  // 形はだいたい:
  // { templateId: 'COMBAT_TYPE_EFFECTIVENESS', data: { combatTypeEffectiveness: { attackType:'POKEMON_TYPE_FIRE', defenseType:'POKEMON_TYPE_GRASS', multiplier:1.6 } } }
  const nodes = [];
  for (const entry of gm || []) {
    const eff = entry?.data?.combatTypeEffectiveness;
    if (!eff) continue;
    nodes.push(eff);
  }
  if (nodes.length === 0) {
    console.warn('No COMBAT_TYPE_EFFECTIVENESS entries found.');
  }

  // 表に流し込み（防御視点）
  nodes.forEach(eff => {
    const atkEn = String(eff.attackType || '').replace('POKEMON_TYPE_', '');
    const defEn = String(eff.defenseType || '').replace('POKEMON_TYPE_', '');
    const mul   = Number(eff.multiplier ?? 1);

    // 18タイプ以外（SHADOW, STELLAR, UNKNOWN 等）は無視
    if (!jaByEn[atkEn.toLowerCase()] || !jaByEn[defEn.toLowerCase()]) return;

    const atkJa = jaByEn[atkEn.toLowerCase()];
    const defJa = jaByEn[defEn.toLowerCase()];

    const row = table.get(defJa);
    if (row) row.set(atkJa, mul);
  });

  // JSON 形に整形
  const out = TYPES.map(([defEn, defJa]) => {
    const row = table.get(jaByEn[defEn.toLowerCase()]);
    const effects = TYPES.map(([atkEn, atkJa]) => {
      const atkJaName = jaByEn[atkEn.toLowerCase()];
      const mul = Number(row?.get(atkJaName) ?? 1);
      return {
        type: atkEn.toLowerCase(),
        typeJa: atkJaName,
        multiplier: mul
      };
    });
    return {
      type: defEn.toLowerCase(),
      typeJa: defJa,
      effect: effects
    };
  });

  // 出力
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
