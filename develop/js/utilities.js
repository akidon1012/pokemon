const pokemonCard = {
  build: function(poke) {
    const name  = poke?.name  || '';
    const img   = poke?.image || 'https://placehold.jp/300x300.png';
    const types = Array.isArray(poke?.types) ? poke.types : [];

    const typeBadges = types.map(function(t) {
      const en = pokemonUtil.translate.JtoE(t);
      return `<div class="badge"><span class="icon icon-type-${en}"></span>${t}</div>`;
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
}
const pokemonUtil = {
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

};
