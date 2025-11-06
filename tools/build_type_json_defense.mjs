import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// ===== 位置計算（ESMで__dirnameを作る） =====
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ===== 設定 =====
const OUTPUT_PATH = path.resolve(__dirname, '../develop/data/type.json');
const POKEAPI_BASE = 'https://pokeapi.co/api/v2/type/';

// ポケモンGO想定の倍率
const MULT = {
  double: 1.6,    // こうかばつぐん
  half  : 0.625,  // こうかいまひとつ
  zero  : 0.39    // 免疫（GO流に調整）
};

// 使う18タイプのみ（unknown/shadowは除外）
const TYPES = [
  'normal','fire','water','grass','electric','ice','fighting','poison','ground',
  'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
];

const JA = {
  normal:'ノーマル', fire:'ほのお', water:'みず', grass:'くさ', electric:'でんき', ice:'こおり',
  fighting:'かくとう', poison:'どく', ground:'じめん', flying:'ひこう', psychic:'エスパー',
  bug:'むし', rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン', dark:'あく', steel:'はがね', fairy:'フェアリー'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchType(enType) {
  const url = `${POKEAPI_BASE}${enType}`;
  const res = await axios.get(url, { timeout: 20000 });
  await sleep(120); // 429対策で軽くウェイト
  return res.data;
}

// 防御視点テーブル作成：「defType」で受けるとき各攻撃タイプの倍率
function buildDefenseRow(defTypeData) {
  const table = {};
  TYPES.forEach(t => { table[t] = 1.0; });

  const rel = defTypeData.damage_relations;
  rel.half_damage_from.forEach(({ name }) => { if (table[name] != null) table[name] *= MULT.half;   });
  rel.double_damage_from.forEach(({ name }) => { if (table[name] != null) table[name] *= MULT.double; });
  rel.no_damage_from.forEach(   ({ name }) => { if (table[name] != null) table[name] *= MULT.zero;   });

  return table;
}

(async () => {
  try {
    console.log('Fetching type charts from PokeAPI (defense view)…');

    const out = [];
    for (const defType of TYPES) {
      const data  = await fetchType(defType);
      const mults = buildDefenseRow(data);

      const effect = TYPES.map(atk => ({
        type: atk,
        typeJa: JA[atk],
        mult: Number(mults[atk].toFixed(3))
      }));

      out.push({ type: defType, typeJa: JA[defType], effect });
      console.log(`  built: ${defType}`);
    }

    // 出力
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');

    console.log(`\n✅ Wrote ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
})();
