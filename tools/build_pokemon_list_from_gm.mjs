// tools/build_pokemon_list_from_gm.mjs
import fs from 'fs';
import path from 'path';
import {
  __dirname,
  DATA_DIR,
  loadGameMaster,
  toTypeEn,
  toTypeJa
} from './common.mjs';

const OUTPUT   = path.resolve(DATA_DIR, 'pokemon_list.json');
const RAW_DIR  = path.resolve(DATA_DIR, 'raw');
const JA_TEXTS = path.resolve(RAW_DIR, 'texts_japanese.txt');
const EN_TEXTS = path.resolve(RAW_DIR, 'texts_english.txt');

/**
 * texts_*.txt をパースして
 *   { "pokemon_name_0270": "ハスボー", ... }
 * みたいなマップにする
 */
function loadTextMap(file) {
  const txt   = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  const map   = {};
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

/**
 * pokemon_name_* 系のリソースから
 *   - 図鑑番号ベース
 *   - pokemonId ベース
 * 両方の辞書を作る
 *
 * result.byNo[1]        → { ja: "フシギダネ", en: "Bulbasaur" }
 * result.byId["LOTAD"]  → { ja: "ハスボー",   en: "Lotad" }
 */
function buildPokemonNameDict() {
  const ja = loadTextMap(JA_TEXTS);
  const en = loadTextMap(EN_TEXTS);

  const byNo = {}; // key: national dex no (Number)
  const byId = {}; // key: pokemonId (e.g. "BULBASAUR")

  const ids = new Set([...Object.keys(ja), ...Object.keys(en)]);

  ids.forEach(resId => {
    if (!resId.startsWith('pokemon_name_')) return;

    const body = resId.replace(/^pokemon_name_/, '').trim();
    if (!body) return;

    const jaText = ja[resId] || en[resId] || '';
    const enText = en[resId] || ja[resId] || '';

    // パターンA: 純粋な番号 "0270"
    const mNum = body.match(/^0*([0-9]+)$/);
    if (mNum) {
      const no = Number(mNum[1]);
      if (no) {
        byNo[no] = {
          ja: jaText || enText || String(no),
          en: enText || jaText || String(no)
        };
      }
      return;
    }

    // パターンB: "V0258_POKEMON_MUDKIP" など
    const mGm = body.match(/^V0*([0-9]+)_POKEMON_([A-Z0-9_]+)$/);
    if (mGm) {
      const no        = Number(mGm[1]);
      const pokemonId = mGm[2]; // "MUDKIP"

      if (no) {
        byNo[no] = {
          ja: jaText || enText || String(no),
          en: enText || jaText || String(no)
        };
      }
      if (pokemonId) {
        byId[pokemonId] = {
          ja: jaText || enText || pokemonId,
          en: enText || jaText || pokemonId
        };
      }
      return;
    }

    // パターンC: 末尾がそのまま pokemonId のケース
    //   pokemon_name_MUDKIP
    //   pokemon_name_CHARIZARD_MEGA_X など
    const mId = body.match(/([A-Z0-9_]+)$/);
    if (mId) {
      const pokemonId = mId[1];
      if (pokemonId) {
        byId[pokemonId] = {
          ja: jaText || enText || pokemonId,
          en: enText || jaText || pokemonId
        };
      }
    }
  });

  console.log('[buildPokemonNameDict] byNo =', Object.keys(byNo).length,
              'byId =', Object.keys(byId).length);
  return { byNo, byId };
}

/**
 * templateId から全国図鑑番号を引っこ抜く
 *   V0001_POKEMON_BULBASAUR → 1
 */
function parseDexNo(templateId) {
  const m = String(templateId || '').match(/^V0*([0-9]+)_POKEMON_/);
  return m ? Number(m[1]) : null;
}

/**
 * templateId から「フォーム名」を抜き出す
 *   V0006_POKEMON_CHARIZARD      → ""
 *   V0006_POKEMON_CHARIZARD_MEGA_X → "CHARIZARD_MEGA_X"
 */
function parseForm(templateId, pokemonId) {
  const m = String(templateId || '').match(/^V0*[0-9]+_POKEMON_(.+)$/);
  if (!m) return '';
  const suffix = m[1];
  if (!suffix || suffix === String(pokemonId || '')) return '';
  return suffix;
}

/**
 * UIのポケモンリストに含めるかどうか
 *   - コスチューム / サングラス / 季節衣装 / シャドウ / ライト は除外
 *   - メガ / ゲンシ は残す
 */
function isAllowedForm(form) {
  if (!form) return true; // 通常

  const f = String(form).toUpperCase();

  // シャドウ / ライト系
  if (f.includes('SHADOW'))   return false;
  if (f.includes('PURIFIED')) return false;

  // 体格違い
  if (f.includes('XS'))       return false;
  if (f.includes('XL'))       return false;

  // コスチューム / 季節イベント
  if (f.includes('COSTUME'))      return false;
  if (f.includes('HOLIDAY'))      return false;
  if (f.includes('FALL'))         return false;
  if (f.includes('SPRING'))       return false;
  if (f.includes('SUMMER'))       return false;
  if (f.includes('WINTER'))       return false;
  if (f.includes('PARTY_HAT'))    return false;
  if (f.includes('HAT'))          return false;
  if (f.includes('RIBBON'))       return false;
  if (f.includes('FLOWER_CROWN')) return false;
  if (f.includes('SUNGLASSES'))   return false;
  if (f.includes('SCARF'))        return false;

  // メガ / ゲンシは残したい
  if (f.includes('MEGA'))   return true;
  if (f.includes('PRIMAL')) return true;

  // よく分からないフォームはひとまず残す（気になったら後で個別に除外）
  return true;
}

/**
 * メイン処理
 */
function build() {
  const gm       = loadGameMaster();
  const nameDict = buildPokemonNameDict(); // { byNo, byId }
  const list     = [];

  gm.forEach(entry => {
    const ps = entry?.data?.pokemonSettings;
    if (!ps) return;

    const templateId = String(entry.templateId || '');
    const no         = parseDexNo(templateId);
    if (!no) return;

    const rawPokemonId = ps.pokemonId;
    const pokemonId    = String(rawPokemonId || '');
    const form         = parseForm(templateId, pokemonId);

    if (!isAllowedForm(form)) return;

    // タイプ
    const type1En = toTypeEn(ps.type);
    const type2En = toTypeEn(ps.type2);
    const typesEn = [type1En, type2En].filter(Boolean);
    const typesJa = typesEn
      .map(t => toTypeJa(`POKEMON_TYPE_${t.toUpperCase()}`))
      .filter(Boolean);

    // 種族値（GO基準）
    const stats   = ps.stats || {};
    const hp      = Number(stats.baseStamina ?? 0);
    const atk     = Number(stats.baseAttack  ?? 0);
    const def     = Number(stats.baseDefense ?? 0);
    const baseTotal = hp + atk + def;

    // ★ 名前を辞書から取得（no / pokemonId の両方試す）
    const fromNo = nameDict.byNo[no] || {};
    const fromId = nameDict.byId[pokemonId] || {};

    const nameJa = fromId.ja || fromNo.ja || pokemonId;
    const nameEn = fromId.en || fromNo.en || pokemonId;

    list.push({
      id:        no,          // ひとまず no をそのまま
      no,
      pokemonId,
      form,
      name:  nameJa, 
      nameJa,
      nameEn,
      typesJa,
      typesEn,
      baseStats: {
        hp,
        attack:  atk,
        defence: def
      },
      baseTotal,
      // このファイルは「ポケモン名から選ぶリスト」用なので
      // 技情報はここでは空のままでOK（recommend側は GO_META / MOVES から取る）
      moves: {
        normal:  [],
        special: []
      }
    });
  });

  // 重複（同じ no + form など）がない前提だが、
  // 念のため no → form → で sort しておく
  list.sort((a, b) => {
    if (a.no !== b.no) return a.no - b.no;
    // 通常フォームを先に、そのあとに MEGA / PRIMAL など
    const fa = a.form || '';
    const fb = b.form || '';
    return fa.localeCompare(fb);
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({ list }, null, 2), 'utf8');
  console.log('Wrote:', OUTPUT, `(rows=${list.length})`);
}

try {
  build();
} catch (e) {
  console.error('[build_pokemon_list_from_gm] ERROR:', e);
  process.exit(1);
}
