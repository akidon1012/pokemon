// tools/build_sprite_suffix_map.mjs
// =====================================
// pokemon_go_meta.json + pokemon_go_meta_override.json と
// images/pokemon/*.png から、フォーム別アイコン suffix マップを
// 完全自動で生成するスクリプト。
// 実行例:
//   node tools/build_sprite_suffix_map.mjs
//
// 出力: develop/data/pokemon_sprite_suffix_map.json
//
// 形式:
//   {
//     "CHARIZARD_TEMP_EVOLUTION_MEGA_X": {
//       "no": 6,
//       "pokemonId": "CHARIZARD_TEMP_EVOLUTION_MEGA_X",
//       "basePokemonId": "CHARIZARD",
//       "tempId": "TEMP_EVOLUTION_MEGA_X",
//       "suffix": "51",                    // 自動で割り当て
//       "candidates": ["00", "51", "52"]   // そのNoで存在する suffix 一覧
//     },
//     ...
//   }

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const ROOT    = path.resolve(__dirname, '..');
const DEVELOP = path.join(ROOT, 'develop');

const DATA_DIR   = path.join(DEVELOP, 'data');
const RAW_DIR    = path.join(DATA_DIR, 'raw');
const SPRITE_DIR = path.join(DEVELOP, 'images', 'pokemon');

const META_CANDIDATES = [
  path.join(DATA_DIR, 'pokemon_go_meta.json'),
  path.join(RAW_DIR,  'pokemon_go_meta.json'),
];

const OVERRIDE_CANDIDATES = [
  path.join(DATA_DIR, 'pokemon_go_meta_override.json'),
  path.join(RAW_DIR,  'pokemon_go_meta_override.json'),
];

const OUTPUT_PATH = path.join(DATA_DIR, 'pokemon_sprite_suffix_map.json');

// ---------- util ----------

async function pickExistingPath(candidates) {
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch (_) {
      // ignore
    }
  }
  // どれも無かった場合はとりあえず先頭を返す（どうせreadでこける）
  return candidates[0];
}

async function loadJsonFromCandidates(candidates, defaultValue) {
  const target = await pickExistingPath(candidates);
  try {
    const txt = await fs.readFile(target, 'utf8');
    console.log('[loadJson] OK:', target);
    return JSON.parse(txt);
  } catch (e) {
    console.warn('[loadJson] FAIL:', target, e.message);
    return defaultValue;
  }
}

// images/pokemon から no -> [suffix,...] を作る
async function collectSuffixFromFs() {
  console.log('[sprites] dir =', SPRITE_DIR);

  let files = [];
  try {
    files = await fs.readdir(SPRITE_DIR);
  } catch (e) {
    console.error('[sprites] readdir error:', e.message);
    return {};
  }

  console.log('[sprites] files =', files.length);

  const map = {};
  const re = /^pokemon_icon_(\d+)_([0-9A-Za-z_]+)\.png$/i;

  for (const name of files) {
    // shiny は使わない
    if (name.endsWith('_shiny.png')) continue;

    const m = name.match(re);
    if (!m) continue;

    const no     = Number(m[1]);      // 006
    const suffix = m[2];              // 00, 51, 00_51 など

    if (!Number.isFinite(no)) continue;

    if (!map[no]) map[no] = [];
    if (!map[no].includes(suffix)) {
      map[no].push(suffix);
    }
  }

  Object.keys(map).forEach((k) => map[k].sort());
  console.log('[sprites] nos =', Object.keys(map).length);
  return map;
}

// meta: pokemonId -> meta
function buildMetaIndex(metaList) {
  const byId = {};
  (metaList || []).forEach((m) => {
    if (!m) return;
    const pid = m.pokemonId || m.id;
    const no  = Number(m.no);
    if (!pid || !Number.isFinite(no)) return;
    byId[pid] = m;
  });
  console.log('[meta index] keys =', Object.keys(byId).length);
  return byId;
}

