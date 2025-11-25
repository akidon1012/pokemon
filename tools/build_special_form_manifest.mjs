// tools/build_special_form_manifest.mjs
import fs from 'fs';
import path from 'path';
import {
  __dirname,
  DATA_DIR,
} from './common.mjs';

const META_FILE       = path.resolve(DATA_DIR, 'pokemon_go_meta.json');
const META_OVERRIDE   = path.resolve(DATA_DIR, 'pokemon_go_meta_override.json');
const LIST_FILE       = path.resolve(DATA_DIR, 'pokemon_list.json');
const OUTPUT_MANIFEST = path.resolve(DATA_DIR, 'pokemon_special_forms_manifest.json');

// ----- 共通ユーティリティ -----
function loadJsonArray(file) {
  const txt  = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(txt);
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.list)) return json.list;
  return [];
}

function loadJsonObject(file) {
  if (!fs.existsSync(file)) return {};
  const txt = fs.readFileSync(file, 'utf8');
  return JSON.parse(txt) || {};
}

// pokemon_list.json から「no / pokemonId → 日本語名」を作る
function buildNameDict() {
  const listJson = loadJsonObject(LIST_FILE);
  const list     = Array.isArray(listJson.list) ? listJson.list : [];

  const byNo = new Map();
  const byId = new Map();

  list.forEach(p => {
    if (!p) return;
    const nameJa = p.nameJa || p.name || '';
    if (p.no != null && nameJa) {
      if (!byNo.has(p.no)) byNo.set(p.no, nameJa);
    }
    if (p.pokemonId && nameJa) {
      const key = String(p.pokemonId).toUpperCase();
      if (!byId.has(key)) byId.set(key, nameJa);
    }
  });

  return { byNo, byId };
}

// searchPokemon.classifyForm と同等の分類
function classifyForm(p) {
  const formRaw = String(p.form || '');
  const f       = formRaw.toUpperCase();

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

  if (isMega)   return { kind: 'mega',   key: speciesKey + '|mega|'   + f, region: null };
  if (isPrimal) return { kind: 'primal', key: speciesKey + '|primal|' + f, region: null };
  if (region)   return { kind: 'region', key: speciesKey + '|region|' + region, region };
  if (isBase)   return { kind: 'base',   key: speciesKey + '|base',   region: null };

  return { kind: 'other', key: speciesKey + '|other|' + f, region: null };
}

// ★「のすがた」無しのラベルを付ける
function buildLabelJa(baseNameJa, kind, p, region) {
  const base = baseNameJa || p.nameJa || p.name || '';

  if (kind === 'mega') {
    const form = String(p.form || '').toUpperCase();
    if (/CHARIZARD_MEGA_X/.test(form) || /TEMP_EVOLUTION_MEGA_X/.test(form)) {
      return 'メガリザードンX';
    }
    if (/CHARIZARD_MEGA_Y/.test(form) || /TEMP_EVOLUTION_MEGA_Y/.test(form)) {
      return 'メガリザードンY';
    }
    return 'メガ' + base;
  }

  if (kind === 'primal') {
    if (/GROUDON/i.test(p.pokemonId)) return 'ゲンシグラードン';
    if (/KYOGRE/i.test(p.pokemonId))  return 'ゲンシカイオーガ';
    return 'ゲンシ' + base;
  }

  if (kind === 'region') {
    let regionLabel = '';
    switch (region) {
      case 'alola':  regionLabel = 'アローラ'; break;
      case 'galar':  regionLabel = 'ガラル';  break;
      case 'hisui':  regionLabel = 'ヒスイ';  break;
      case 'paldea': regionLabel = 'パルデア';break;
      default:       regionLabel = '';        break;
    }
    if (regionLabel) {
      // 「キュウコン（アローラ）」形式
      return `${base}（${regionLabel}）`;
    }
    // region 名が不明なら一応ベース名のみ
    return base;
  }

  return base;
}

function build() {
  const meta       = loadJsonArray(META_FILE);
  const overrides  = loadJsonObject(META_OVERRIDE);
  const nameDict   = buildNameDict();
  const records    = [];

  const getBaseNameJa = (no, pokemonId) => {
    if (no != null && nameDict.byNo.has(no)) {
      return nameDict.byNo.get(no);
    }
    if (pokemonId) {
      const key = String(pokemonId).toUpperCase();
      if (nameDict.byId.has(key)) return nameDict.byId.get(key);
    }
    return '';
  };

  // 1) 通常 meta から抽出
  meta.forEach(p => {
    if (!p) return;
    const c = classifyForm(p);
    if (c.kind === 'mega' || c.kind === 'primal' || c.kind === 'region') {
      const baseNameJa = getBaseNameJa(p.no, p.pokemonId);
      const labelJa    = buildLabelJa(baseNameJa, c.kind, p, c.region);
      records.push({
        no:        p.no ?? null,
        pokemonId: p.pokemonId,
        form:      p.form || '',
        kind:      c.kind,
        region:    c.region,
        labelJa
      });
    }
  });

  // 2) override 側（メガ用の補正など）
  Object.entries(overrides).forEach(([key, ov]) => {
    const pokemonId = ov.basePokemonId || ov.pokemonId || key;
    const pseudo    = {
      no:        ov.no ?? null,
      pokemonId: pokemonId,
      form:      key,
      nameJa:    '',
      name:      ''
    };
    const c = classifyForm(pseudo);
    if (c.kind === 'mega' || c.kind === 'primal' || c.kind === 'region') {
      const baseNameJa = getBaseNameJa(pseudo.no, pokemonId);
      const labelJa    = buildLabelJa(baseNameJa, c.kind, pseudo, c.region);
      records.push({
        no:        pseudo.no ?? null,
        pokemonId: pokemonId,
        form:      key,
        kind:      c.kind,
        region:    c.region,
        labelJa
      });
    }
  });

  // 重複排除 & ソート
  const seen = new Set();
  const out  = [];

  records.sort((a, b) => {
    const na = a.no ?? 0;
    const nb = b.no ?? 0;
    if (na !== nb) return na - nb;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return String(a.form || '').localeCompare(String(b.form || ''));
  });

  records.forEach(r => {
    const key = `${r.no}|${r.kind}|${r.form}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  });

  fs.writeFileSync(OUTPUT_MANIFEST, JSON.stringify({ list: out }, null, 2), 'utf8');
  console.log('Wrote special form manifest:', OUTPUT_MANIFEST, `(rows=${out.length})`);
}

try {
  build();
} catch (e) {
  console.error('[build_special_form_manifest] ERROR:', e);
  process.exit(1);
}
