// tools/build_moves_localized.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const MOVES_INPUT = path.resolve(__dirname, '../develop/data/moves_master.json');
const NAME_DICT   = path.resolve(__dirname, '../develop/data/move_name_dict.json');
const OUTPUT      = path.resolve(__dirname, '../develop/data/moves_master_localized.json');

function normalizeMoveKeyFromId(id) {
  // 例: "THUNDER_SHOCK_FAST" → "THUNDER_SHOCK"
  //     "HYDRO_PUMP"        → "HYDRO_PUMP"
  let s = String(id || '').toUpperCase();

  // 末尾の分類っぽいものを削る（必要に応じてここを拡張）
  s = s.replace(/_FAST$/, '');
  s = s.replace(/_CHARGED$/, '');

  return s;
}

function build() {
  const moves = JSON.parse(fs.readFileSync(MOVES_INPUT, 'utf8'));
  const dict  = JSON.parse(fs.readFileSync(NAME_DICT, 'utf8'));

  const localized = moves.map(m => {
    const baseKey = normalizeMoveKeyFromId(m.id);
    const info = dict[baseKey];

    const nameEn = info?.en  || m.nameEn;
    const nameJa = info?.ja  || m.nameJa || m.nameEn;

    return {
      ...m,
      nameEn,
      nameJa,
      moveKey: baseKey,
      resourceId: info?.resourceId || null
    };
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(localized, null, 2), 'utf8');
  console.log('Wrote:', OUTPUT, `(rows=${localized.length})`);
}

build();