// override を basePokemonId ごとにまとめる
function groupOverrides(ovRaw) {
  const groups = {}; // baseId -> [{ key, ov }, ...]

  if (Array.isArray(ovRaw)) {
    ovRaw.forEach((ov, idx) => {
      if (!ov) return;
      const key = ov.id || ov.key || ov.overrideId || String(idx);
      const baseId =
        ov.basePokemonId ||
        (key ? String(key).split('_')[0] : null);
      if (!baseId) return;
      if (!groups[baseId]) groups[baseId] = [];
      groups[baseId].push({ key, ov });
    });
  } else {
    Object.keys(ovRaw || {}).forEach((key) => {
      const ov = ovRaw[key];
      if (!ov) return;
      const baseId =
        ov.basePokemonId ||
        (key ? String(key).split('_')[0] : null);
      if (!baseId) return;
      if (!groups[baseId]) groups[baseId] = [];
      groups[baseId].push({ key, ov });
    });
  }

  console.log('[override groups] baseIds =', Object.keys(groups).length);
  return groups;
}

// ---------- main ----------

async function main() {
  console.log('=== build_sprite_suffix_map (auto) ===');
  console.log('[PATH] ROOT    =', ROOT);
  console.log('[PATH] DEVELOP =', DEVELOP);

  const meta  = await loadJsonFromCandidates(META_CANDIDATES, []);
  const ovRaw = await loadJsonFromCandidates(OVERRIDE_CANDIDATES, {});

  console.log('[meta] length =', Array.isArray(meta) ? meta.length : 'not array');
  console.log('[override] type =', Array.isArray(ovRaw) ? 'Array' : typeof ovRaw);

  const metaById   = buildMetaIndex(meta);
  const suffixByNo = await collectSuffixFromFs();
  const groups     = groupOverrides(ovRaw);

  const result  = {};
  let processed = 0;
  let added     = 0;

  for (const baseId of Object.keys(groups)) {
    const forms = groups[baseId]; // [{ key, ov }, ...]

    const metaRow = metaById[baseId];
    if (!metaRow) continue;

    const no = Number(metaRow.no);
    if (!Number.isFinite(no)) continue;

    const suffixList = suffixByNo[no] || [];
    const hasBase00  = suffixList.includes('00');
    const altSuffix  = suffixList.filter((s) => s !== '00');

    // 完全自動割り当てロジック
    // --------------------------------
    // 1) altSuffix が 0 個 → すべて '00'（通常アイコン流用）
    // 2) altSuffix の数 >= フォーム数 → 名前順でマッチング
    // 3) altSuffix の数 < フォーム数 → alt を先頭から割当、残りは '00'
    const sortedForms   = forms.slice().sort((a, b) => a.key.localeCompare(b.key));
    const sortedAltSuf  = altSuffix.slice().sort();
    const suffixForKey  = {};

    if (sortedAltSuf.length === 0) {
      // ケース1
      sortedForms.forEach(({ key }) => {
        suffixForKey[key] = hasBase00 ? '00' : null;
      });
    } else if (sortedAltSuf.length >= sortedForms.length) {
      // ケース2
      sortedForms.forEach(({ key }, idx) => {
        suffixForKey[key] = sortedAltSuf[idx];
      });
    } else {
      // ケース3
      sortedForms.forEach(({ key }, idx) => {
        if (idx < sortedAltSuf.length) {
          suffixForKey[key] = sortedAltSuf[idx];
        } else {
          suffixForKey[key] = hasBase00 ? '00' : sortedAltSuf[0];
        }
      });
    }

    // 結果に登録
    sortedForms.forEach(({ key, ov }) => {
      processed++;
      const tempId = ov.tempId || null;

      result[key] = {
        no,
        pokemonId: key,
        basePokemonId: baseId,
        tempId,
        suffix: suffixForKey[key],
        candidates: suffixList
      };
      added++;
    });
  }

  console.log('[result] processed override forms =', processed);
  console.log('[result] entries =', Object.keys(result).length);

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');

  console.log('[write] ->', OUTPUT_PATH);
}

main().catch((err) => {
  console.error('[ERROR] build_sprite_suffix_map]', err);
  process.exitCode = 1;
});
