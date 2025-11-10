import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../develop/data/pokemon_list.json");

// ここは好きな最大番号に調整（GOなら現行世代まで等）
const MAX_ID = 898;  // 1〜898 まで作る

// 英→日 タイプ変換（さっきのものと同じ）
const TYPE_JA = {
  normal:'ノーマル', fire:'ほのお', water:'みず', grass:'くさ',
  electric:'でんき', ice:'こおり', fighting:'かくとう', poison:'どく',
  ground:'じめん', flying:'ひこう', psychic:'エスパー', bug:'むし',
  rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン', dark:'あく',
  steel:'はがね', fairy:'フェアリー'
};

// PokeAPI から1匹ぶん取得して整形
async function fetchOne(id) {
  const [resPokemon, resSpecies] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`)
  ]);

  if (!resPokemon.ok || !resSpecies.ok) {
    console.warn("skip id=", id, "status=", resPokemon.status, resSpecies.status);
    return null;
  }

  const pokemon = await resPokemon.json();
  const species = await resSpecies.json();

  // 日本語名（かな優先）
  const nameEntry =
    species.names.find(n => n.language.name === "ja-Hrkt") ||
    species.names.find(n => n.language.name === "ja") ||
    { name: species.name };
  const nameJa = nameEntry.name;

  // タイプ（日本語）
  const typesJa = pokemon.types
    .sort((a, b) => a.slot - b.slot)
    .map(t => {
      const en = t.type.name;  // "grass" など
      return TYPE_JA[en] || en;
    });

  // 種族値（メインシリーズ基準）
  const statMap = { hp:0, attack:0, defence:0, spAttack:0, spDefence:0 };
  pokemon.stats.forEach(s => {
    switch (s.stat.name) {
      case "hp":              statMap.hp        = s.base_stat; break;
      case "attack":          statMap.attack    = s.base_stat; break;
      case "defense":         statMap.defence   = s.base_stat; break;
      case "special-attack":  statMap.spAttack  = s.base_stat; break;
      case "special-defense": statMap.spDefence = s.base_stat; break;
      default: break; // speed はここでは無視
    }
  });

  return {
    no: id,
    name: nameJa,
    form: "",                // フォルム分けしたければ後で拡張
    types: typesJa,
    stats: statMap,
    isMegaEvolution: false   // 必要ならメガデータを別途マージ
  };
}

async function main() {
  const result = [];
  for (let id = 1; id <= MAX_ID; id++) {
    try {
      const p = await fetchOne(id);
      if (p) result.push(p);
      console.log("done", id, "/", MAX_ID);
    } catch (e) {
      console.error("error on id", id, e);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf8");
  console.log("Wrote:", OUTPUT, `(rows=${result.length})`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
