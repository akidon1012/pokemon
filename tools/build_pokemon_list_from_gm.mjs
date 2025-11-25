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

// ★ GO メタ／オーバーライドは data 直下
const GO_META          = path.resolve(DATA_DIR, 'pokemon_go_meta.json');
const GO_META_OVERRIDE = path.resolve(DATA_DIR, 'pokemon_go_meta_override.json');

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
 *   V0006_POKEMON_CHARIZARD        → ""
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
 * build 用のフォーム分類
 *   - base    : 通常フォーム（図鑑Noごとに 1 件）
 *   - region  : リージョンフォーム（No + 地方ごとに 1 件）
 *   - mega    : メガ進化（フォームごと）
 *   - primal  : ゲンシカイキ（フォームごと）
 *   - other   : コスチュームなど（除外）
 */
function classifyFormForBuild(p) {
  const formRaw = String(p.form || '');
  const f       = formRaw.toUpperCase();

  // 図鑑Noベースのキー
  const no = (p.no != null) ? p.no
            : (p.dex != null) ? p.dex
            : (p.pokedex_id != null) ? p.pokedex_id
            : null;

  const speciesKey = (no != null) ? String(no)
                    : (p.speciesId || p.pokemonId || p.id || '').toString();

  const isMega =
    p.isMegaEvolution === true ||
    /TEMP_EVOLUTION_MEGA/.test(f) ||
    /_MEGA(_[A-Z]+)?$/.test(f);

  const isPrimal = /PRIMAL/.test(f);

  let region = null;
  if (/ALOLA|ALOLAN/.test(f))       region = 'alola';
  else if (/HISUI|HISUIAN/.test(f)) region = 'hisui';
  else if (/GALAR|GALARIAN/.test(f))region = 'galar';
  else if (/PALDEA|PALDEAN/.test(f))region = 'paldea';

  const isBase =
    !formRaw ||
    /_NORMAL$/.test(f) ||
    f === String(p.pokemonId || '').toUpperCase();

  if (isMega) {
    return { kind: 'mega',   key: speciesKey + '|mega|'   + f, region: null };
  }
  if (isPrimal) {
    return { kind: 'primal', key: speciesKey + '|primal|' + f, region: null };
  }
  if (region) {
    return { kind: 'region', key: speciesKey + '|region|' + region, region: region };
  }
  if (isBase) {
    return { kind: 'base',   key: speciesKey + '|base',   region: null };
  }

  return { kind: 'other', key: speciesKey + '|other|' + f, region: null };
}

/**
 * pokemon_go_meta.json ＋ pokemon_go_meta_override.json から
 * メガ／ゲンシ用のエントリを pokemon_list にマージする
 */
