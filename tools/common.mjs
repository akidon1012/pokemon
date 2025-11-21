// tools/common.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

// ルート・データパス -------------------------------------------------
export const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
export const ROOT_DIR  = path.resolve(__dirname, '..');
export const DATA_DIR  = path.resolve(ROOT_DIR, 'develop', 'data');
export const RAW_DIR   = path.resolve(DATA_DIR, 'raw');

export const GAME_MASTER_PATH = path.resolve(RAW_DIR, 'game_master.json');

// game_master.json 読み込み ------------------------------------------
export function loadGameMaster() {
  const txt = fs.readFileSync(GAME_MASTER_PATH, 'utf8');
  return JSON.parse(txt);
}

// タイプ定義 ----------------------------------------------------------
export const TYPE_EN_LIST = [
  'normal','fire','water','grass','electric','ice',
  'fighting','poison','ground','flying','psychic',
  'bug','rock','ghost','dragon','dark','steel','fairy'
];

export const TYPE_JA_MAP = {
  normal:'ノーマル', fire:'ほのお', water:'みず', grass:'くさ',
  electric:'でんき', ice:'こおり', fighting:'かくとう', poison:'どく',
  ground:'じめん', flying:'ひこう', psychic:'エスパー', bug:'むし',
  rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン', dark:'あく',
  steel:'はがね', fairy:'フェアリー'
};

export function toTypeEn(raw) {
  if (!raw) return null;
  // 例: "POKEMON_TYPE_WATER" → "water"
  const s = String(raw).replace(/^POKEMON_TYPE_/, '').toLowerCase();
  return TYPE_EN_LIST.includes(s) ? s : null;
}

export function toTypeJa(raw) {
  const en = toTypeEn(raw);
  if (!en) return null;
  return TYPE_JA_MAP[en] || en;
}

// JSONデータ自動生成
// npm run build:data:all
