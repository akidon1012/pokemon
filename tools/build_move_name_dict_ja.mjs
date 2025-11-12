// tools/build_move_name_dict.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const JA_INPUT  = path.resolve(__dirname, '../develop/data/raw/texts_japanese.txt');
const EN_INPUT  = path.resolve(__dirname, '../develop/data/raw/texts_english.txt');
const OUTPUT    = path.resolve(__dirname, '../develop/data/move_name_dict.json');

function loadTextMap(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  const map = {};
  let currentId = null;

  for (const line of lines) {
    const mId = line.match(/^RESOURCE ID:\s*(.+)$/);
    if (mId) {
      currentId = mId[1].trim();
      continue;
    }
    const mText = line.match(/^TEXT:\s*(.+)$/);
    if (mText && currentId) {
      map[currentId] = mText[1].trim();
      currentId = null;
    }
  }
  return map;
}

function normalizeMoveKeyFromName(name) {
  // 例: "Thunder Shock" → "THUNDER_SHOCK"
  //     "X-Scissor" → "X_SCISSOR"
  let s = String(name).normalize('NFKC');
  s = s.toUpperCase();
  s = s.replace(/[^A-Z0-9]+/g, '_');
  s = s.replace(/^_+|_+$/g, '');
  return s;
}

function build() {
  const ja = loadTextMap(JA_INPUT);
  const en = loadTextMap(EN_INPUT);

  const out = {}; // key: MOVE_KEY, val: { en, ja, resourceId }

  Object.keys(en).forEach(id => {
    if (!id.startsWith('move_name_')) return;

    const enText = en[id];
    const jaText = ja[id] || enText;

    const key = normalizeMoveKeyFromName(enText);
    if (!key) return;

    out[key] = {
      resourceId: id,
      en: enText,
      ja: jaText
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote:', OUTPUT, `(keys=${Object.keys(out).length})`);
}

build();