function mergeMegaAndPrimalFromOverride(list, nameDict) {
  console.log('[mergeMega] start');
  console.log('[mergeMega] GO_META =', GO_META, 'exists?', fs.existsSync(GO_META));
  console.log('[mergeMega] GO_META_OVERRIDE =', GO_META_OVERRIDE, 'exists?', fs.existsSync(GO_META_OVERRIDE));

  let metaList = [];
  let overrideMap = {};

  // 既存の no + form をキーにして保持
  const existing = new Set(
    list.map(p => `${p.no}|${p.form || ''}`)
  );

  // ---- GO メタ本体を読み込み ----
  try {
    if (fs.existsSync(GO_META)) {
      const raw = JSON.parse(fs.readFileSync(GO_META, 'utf8') || '[]');
      metaList = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw.list) ? raw.list : []);
      console.log('[mergeMega] metaList length =', metaList.length);
    } else {
      console.log('[mergeMega] no GO_META file:', GO_META);
    }
  } catch (e) {
    console.error('[mergeMega] failed to load GO_META:', e);
  }

  // pokemonId → 「ベース形態」のメタを引けるようにしておく
  const metaBaseById = {};
  metaList.forEach(m => {
    if (!m || !m.pokemonId) return;

    const form = String(m.form || '');
    const isNormal =
      !form ||
      /_NORMAL$/i.test(form);

    if (!metaBaseById[m.pokemonId]) {
      metaBaseById[m.pokemonId] = m;
    }
    if (isNormal) {
      // NORMAL があればそれを優先
      metaBaseById[m.pokemonId] = m;
    }
  });

  // ---- override（メガ／ゲンシの種族値）を読み込み ----
  try {
    if (fs.existsSync(GO_META_OVERRIDE)) {
      const raw = JSON.parse(fs.readFileSync(GO_META_OVERRIDE, 'utf8') || '{}');
      if (raw && typeof raw === 'object') {
        overrideMap = raw;
      }
      console.log('[mergeMega] override keys =', Object.keys(overrideMap).length);
    } else {
      console.log('[mergeMega] no GO_META_OVERRIDE file:', GO_META_OVERRIDE);
    }
  } catch (e) {
    console.error('[mergeMega] failed to load GO_META_OVERRIDE:', e);
  }

  const extras = [];

  Object.keys(overrideMap).forEach(key => {
    const ov = overrideMap[key];
    if (!ov) return;

    const basePokemonId = ov.basePokemonId;
    if (!basePokemonId) return;

    const form = key; // override のキーをそのままフォーム名として使う
    const tag  = String(ov.tempId || key).toUpperCase();

    const isPrimal = tag.includes('PRIMAL');
    const isMega   = tag.includes('MEGA') && !isPrimal;

    if (!isMega && !isPrimal) {
      // 念のため Mega / Primal 以外は無視
      return;
    }

    // ベースのメタ情報を取得
    let baseMeta = metaBaseById[basePokemonId] || null;

    // meta にない場合は、既存 list から拾う
    if (!baseMeta) {
      const fromList = list.find(p => p.pokemonId === basePokemonId);
      if (fromList) {
        baseMeta = {
          no:        fromList.no,
          pokemonId: fromList.pokemonId,
          typesEn:   fromList.typesEn,
          typesJa:   fromList.typesJa,
          stats: {
            stamina: fromList.baseStats?.hp,
            attack:  fromList.baseStats?.attack,
            defence: fromList.baseStats?.defence
          }
        };
      }
    }

    if (!baseMeta || !baseMeta.no) {
      // 図鑑Noが分からない場合はあきらめる
      return;
    }

    const no        = baseMeta.no;
    const keyNoForm = `${no}|${form}`;

    if (existing.has(keyNoForm)) {
      // すでに同じ no + form のエントリがある
      return;
    }

    // タイプはまず baseMeta.typesEn / typesJa を使う
    const typesEn = Array.isArray(baseMeta.typesEn) ? baseMeta.typesEn.slice() : [];
    const typesJa = Array.isArray(baseMeta.typesJa) && baseMeta.typesJa.length
      ? baseMeta.typesJa.slice()
      : typesEn
          .map(t => toTypeJa('POKEMON_TYPE_' + String(t).toUpperCase()))
          .filter(Boolean);

    // 種族値は override から
    const hp  = Number(ov.stats?.stamina ?? 0);
    const atk = Number(ov.stats?.attack  ?? 0);
    const def = Number(ov.stats?.defence ?? 0);
    const baseTotal = hp + atk + def;

    // 名前は辞書からベース名を引き、その上に「メガ／ゲンシ」を付ける
    const fromNo = nameDict.byNo[no] || {};
    const fromId = nameDict.byId[basePokemonId] || {};

    const baseJa = fromId.ja || fromNo.ja || basePokemonId;
    const baseEn = fromId.en || fromNo.en || basePokemonId;

    const nameJa = (isPrimal ? 'ゲンシ' : 'メガ') + baseJa;
    const nameEn = (isPrimal ? 'Primal ' : 'Mega ') + baseEn;

    extras.push({
      id:        no,
      no,
      pokemonId: key,   // 一意であれば何でもよいが、とりあえず override のキーをそのまま使う
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
      moves: {
        normal:  [],
        special: []
      }
    });

    existing.add(keyNoForm);
  });

  if (extras.length) {
    console.log('[mergeMega] add extra mega/primal forms:', extras.length);
    extras.forEach(p => list.push(p));
  } else {
    console.log('[mergeMega] no extra forms added');
  }
}

/**
 * メイン処理
 */
function build() {
  const gm       = loadGameMaster();
  const nameDict = buildPokemonNameDict(); // { byNo, byId }

  const rawList  = [];

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

    // 名前を辞書から取得（no / pokemonId の両方試す）
    const fromNo = nameDict.byNo[no] || {};
    const fromId = nameDict.byId[pokemonId] || {};

    const nameJa = fromId.ja || fromNo.ja || pokemonId;
    const nameEn = fromId.en || fromNo.en || pokemonId;

    rawList.push({
      id:        no,
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
      moves: {
        normal:  [],
        special: []
      }
    });
  });

  console.log('[build] rawList length =', rawList.length);

  // === 図鑑Noベースの重複排除（フォーム統合ルールに従う） ===
  const seen = Object.create(null);
  const list = [];

  rawList.forEach(p => {
    const c = classifyFormForBuild({
      no:        p.no,
      pokemonId: p.pokemonId,
      form:      p.form,
      id:        p.id
    });

    if (c.kind === 'other') return;
    if (seen[c.key]) return;
    seen[c.key] = true;

    // base は form を空にしておく（NORMAL を統合）
    const outputForm = (c.kind === 'base') ? '' : p.form;

    list.push({
      ...p,
      form: outputForm
    });
  });

  console.log('[build] deduped length =', list.length);

  // === メガ／ゲンシを GO_META_OVERRIDE からマージ ===
  mergeMegaAndPrimalFromOverride(list, nameDict);

  // === sort & write ===
  list.sort((a, b) => {
    if (a.no !== b.no) return a.no - b.no;
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
