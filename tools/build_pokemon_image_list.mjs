// tools/build_pokemon_image_list.mjs
import fs from 'fs';
import path from 'path';
import { __dirname, DATA_DIR } from './common.mjs';

// ★ ここは環境に合わせてパスを調整
// 例）tools/ の1つ上に images/pokemon がある場合
const ICON_DIR = path.resolve(__dirname, '../develop/images/pokemon');

// 出力先：とりあえず data 配下に JS を吐く
const OUTPUT_JS = path.resolve(DATA_DIR, 'pokemon_image_list.js');

function build() {
  if (!fs.existsSync(ICON_DIR)) {
    throw new Error('ICON_DIR が見つかりません: ' + ICON_DIR);
  }

  const files = fs.readdirSync(ICON_DIR)
    .filter(f => /^pokemon_icon_.*\.png$/i.test(f))
    .sort();

  const js = [
    '// 自動生成ファイル: pokemon 画像ファイル一覧',
    '// 更新したいときは node tools/build_pokemon_image_list.mjs を再実行',
    '',
    'var POKEMON_IMAGE_FILE_LIST = ' + JSON.stringify(files, null, 2) + ';',
    'if (typeof window !== \'undefined\') {',
    '  window.POKEMON_IMAGE_FILE_LIST = POKEMON_IMAGE_FILE_LIST;',
    '}',
    ''
  ].join('\n');

  fs.writeFileSync(OUTPUT_JS, js, 'utf8');
  console.log('Wrote:', OUTPUT_JS, `(files=${files.length})`);
}

try {
  build();
} catch (e) {
  console.error('[build_pokemon_image_list] ERROR:', e);
  process.exit(1);
}
