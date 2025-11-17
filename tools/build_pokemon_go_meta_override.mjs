// tools/build_pokemon_go_meta_override.mjs
import fs from 'fs';
import path from 'path';
import {
  __dirname,
  DATA_DIR,
  loadGameMaster
} from './common.mjs';

const OUTPUT_OVERRIDE = path.resolve(DATA_DIR, 'pokemon_go_meta_override.json');

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

      // ★ キーは「basePokemonId + '_' + tempId」にする
      // 例: "GROUDON_TEMP_EVOLUTION_PRIMAL", "DIANCIE_TEMP_EVOLUTION_MEGA"
      const key = `${basePokemonId}_${tempId}`;

      overrides[key] = {
        basePokemonId,
        tempId,
        stats: {
          stamina,
          attack,
          defence
        }
      };
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
