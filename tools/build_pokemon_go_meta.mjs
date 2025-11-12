// tools/build_pokemon_go_meta.mjs
import fs from 'fs';
import path from 'path';
import {
  __dirname,
  DATA_DIR,
  loadGameMaster,
  toTypeEn,
  toTypeJa
} from './common.mjs';

const OUTPUT = path.resolve(DATA_DIR, 'pokemon_go_meta.json');

function parseDexNo(templateId) {
  // 例: "V0258_POKEMON_MUDKIP" → 258
  const m = String(templateId || '').match(/^V0*([0-9]+)_POKEMON_/);
  return m ? Number(m[1]) : null;
}

function parseForm(templateId, pokemonId) {
  // 例: "V0741_POKEMON_ORICORIO_PAU_STYLE" → "PAU_STYLE"
  const m = String(templateId || '').match(/^V0*[0-9]+_POKEMON_(.+)$/);
  if (!m) return '';
  const suffix = m[1];
  if (!suffix || suffix === String(pokemonId || '')) return '';
  return suffix;
}

function build() {
  const gm = loadGameMaster();
  const list = [];

  gm.forEach(entry => {
    const ps = entry?.data?.pokemonSettings;
    if (!ps) return;

    const templateId = String(entry.templateId || '');
    const no = parseDexNo(templateId);
    const pokemonId = ps.pokemonId || null;
    const form = parseForm(templateId, pokemonId);

    const type1En = toTypeEn(ps.type);
    const type2En = toTypeEn(ps.type2);
    const typesEn = [type1En, type2En].filter(Boolean);
    const typesJa = typesEn.map(t => toTypeJa(`POKEMON_TYPE_${t.toUpperCase()}`)).filter(Boolean);

    const stats = ps.stats || {};
    const stamina = Number(stats.baseStamina ?? 0);
    const attack  = Number(stats.baseAttack  ?? 0);
    const defence = Number(stats.baseDefense ?? 0);

    const quickMoves     = Array.isArray(ps.quickMoves) ? ps.quickMoves : [];
    const cinematicMoves = Array.isArray(ps.cinematicMoves) ? ps.cinematicMoves : [];
    const eliteQuickMoves     = Array.isArray(ps.eliteQuickMove) ? ps.eliteQuickMove : [];
    const eliteCinematicMoves = Array.isArray(ps.eliteCinematicMove) ? ps.eliteCinematicMove : [];

    list.push({
      no,
      templateId,
      pokemonId,
      form,
      typesEn,
      typesJa,
      stats: {
        stamina,
        attack,
        defence
      },
      moves: {
        quick: quickMoves,
        cinematic: cinematicMoves,
        eliteQuick: eliteQuickMoves,
        eliteCinematic: eliteCinematicMoves
      }
    });
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(list, null, 2), 'utf8');
  console.log('Wrote:', OUTPUT, `(rows=${list.length})`);
}

try {
  build();
} catch (e) {
  console.error('[build_pokemon_go_meta] ERROR:', e);
  process.exit(1);
}
