// tools/build_pokemon_go_meta_override.mjs
import fs from 'fs';
import path from 'path';
import {
  __dirname,
  DATA_DIR,
  loadGameMaster
} from './common.mjs';

const OUTPUT_OVERRIDE = path.resolve(DATA_DIR, 'pokemon_go_meta_override.json');

// ★ Game Master のタイプコード → 英語タイプ名
const TYPE_MAP_EN = {
  POKEMON_TYPE_NORMAL:   'normal',
  POKEMON_TYPE_FIRE:     'fire',
  POKEMON_TYPE_WATER:    'water',
  POKEMON_TYPE_GRASS:    'grass',
  POKEMON_TYPE_ELECTRIC: 'electric',
  POKEMON_TYPE_ICE:      'ice',
  POKEMON_TYPE_FIGHTING: 'fighting',
  POKEMON_TYPE_POISON:   'poison',
  POKEMON_TYPE_GROUND:   'ground',
  POKEMON_TYPE_FLYING:   'flying',
  POKEMON_TYPE_PSYCHIC:  'psychic',
  POKEMON_TYPE_BUG:      'bug',
  POKEMON_TYPE_ROCK:     'rock',
  POKEMON_TYPE_GHOST:    'ghost',
  POKEMON_TYPE_DRAGON:   'dragon',
  POKEMON_TYPE_DARK:     'dark',
  POKEMON_TYPE_STEEL:    'steel',
  POKEMON_TYPE_FAIRY:    'fairy'
};

function buildOverride() {
  const gm = loadGameMaster();
  const overrides = {};

  gm.forEach(entry => {
    const ps = entry?.data?.pokemonSettings;
    if (!ps) return;

    const basePokemonId = ps.pokemonId || null;
    if (!basePokemonId) return;

    // メガ・ゲンシなどの一時進化情報候補
    const tempEvos =
      (Array.isArray(ps.tempEvoOverrides) && ps.tempEvoOverrides.length) ? ps.tempEvoOverrides :
      (Array.isArray(ps.tempEvoSettings)   && ps.tempEvoSettings.length)   ? ps.tempEvoSettings   :
      [];

    if (!tempEvos.length) return;

    tempEvos.forEach(te => {
      if (!te) return;

      // 進化ID（例: "TEMP_EVOLUTION_MEGA", "TEMP_EVOLUTION_PRIMAL", など）
      const tempId =
        te.tempEvoId        ||
        te.tempEvolutionId  ||
        te.evolutionId      ||
        null;

      if (!tempId) return;

      // 種族値（候補になりそうなフィールドを全部見る）
      const statSrc = te.stats || te;
      const stamina = Number(statSrc.baseStamina ?? statSrc.stamina ?? 0);
      const attack  = Number(statSrc.baseAttack  ?? statSrc.attack  ?? 0);
      const defence = Number(statSrc.baseDefense ?? statSrc.defence ?? 0);

      // ★ タイプ override を拾う（typeOverride1, typeOverride2 など）
      const typeCodes = [];

      if (te.typeOverride1) typeCodes.push(te.typeOverride1);
      if (te.typeOverride2) typeCodes.push(te.typeOverride2);
      // 一部データで別名の場合に備えて念のため
      if (te.typeOverride3) typeCodes.push(te.typeOverride3);

      // override にタイプ指定がない場合は「元と同じタイプ」扱いで OK なので、
      // 無理に ps.type / ps.type2 を入れなくてよい（変更がない = override不要）。
      const typesEn = typeCodes
        .map(code => TYPE_MAP_EN[code] || null)
        .filter(Boolean);

        // ★ キーは「basePokemonId + '_' + tempId」にする
      // 例: "GROUDON_TEMP_EVOLUTION_PRIMAL", "DIANCIE_TEMP_EVOLUTION_MEGA"
      const key = `${basePokemonId}_${tempId}`;
      const ov = {
        basePokemonId,
        tempId,
        stats: {
          stamina,
          attack,
          defence
        }
      };

      // ★ タイプが取れたときだけ typesEn を書き出す
      if (typesEn.length) {
        ov.typesEn = typesEn;
      }

      overrides[key] = ov;
    });
  });

  fs.mkdirSync(path.dirname(OUTPUT_OVERRIDE), { recursive: true });
  fs.writeFileSync(OUTPUT_OVERRIDE, JSON.stringify(overrides, null, 2), 'utf8');

  console.log('Wrote:', OUTPUT_OVERRIDE, `(rows=${Object.keys(overrides).length})`);
}

try {
  buildOverride();
} catch (e) {
  console.error('[build_pokemon_go_meta_override] ERROR:', e);
  process.exit(1);
}
