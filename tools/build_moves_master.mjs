// tools/build_moves_master.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

// === パス ===
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const INPUT  = path.resolve(__dirname, '../develop/data/raw/game_master.json');
const OUTPUT = path.resolve(__dirname, '../develop/data/moves_master.json');

// タイプ和名
const TYPE_JA = {
  normal:'ノーマル', fire:'ほのお', water:'みず', grass:'くさ',
  electric:'でんき', ice:'こおり', fighting:'かくとう', poison:'どく',
  ground:'じめん', flying:'ひこう', psychic:'エスパー', bug:'むし',
  rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン', dark:'あく',
  steel:'はがね', fairy:'フェアリー'
};

function toTypeEn(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/^POKEMON_TYPE_/, '').toLowerCase();
  return TYPE_JA[s] ? s : null;
}
function toTypeJa(raw) {
  const en = toTypeEn(raw);
  return en ? TYPE_JA[en] : null;
}

function loadGM(file) {
  const txt = fs.readFileSync(file, 'utf8');
  return JSON.parse(txt);
}

function build() {
  console.log('[moves] Reading:', INPUT);
  const gm = loadGM(INPUT);

  const moves = [];

  (gm || []).forEach(entry => {
    // ★ ここをかなり緩める：テンプレIDでは絞らない
    const data = entry?.data || {};

    const m =
      data.combatMove ||
      data.combatMoveSettings ||
      data.obCombatMoveSettings ||
      data.obCombatMove ||
      null;

    if (!m) return; // 技データっぽくなければスキップ

    const templateId = String(entry.templateId || '');

    const id =
      m.uniqueId ||
      m.moveId ||
      m.movementId ||         // 念のため
      templateId ||
      'UNKNOWN_MOVE';

    const typeEn = toTypeEn(m.type);
    const typeJa = toTypeJa(m.type);

    const power  = Number(m.power ?? m.pvePower ?? 0);
    const energy = Number(m.energyDelta ?? 0);
    const durationTurns = Number(m.durationTurns ?? 0);

    // ざっくり FAST がついてたらノーマル技、それ以外はスペシャル扱い
    const upperId = String(id).toUpperCase();
    const category =
      /_FAST$/.test(upperId) || /QUICK/i.test(upperId)
        ? 'normal'
        : 'special';

    moves.push({
      id,
      nameEn: id,
      nameJa: id,
      type: typeEn,
      typeJa,
      category,       // 'normal' or 'special'
      power,
      energy,
      durationTurns
    });
  });

  console.log('[moves] count =', moves.length);

  // データ0件なら、デバッグ用に先頭数件の templateId を出す
  if (moves.length === 0) {
    console.warn('[moves] no moves found. First 20 templateIds:');
    (gm || []).slice(0, 20).forEach(e => {
      console.warn('  -', e.templateId, 'keys:', Object.keys(e.data || {}));
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(moves, null, 2), 'utf8');
  console.log('[moves] Wrote:', OUTPUT);
}

try {
  build();
} catch (e) {
  console.error('[build_moves_master ERROR]', e);
  process.exit(1);
}
