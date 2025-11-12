const pokemonCard = {
  build: function(poke) {
    const name  = poke?.name  || '';
    const img   = poke?.image || 'https://placehold.jp/300x300.png';
    const types = Array.isArray(poke?.types) ? poke.types : [];

    const typeBadges = types.map(function(t) {
      const en = pokemonUtil.translate.JtoE(t);
      ${pokemonCard.badges(props.types || data.types || [])}
    }).join('');

    return `
<div class="pokemon-info-wrapper">
  <div class="pokemon-info-img">
    <img src="${img}" decoding="async" loading="lazy" alt="${name}">
  </div>
  <div class="pokemon-info-name">${name}</div>
  <div class="pokemon-info-type">
    ${typeBadges}
  </div>
</div>`;
  },

  render: function(poke, area) {
    const $area = (area instanceof jQuery) ? area : $(area);
    if (!$area.length) return;
    $area.empty().append(this.build(poke));
  },

  badges : function(typesInput) {
  const toList = (v) => {
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };
  const types = toList(typesInput);

  if (!types.length) return '<div class="pokemon-types"></div>';

  const html = types.map(t => {
    // t が和名/英名どちらでもOKにする
    const en = (pokemonUtil.translateTypes?.toEnType?.(t) || String(t).toLowerCase());
    const ja = (pokemonUtil.translateTypes?.toJaType?.(en) || String(t));
    return `<span class="badge type type-${en}">${ja}</span>`;
  }).join('');

  return `<div class="pokemon-types">${html}</div>`;
},
}
const pokemonUtil = {
  data : {
    state: { POKEMON_DATA: [], TYPE_DEFENSE: [], MOVES: [], GO_META: [] },
    _dfd: null,

    loadAll() {
      if (this._dfd) return this._dfd.promise();
      const dfd = $.Deferred();

      const jobs = [
        $.getJSON('../../data/type_defense.json').done(d => {
          this.state.TYPE_DEFENSE = Array.isArray(d) ? d : (d.table || []);
        }),
        $.getJSON('../../data/pokemon_list.json').done(d => {
          this.state.POKEMON_DATA = Array.isArray(d) ? d : (d.list || []);
        }),
        $.getJSON('../../data/moves_master_localized.json').done(d => {
          this.state.MOVES = d || [];
        }),
        $.getJSON('../../data/pokemon_go_meta.json').done(d => {
          this.state.GO_META = d || [];
        })
      ];

      $.when.apply($, jobs).done(() => {
        // 互換のため：必要ならグローバルにも流す（移行期）
        window.__TYPE_DEFENSE_TABLE__   = this.state.TYPE_DEFENSE;
        window.__POKEMON_DATA__         = this.state.POKEMON_DATA;
        window.__MOVES_MASTER_LOCALIZED__ = this.state.MOVES;
        window.__POKEMON_GO_META__      = this.state.GO_META;

        $(document).trigger('pokemon:data-ready', [this.state]);
        dfd.resolve(this.state);
      }).fail(dfd.reject);

      this._dfd = dfd;
      return dfd.promise();
    },

    onReady(fn) { return this.loadAll().done(fn); },
    get(key)    { return this.state[key]; }
  },

  // 画像URL関連 ---------------------------------------------------
  getImageUrlByNo : function(no) {
    const id = parseInt(no, 10);
    if (!id || isNaN(id)) {
      console.warn('Invalid Pokémon ID:', no);
      return 'https://placehold.jp/300x300.png';
    }
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
  },

  getFallbackImageUrl : function(no) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + no + '.png';
  },

  // 表示名（フォーム付き） ---------------------------------------
  getDisplayName : function(poke) {
    return poke.form ? (poke.name + '（' + poke.form + '）') : poke.name;
  },

  // タイプ翻訳（英⇄和＋カタカナ） --------------------------------
  translate : {
    typeName : [
      'normal','fire','water','grass','electric','ice','fighting','poison','ground',
      'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
    ],
    typeNameJa : [
      'ノーマル','ほのお','みず','くさ','でんき','こおり','かくとう','どく','じめん',
      'ひこう','エスパー','むし','いわ','ゴースト','ドラゴン','あく','はがね','フェアリー'
    ],

    EtoJ : function(str) {
      let Jvalue = String(str);
      Jvalue = Jvalue.replace(/normal/g, 'ノーマル');
      Jvalue = Jvalue.replace(/fire/g, 'ほのお');
      Jvalue = Jvalue.replace(/water/g, 'みず');
      Jvalue = Jvalue.replace(/grass/g, 'くさ');
      Jvalue = Jvalue.replace(/electric/g, 'でんき');
      Jvalue = Jvalue.replace(/ice/g, 'こおり');
      Jvalue = Jvalue.replace(/fighting/g, 'かくとう');
      Jvalue = Jvalue.replace(/poison/g, 'どく');
      Jvalue = Jvalue.replace(/ground/g, 'じめん');
      Jvalue = Jvalue.replace(/flying/g, 'ひこう');
      Jvalue = Jvalue.replace(/psychic/g, 'エスパー');
      Jvalue = Jvalue.replace(/bug/g, 'むし');
      Jvalue = Jvalue.replace(/rock/g, 'いわ');
      Jvalue = Jvalue.replace(/ghost/g, 'ゴースト');
      Jvalue = Jvalue.replace(/dragon/g, 'ドラゴン');
      Jvalue = Jvalue.replace(/dark/g, 'あく');
      Jvalue = Jvalue.replace(/steel/g, 'はがね');
      Jvalue = Jvalue.replace(/fairy/g, 'フェアリー');
      return Jvalue;
    },

    JtoE : function(str) {
      let Evalue = String(str);
      Evalue = Evalue.replace(/ノーマル/g, 'normal');
      Evalue = Evalue.replace(/ほのお/g, 'fire');
      Evalue = Evalue.replace(/みず/g, 'water');
      Evalue = Evalue.replace(/くさ/g, 'grass');
      Evalue = Evalue.replace(/でんき/g, 'electric');
      Evalue = Evalue.replace(/こおり/g, 'ice');
      Evalue = Evalue.replace(/かくとう/g, 'fighting');
      Evalue = Evalue.replace(/どく/g, 'poison');
      Evalue = Evalue.replace(/じめん/g, 'ground');
      Evalue = Evalue.replace(/ひこう/g, 'flying');
      Evalue = Evalue.replace(/エスパー/g, 'psychic');
      Evalue = Evalue.replace(/むし/g, 'bug');
      Evalue = Evalue.replace(/いわ/g, 'rock');
      Evalue = Evalue.replace(/ゴースト/g, 'ghost');
      Evalue = Evalue.replace(/ドラゴン/g, 'dragon');
      Evalue = Evalue.replace(/あく/g, 'dark');
      Evalue = Evalue.replace(/はがね/g, 'steel');
      Evalue = Evalue.replace(/フェアリー/g, 'fairy');
      return Evalue;
    },

    katakana : function(str) {
      return String(str).replace(/[\u3041-\u3096]/g, function(match) {
        const chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
      });
    }
  },

  // こちらは "translateTypes" として統一的に使う用の薄ラッパ ---------
  translateTypes : {
    toJaType: function(en){
      return pokemonUtil.translate.EtoJ(String(en));
    },
    toEnType: function(ja){
      return pokemonUtil.translate.JtoE(String(ja));
    },
    toEnTypes: function(typesJa){
      return (typesJa || []).map(function(tJa){
        return pokemonUtil.translate.JtoE(String(tJa));
      });
    }
  },

  // 種族値合計 ----------------------------------------------------
  totalBase: function(p) {
    const s = p.stats || {};
    return (
      (s.hp || 0) +
      (s.attack || 0) +
      (s.defence || 0) +
      (s.spAttack || 0) +
      (s.spDefence || 0)
    );
  },

  // タイプ配列を和名に揃える（ENが混じっていてもOKにする） ----------
  normalizeTypesJa : function(item){
    let src = item.typesJa ?? item.types ?? [];
    if (!Array.isArray(src)) src = src ? [src] : [];
    const ja = src.map(function(t){
      const s = String(t);
      const hasKana = /[ぁ-んァ-ヶ]/.test(s);
      return hasKana ? s : pokemonUtil.translate.EtoJ(s);
    });
    return ja;
  },

  // チェックされているタイプ（和名）を取得 --------------------------
  getCheckedTypesJa : function() {
    const ja = [];
    $(getType.checkbox).each(function(){
      if ($(this).prop('checked')) {
        const en = String($(this).val());                   // 例: 'fire'
        ja.push(pokemonUtil.translate.EtoJ(en));            // 例: 'ほのお'
      }
    });
    return ja;
  },

  // 必要ならこちらも残す（内部的には normalizeTypesJa とほぼ同じ） ----
  toJaTypeArray : function(types) {
    if (!Array.isArray(types)) return [];
    return types.map(function(t){
      const s = String(t).trim();
      if (/[ァ-ヴー]/.test(s)) return s;
      return pokemonUtil.translate.EtoJ(s);
    });
  },

  // 倍率正規化（NaN を出さない核） -------------------------------
  normalizeMultiplier : function(e){
    if (!e) return 1.0;

    // multiplier があれば最優先（数値/文字列どちらでもOK）
    if (e.multiplier != null) {
      var m1 = Number(String(e.multiplier).replace(/[^\d.]/g, ''));
      if (Number.isFinite(m1) && m1 > 0) return m1;
    }

    // 旧 value 方式 (+2〜-2)
    if (e.value != null) {
      var v = Number(e.value);
      if (Number.isFinite(v)) {
        if (v >= 2)  return 2.56;   // x4
        if (v === 1) return 1.60;   // x2
        if (v === 0) return 1.00;
        if (v === -1) return 0.625; // x0.5
        if (v <= -2) return 0.39;   // x0.25
      }
    }

    return 1.0;
  },

  /**
   * 攻撃有効タイプ抽出（防御視点）
   * @param {Array<string>} defenderTypesJa - 防御側タイプ（日本語）
   * @param {Array<Object>} typeDefenseTable - type_defense.json
   * @return {Set<string>} こうか>1になる攻撃タイプ（英名）のセット
   */
  pickCounterAttackTypes : function(defenderTypesJa, typeDefenseTable) {
    if (!Array.isArray(defenderTypesJa) || defenderTypesJa.length === 0) {
      return new Set();
    }
    const TABLE = Array.isArray(typeDefenseTable) ? typeDefenseTable : [];

    const multMap = new Map(); // key: 攻撃タイプ(EN), val: 合成倍率

    defenderTypesJa.forEach(function(defJa){
      const row =
        TABLE.find(function(r){ return r.typeJa === defJa; }) ||
        TABLE.find(function(r){ return r.type   === pokemonUtil.translateTypes.toEnType(defJa); });

      if (!row || !Array.isArray(row.effect)) return;

      row.effect.forEach(function(e){
        const atkEn = e.type; // EN 前提
        if (!atkEn) return;
        const m  = pokemonUtil.normalizeMultiplier(e);
        const cur = multMap.get(atkEn) ?? 1.0;
        multMap.set(atkEn, cur * m);
      });
    });

    const result = new Set();
    Array.from(multMap.entries())
      .filter(function(entry){ return entry[1] > 1.0; })      // こうかばつぐんのみ
      .sort(function(a,b){ return b[1] - a[1]; })             // 倍率降順
      .forEach(function(entry){
        const atkEn = entry[0];
        result.add(atkEn);
      });

    return result; // Set<EN type>
  },

  // ==== こうか倍率計算（技タイプ vs 防御タイプ配列） =========================
  effectMultiplierForTypes : function(atkTypeEn, defenderTypesJa, typeDefenseTable) {
    if (!atkTypeEn) return 1.0;
    if (!Array.isArray(defenderTypesJa) || defenderTypesJa.length === 0) return 1.0;

    const TABLE = Array.isArray(typeDefenseTable) ? typeDefenseTable : [];
    let mult = 1.0;

    defenderTypesJa.forEach(function(defJa) {
      const row = TABLE.find(function(r){ return r.typeJa === defJa; });
      if (!row || !Array.isArray(row.effect)) return;

      const eff = row.effect.find(function(e){
        // type は英名（例: 'water'）
        return e.type === atkTypeEn;
      });

      const m = pokemonUtil.normalizeMultiplier(e); // 既存の normalizeMultiplier を再利用
      mult *= m;
    });

    return mult;
  },

  // ==== STAB（タイプ一致）補正 ==========================================
  isStab : function(moveTypeEn, attackerTypesEn) {
    if (!moveTypeEn) return false;
    if (!Array.isArray(attackerTypesEn)) return false;
    return attackerTypesEn.includes(moveTypeEn);
  },

  // ==== 技1つぶんのスコア計算 ===========================================
  scoreMove: function(move, defenderTypesJa, attackerTypesEn, typeDefenseTable) {
    if (!move) return 0;
    const atkTypeEn = move.type;                    // 'water' など
    const power = Number(move.power || 0);

    const eff  = pokemonUtil.effectMultiplierForTypes(atkTypeEn, defenderTypesJa, typeDefenseTable);
    const stab = pokemonUtil.isStab(atkTypeEn, attackerTypesEn) ? 1.2 : 1.0; // STAB係数（ざっくり1.2）

    return power * eff * stab;
  },

  // ==== 技マスタの初期化（ページ読み込み時に一度だけ呼ぶ） ===============
  initMoves : function(movesList) {
    const list = Array.isArray(movesList)
      ? movesList
      : (window.__MOVES_MASTER_LOCALIZED__ || window.__MOVES_MASTER__ || []);

    const index = new Map();
    list.forEach(function(m){
      if (!m || !m.id) return;
      index.set(String(m.id), m);
    });

    pokemonUtil._moveIndex = index;
  },

  // ID から技情報を取る
  getMoveById : function(id) {
    if (!pokemonUtil._moveIndex) return null;
    return pokemonUtil._moveIndex.get(String(id)) || null;
  },

  getMovesForPokemon : function(pokemon) {
    // 将来的には moves_master_localized / pokemon_go_meta から引く
    // 今はダミーで空配列を返す
    return [];
  },
  /**
 * 対象ポケモン1体分のおすすめ技を抽出
 * @param {Object} opts
 *  - defenderTypesJa : 防御側タイプ（日本語配列）
 *  - attackerTypesJa : 攻撃側ポケモンのタイプ（日本語配列）
 *  - goMoves         : { quick: [...], cinematic: [...] } 形式の技ID群
 *  - typeDefense     : type_defense.json の配列
 *  - topN            : 上位何件まで出すか（デフォ3）
 */
  pickBestMovesForPokemon : function(opts) {
    const defenderTypesJa = opts?.defenderTypesJa || [];
    const attackerTypesJa = opts?.attackerTypesJa || [];
    const goMoves         = opts?.goMoves || {};
    const typeDefense     = opts?.typeDefense || (window.__TYPE_DEFENSE_TABLE__ || []);
    const topN            = Number(opts?.topN || 3);

    if (!pokemonUtil._moveIndex) {
      pokemonUtil.initMoves(); // 念のため遅延初期化
    }

    // 攻撃側タイプ（英名）に変換
    const attackerTypesEn = attackerTypesJa
      .map(function(tJa){ return pokemonUtil.translate.JtoE(tJa); })
      .filter(Boolean)
      .map(function(s){ return s.toLowerCase(); });

    const quickIds     = Array.isArray(goMoves.quick)     ? goMoves.quick     : [];
    const cinematicIds = Array.isArray(goMoves.cinematic) ? goMoves.cinematic : [];

    // 共通のスコアリング関数
    const scoreOne = function(moveId) {
      const move = pokemonUtil.getMoveById(moveId);
      if (!move) return null;
      const score = pokemonUtil.scoreMove(move, defenderTypesJa, attackerTypesEn, typeDefense);
      return {
        id: move.id,
        nameJa: move.nameJa || move.nameEn,
        typeEn: move.type,
        typeJa: move.typeJa || pokemonUtil.translate.EtoJ(move.type),
        power: move.power || 0,
        category: move.category,
        score: score
      };
    };

    const scoredQuick = quickIds
      .map(scoreOne)
      .filter(Boolean)
      .sort(function(a,b){ return b.score - a.score; })
      .slice(0, topN);

    const scoredCinematic = cinematicIds
      .map(scoreOne)
      .filter(Boolean)
      .sort(function(a,b){ return b.score - a.score; })
      .slice(0, topN);

    return {
      normal:  scoredQuick,      // ノーマル技（fast）
      special: scoredCinematic   // スペシャル技（charge）
    };
  },

  // ==== 技関連ユーティリティ ====

  normalizeKey(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  },
  // 名前・図鑑番号・オブジェクトのいずれでも受け取り、オブジェクトに解決
  resolvePokemon : function(input) {
    if (!input) return null;
    if (typeof input === 'object') return input;

    const list = Array.isArray(window.__POKEMON_DATA__) ? window.__POKEMON_DATA__ : [];
    const metaList = Array.isArray(window.__POKEMON_GO_META__) ? window.__POKEMON_GO_META__ : [];
    if (!list.length && !metaList.length) {
      console.warn('[resolvePokemon] data not ready');
      return null;
    }

    // 入力を標準化
    const key = String(input).toLowerCase().replace(/[^a-z0-9_]/g, '');

    // 1️⃣ まず __POKEMON_DATA__ 内を直接探す
    let hit = list.find(p => {
      const fields = ['name', 'nameEn', 'pokemon_id', 'pokemonId', 'slug', 'speciesId', 'species_id'];
      return fields.some(f => p[f] && String(p[f]).toLowerCase() === key);
    });

    // 2️⃣ 見つからなければ、__POKEMON_GO_META__ の pokemonId を使って検索
    if (!hit && metaList.length) {
      const meta = metaList.find(m => {
        const ids = [m.pokemonId, m.pokemon_id, m.speciesId];
        return ids.some(id => id && String(id).toLowerCase() === key);
      });

      if (meta) {
        const dex = meta.no || meta.dex || meta.pokedex_id;
        if (dex != null) {
          hit = list.find(p => p.no === dex || p.dex === dex || p.pokedex_id === dex);
        }
      }
    }

    if (!hit) {
      const candidates = metaList
        .filter(m => m.pokemonId && m.pokemonId.toLowerCase().includes(key))
        .slice(0, 5)
        .map(m => m.pokemonId);
      console.warn('[resolvePokemon] not found:', input, 'candidates:', candidates);
    }

    return hit || null;
  },

  // moves_master_localized から技1件を引く
  getMoveMaster : function(moveId) {
    const list = Array.isArray(window.__MOVES_MASTER_LOCALIZED__) ? window.__MOVES_MASTER_LOCALIZED__ : [];
    if (!list.length || !moveId) return null;
    const idLower = String(moveId).toLowerCase();
    return list.find(m => {
      const keys = [m.id, m.moveId, m.templateId, m.nameEn, m.name].filter(Boolean);
      return keys.some(k => String(k).toLowerCase() === idLower);
    }) || null;
  },

  // ポケモンが覚える技一覧を JSON で返す
  getMovesForPokemon : function(pokemon) {
    const meta = pokemonUtil.getMetaForPokemon(pokemon);
    if (!meta) return { fast: [], charged: [] };

    // メタ側のキー名にゆるく対応
    const fastIds = meta.fastMoves || meta.quickMoves || (meta.moves && meta.moves.fast) || [];
    const chargedIds = meta.chargedMoves || meta.cinematicMoves || (meta.moves && meta.moves.charged) || [];

    const normalizeMove = function(moveId, category) {
      const m = pokemonUtil.getMoveMaster(moveId) || {};
      const typeEn = m.type || m.pokemonType;
      const typeJa = pokemonUtil.translateTypes.toJaType(typeEn);

      return {
        id         : moveId,
        category   : category,        // 'fast' or 'charged'
        nameJa     : m.nameJa || m.name || '', // ローカライズ済みがあれば優先
        nameEn     : m.nameEn || '',
        type       : typeEn || '',
        typeJa     : typeJa || '',
        power      : m.power ?? m.powerPvP ?? null,
        energy     : m.energyDelta ?? m.energy ?? null,
        turns      : m.turns ?? null,
        raw        : m                 // 必要なら生データも持たせておく
      };
    };

    const fastMoves = Array.isArray(fastIds)
      ? fastIds.map(id => normalizeMove(id, 'fast'))
      : [];

    const chargedMoves = Array.isArray(chargedIds)
      ? chargedIds.map(id => normalizeMove(id, 'charged'))
      : [];

    return {
      fast   : fastMoves,
      charged: chargedMoves
    };
  },

  // どこか共通に
  normalizeId : function(p){
    // 今回のデータ構造では no が正
    return (
      p?.id ?? p?.no ?? p?.dex ?? p?.pokedex_id ?? p?.pokemon_id ?? p?.speciesId ?? null
    );
  },

  normalizeTypesJa : function(p){
    // 例：['くさ','どく'] をそのまま返す。将来英名→和名にも対応可
    const t = p?.types || [];
    return Array.isArray(t) ? t.slice() : [];
  },

  // ========== 追加: GOメタ用のインデックスを一度だけ構築 ==========
  _ensureGoIndex : function() {
    if (pokemonUtil._goIndexBuilt) return;
    const GO = Array.isArray(window.__POKEMON_GO_META__) ? window.__POKEMON_GO_META__ : [];
    const byId    = new Map(); // 1, 2, 3...
    const byNameJ = new Map(); // 'フシギダネ'
    const byNameE = new Map(); // 'bulbasaur'
    const bySp    = new Map(); // 'bulbasaur' (speciesId/pokemonId など)

    const normNum = v => (v == null ? null : (Number(String(v).match(/\d+/)?.[0]) || null));
    const normJa  = s => String(s || '').trim();
    const normEn  = s => String(s || '').trim().toLowerCase();

    GO.forEach(g => {
      const id = normNum(g.id ?? g.no ?? g.dex ?? g.pokedex_id ?? g.pokedexId);
      if (id != null && !byId.has(id)) byId.set(id, g);

      const ja = normJa(g.nameJa || g.name_jp || g.nameJP || g.nameJp || g.name);
      if (ja && !byNameJ.has(ja)) byNameJ.set(ja, g);

      const en = normEn(g.nameEn || g.name_en || g.ename || g.englishName || g.name);
      if (en && !byNameE.has(en)) byNameE.set(en, g);

      const sp = normEn(g.speciesId || g.pokemonId || g.slug || g.key || g.code);
      if (sp && !bySp.has(sp)) bySp.set(sp, g);
    });

    pokemonUtil._GO_INDEX = { byId, byNameJ, byNameE, bySp };
    pokemonUtil._goIndexBuilt = true;
  },

  // ========== 追加: 原作データ p から GOメタ1件を取得 ==========
  _resolveGoMeta : function(p) {
    pokemonUtil._ensureGoIndex();
    const idx = pokemonUtil._GO_INDEX;

    const id  = (p?.id ?? p?.no ?? p?.dex ?? p?.pokedex_id) ?? null;
    const ja  = String(p?.nameJa || p?.name || '').trim();
    const en  = String(p?.nameEn || p?.name || '').trim().toLowerCase();
    const sp  = String(p?.speciesId || p?.pokemonId || '').trim().toLowerCase();

    // 1) 番号一致
    if (id != null && idx.byId.has(Number(id))) return idx.byId.get(Number(id));
    // 2) 日本語名一致
    if (ja && idx.byNameJ.has(ja)) return idx.byNameJ.get(ja);
    // 3) 英語名一致
    if (en && idx.byNameE.has(en)) return idx.byNameE.get(en);
    // 4) species/pokemonId 一致
    if (sp && idx.bySp.has(sp)) return idx.bySp.get(sp);

    // 5) ゆるいフォールバック（フォーム括弧を剥がす）
    const jaStripped = ja.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim();
    if (jaStripped && idx.byNameJ.has(jaStripped)) return idx.byNameJ.get(jaStripped);

    return null;
  },

  // ========== ここから getPokemonData 本体 ==========

  getPokemonData : function(list) {
    const arr  = Array.isArray(list) ? list : [list];
    const BASE = window.__POKEMON_DATA__ || [];
    const MOV  = window.__MOVES_MASTER_LOCALIZED__ || [];

    const normalizeId = p =>
      p?.id ?? p?.no ?? p?.dex ?? p?.pokedex_id ?? p?.pokemon_id ?? p?.speciesId ?? null;

    const resolveFromBase = key => {
      if (key && typeof key === 'object') return key;
      const s = String(key).toLowerCase();
      return (
        BASE.find(p => String(p.no) === s) ||
        BASE.find(p => (p.nameEn || '').toLowerCase() === s) ||
        BASE.find(p => (p.name || p.nameJa || '').toLowerCase() === s) ||
        null
      );
    };

    const normalizeTypes = p => {
      const typesJa = Array.isArray(p?.types) ? p.types.slice() : [];
      const typesEn = typesJa.map(t => pokemonUtil.translateTypes?.toEnType?.(t) || '');
      return { typesJa, typesEn };
    };

    const getMoveMaster = id =>
      MOV.find(m => (m.id || m.moveId) === id) || null;

    const normMove = (mid, cat) => {
      const m = getMoveMaster(mid) || {};
      const typeEn = m.type || m.pokemonType || '';
      return {
        id: mid,
        nameJa: m.nameJa || m.name || '',
        nameEn: m.nameEn || '',
        typeJa: pokemonUtil.translateTypes?.toJaType?.(typeEn) || '',
        typeEn: typeEn || '',
        power:  m.power ?? m.powerPvP ?? null,
        energy: m.energyDelta ?? m.energy ?? null,
        turns:  m.turns ?? null,
        category: cat
      };
    };

    return arr.map(key => {
      const p = resolveFromBase(key);
      if (!p) return { id: null, nameJa: String(key), typesJa: [], typesEn: [], moves: { normal: [], special: [] } };

      const id = normalizeId(p);
      const { typesJa, typesEn } = normalizeTypes(p);

      // ★ 強化: あらゆるキーで GO を引く
      const meta = pokemonUtil._resolveGoMeta(p) || {};

      // ★ 技ID: quick / cinematic に対応
      const fastIds = (
        meta.fastMoves             ||
        meta.quickMoves            ||
        (meta.moves && (meta.moves.fast || meta.moves.quick)) ||
        []
      );
      const chargedIds = (
        meta.chargedMoves          ||
        meta.cinematicMoves        ||
        (meta.moves && (meta.moves.charged || meta.moves.cinematic)) ||
        []
      );

      // 原作ステータス（6種）
      const baseStats = {
        hp:        p.stats?.hp ?? null,
        attack:    p.stats?.attack ?? null,
        defence:   p.stats?.defence ?? null,
        spAttack:  p.stats?.spAttack ?? null,
        spDefence: p.stats?.spDefence ?? null,
        speed:     p.stats?.speed ?? null
      };
      const baseTotal = Object.values(baseStats).reduce((a, b) => a + (b || 0), 0);

      // ★ goStats: meta.stats.* を見る＆"defence" を吸収
      const s = meta && meta.stats ? meta.stats : {};
      const goStats = {
        attack : s.attack  ?? meta.attack      ?? meta.baseAttack  ?? meta.atk ?? null,
        defense: s.defence ?? s.defense        ?? meta.defense     ?? meta.baseDefense ?? meta.def ?? null,
        stamina: s.stamina ?? meta.stamina     ?? meta.baseStamina ?? meta.hp  ?? null
      };

      return {
        id,
        nameEn: p.nameEn || p.name || '',
        nameJa: p.nameJa || p.name || '',
        typesJa,
        typesEn,
        baseStats,
        baseTotal,
        goStats, // ← ここが null にならないはず
        moves: {
          normal : Array.isArray(fastIds)    ? fastIds.map(m => normMove(m, 'normal'))  : [],
          special: Array.isArray(chargedIds) ? chargedIds.map(m => normMove(m, 'special')) : []
        },
        _raw: p
      };
    });
  },

  getMetaForPokemon : function(p) {
    const metaList = Array.isArray(window.__POKEMON_GO_META__) ? window.__POKEMON_GO_META__ : [];
    if (!metaList.length || !p) return null;

    const dex  = p.dex || p.pokedex_id || p.pokedexId || p.id;
    const name = p.name || p.nameEn || p.pokemon_id || p.pokemonId || p.species || p.speciesId;

    if (dex != null) {
      const byDex = metaList.find(m =>
        m.dex === dex || m.pokedex === dex || m.pokedex_id === dex || m.num === dex
      );
      if (byDex) return byDex;
    }

    if (name) {
      const ln = pokemonUtil.normalizeKey(name);
      const byName = metaList.find(m => {
      const keys = [m.name, m.pokemon_id, m.pokemonId, m.species, m.speciesId].filter(Boolean);
        return keys.some(k => pokemonUtil.normalizeKey(k) === ln);
        });
      if (byName) return byName;
    }

    return null;
  },

  getMoveMaster :function(moveId) {
    const list = Array.isArray(window.__MOVES_MASTER_LOCALIZED__) ? window.__MOVES_MASTER_LOCALIZED__ : [];
    if (!list.length || !moveId) return null;
    const q = normalizeKey(moveId);
    return list.find(m => {
      const keys = [m.id, m.moveId, m.templateId, m.nameEn, m.name].filter(Boolean);
      return keys.some(k => normalizeKey(k) === q);
    }) || null;
  },

  getCounterTypes : function(defenderTypesJa, defenseChart) {
    const chart = Array.isArray(defenseChart) ? defenseChart : (window.__TYPE_DEFENSE_TABLE__ || []);
    if (!Array.isArray(defenderTypesJa) || !defenderTypesJa.length || !chart.length) return [];

    const EPS = 1e-6;
    const multMap = new Map();

    const findRow = function(defJa) {
      const defEn = pokemonUtil.translateTypes.toEnType(defJa);
      if (!defEn) return null;
      const key = defEn.toLowerCase();
      return chart.find(r => (r.type || '').toLowerCase() === key) || null;
    };

    defenderTypesJa.forEach(defJa => {
      const row = findRow(defJa);
      if (!row || !Array.isArray(row.effect)) return;
      row.effect.forEach(e => {
        const atkJa = pokemonUtil.translateTypes.toJaType(e.type);
        if (!atkJa) return;
        const m   = pokemonUtil.normalizeMultiplier(e);
        const cur = multMap.get(atkJa) ?? 1.0;
        multMap.set(atkJa, cur * m);
      });
    });

    return Array.from(multMap.entries())
      .filter(([, v]) => v > (1.0 + EPS))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k); // ← ['でんき','くさ', ...]
  },
  pickPokemonByTypes : function(counterTypesJa, options = {}) {
    const dataset = Array.isArray(options.dataset) ? options.dataset : (window.__POKEMON_DATA__ || []);
    const limit   = Number(options.limit || 20);
    if (!counterTypesJa?.length || !dataset.length) return [];

    const set = new Set(counterTypesJa);

    const scored = dataset
      .filter(p => !p.isMegaEvolution)
      .map(p => {
        const typesJa = pokemonUtil.normalizeTypesJa(p); // ['みず','ひこう'] 等
        const hitCnt  = typesJa.reduce((acc, t) => acc + (set.has(t) ? 1 : 0), 0);
        if (!hitCnt) return null;
        const total = pokemonUtil.totalBase(p);
        // スコア: 一致タイプ重視 → 種族値で微調整
        const score = hitCnt * 100000 + total; // hit優先度を極端に高める
        return Object.assign({}, p, { _typesJa: typesJa, _score: score, _total: total });
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    return scored;
  },
};
