// tools/build_moves_master.mjs
import fs from 'fs';
import path from 'path';
import url from 'url';

// === パス ===
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const INPUT  = path.resolve(__dirname, '../develop/data/raw/game_master.json');
const OUTPUT = path.resolve(__dirname, '../develop/data/moves_master.json');

// タイプ和名
const TYPE_JA = {
  normal:'ノーマル', fire:'ほのお', water:'みず', grass:'くさ',
  electric:'でんき', ice:'こおり', fighting:'かくとう', poison:'どく',
  ground:'じめん', flying:'ひこう', psychic:'エスパー', bug:'むし',
  rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン', dark:'あく',
  steel:'はがね', fairy:'フェアリー'
};

function toTypeEn(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/^POKEMON_TYPE_/, '').toLowerCase();
  return TYPE_JA[s] ? s : null;
}
function toTypeJa(raw) {
  const en = toTypeEn(raw);
  return en ? TYPE_JA[en] : null;
}

function loadGM(file) {
  const txt = fs.readFileSync(file, 'utf8');
  return JSON.parse(txt);
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function energyDeltaOf(block) {
  if (!block || block.energyDelta == null || block.energyDelta === '') return null;
  const n = Number(block.energyDelta);
  return Number.isFinite(n) ? n : null;
}

function categoryFromEnergy(pve, pvp, id) {
  const ePve = energyDeltaOf(pve);
  const ePvp = energyDeltaOf(pvp);

  if (ePve != null && ePvp != null) {
    const sPve = Math.sign(ePve);
    const sPvp = Math.sign(ePvp);
    if (sPve !== 0 && sPvp !== 0 && sPve !== sPvp) {
      console.warn('[moves] energyDelta sign mismatch:', id, 'pve=' + ePve, 'pvp=' + ePvp);
    }
  }

  const e = (ePve != null && ePve !== 0)
    ? ePve
    : ((ePvp != null && ePvp !== 0) ? ePvp : (ePve != null ? ePve : ePvp));

  if (e != null && e > 0) return 'normal';
  if (e != null && e < 0) return 'special';
  return /_FAST(?:_|$)/.test(String(id).toUpperCase()) ? 'normal' : 'special';
}

function normalizeTemplateMoveId(templateId) {
  let s = String(templateId || '');
  s = s.replace(/^COMBAT_/, '');
  s = s.replace(/^V\d+_MOVE_/, '');
  return s || null;
}

function moveIdFrom(m, templateId) {
  return m.uniqueId || m.moveId || m.movementId || normalizeTemplateMoveId(templateId) || null;
}

function emptyRec(id) {
  return {
    id,
    typeEn: null,
    typeJa: null,
    pve: null,
    pvp: null
  };
}

function setType(rec, rawType) {
  if (rec.typeEn || !rawType) return;
  const typeEn = toTypeEn(rawType);
  if (!typeEn) return;
  rec.typeEn = typeEn;
  rec.typeJa = toTypeJa(rawType);
}

function toPve(m) {
  return {
    power: numOrNull(m.power),
    energyDelta: numOrNull(m.energyDelta),
    durationMs: numOrNull(m.durationMs),
    damageWindowStartMs: numOrNull(m.damageWindowStartMs),
    damageWindowEndMs: numOrNull(m.damageWindowEndMs)
  };
}

function toPvp(m) {
  return {
    power: numOrNull(m.power ?? m.pvePower),
    energyDelta: numOrNull(m.energyDelta),
    durationTurns: numOrNull(m.durationTurns)
  };
}

function logPveSpecialEnergy(moves) {
  const counts = new Map();
  let noPve = 0;
  let total = 0;

  for (const m of moves) {
    if (m.category !== 'special') continue;
    total += 1;
    if (!m.pve) {
      noPve += 1;
      continue;
    }
    const key = m.pve.energyDelta == null ? 'null' : String(m.pve.energyDelta);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = [...counts.entries()].sort((a, b) => {
    if (a[0] === 'null') return 1;
    if (b[0] === 'null') return -1;
    return Number(a[0]) - Number(b[0]);
  });

  console.log('[moves] PvE special energyDelta unique values: ' + rows.length + ' (special=' + total + ')');
  rows.forEach(([k, n]) => {
    console.log('  ' + k + ': ' + n);
  });
  if (noPve) console.log('  (no pve object: ' + noPve + ')');
}

function build() {
  console.log('[moves] Reading:', INPUT);
  const gm = loadGM(INPUT);
  const byId = new Map();

  function upsert(id) {
    let rec = byId.get(id);
    if (!rec) {
      rec = emptyRec(id);
      byId.set(id, rec);
    }
    return rec;
  }

  (gm || []).forEach(entry => {
    const data = entry?.data || {};
    const templateId = String(entry.templateId || '');

    const pveSrc = data.moveSettings || null;
    const pvpSrc =
      data.combatMove ||
      data.combatMoveSettings ||
      data.obCombatMoveSettings ||
      data.obCombatMove ||
      null;

    if (pveSrc) {
      const id = moveIdFrom(pveSrc, templateId);
      if (id) {
        const rec = upsert(id);
        rec.pve = toPve(pveSrc);
        setType(rec, pveSrc.pokemonType || pveSrc.type);
      }
    }

    if (pvpSrc) {
      const id = moveIdFrom(pvpSrc, templateId);
      if (id) {
        const rec = upsert(id);
        rec.pvp = toPvp(pvpSrc);
        setType(rec, pvpSrc.type || pvpSrc.pokemonType);
      }
    }
  });

  const moves = [...byId.values()].map(rec => {
    const pvp = rec.pvp;
    return {
      id: rec.id,
      nameEn: rec.id,
      nameJa: rec.id,
      type: rec.typeEn,
      typeJa: rec.typeJa,
      category: categoryFromEnergy(rec.pve, rec.pvp, rec.id),
      power: Number((pvp && pvp.power) ?? 0),
      energy: Number((pvp && pvp.energyDelta) ?? 0),
      durationTurns: Number((pvp && pvp.durationTurns) ?? 0),
      pve: rec.pve,
      pvp: rec.pvp
    };
  });

  const pveCount = moves.filter(m => m.pve).length;
  const pvpCount = moves.filter(m => m.pvp).length;
  const bothCount = moves.filter(m => m.pve && m.pvp).length;

  console.log('[moves] count =', moves.length, '(pve=' + pveCount + ', pvp=' + pvpCount + ', both=' + bothCount + ')');
  logPveSpecialEnergy(moves);

  if (moves.length === 0) {
    console.warn('[moves] no moves found. First 20 templateIds:');
    (gm || []).slice(0, 20).forEach(e => {
      console.warn('  -', e.templateId, 'keys:', Object.keys(e.data || {}));
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(moves, null, 2), 'utf8');
  console.log('[moves] Wrote:', OUTPUT);
}

try {
  build();
} catch (e) {
  console.error('[build_moves_master ERROR]', e);
  process.exit(1);
}
