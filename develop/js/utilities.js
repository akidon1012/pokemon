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

  /**
   * 対策ポケモン抽出（防御側タイプからこうかばつぐんを取れるもの）
   */
  recommendCounters: function(options) {
    const {
      defenderTypesJa = [],
      pokemonDataset = [],
      defenseChart = [],
      limit = 5
    } = options || {};

    const atkTypesEN = pokemonUtil.pickCounterAttackTypes(defenderTypesJa, defenseChart);
    if (!atkTypesEN.size) return [];

    const list = (pokemonDataset || [])
      .filter(function(p){ return !p.isMegaEvolution; })
      .map(function(p) {
        const typesJa = pokemonUtil.normalizeTypesJa(p);
        const typesEN = pokemonUtil.translateTypes.toEnTypes(typesJa);
        const hits = typesEN.some(function(t){ return atkTypesEN.has(t); });
        return Object.assign({}, p, {
          _typesEN: typesEN,
          _typesJa: typesJa,
          _total: pokemonUtil.totalBase(p),
          _hits: hits
        });
      })
      .filter(function(p){ return p._hits; })
      .sort(function(a,b){ return b._total - a._total; })
      .slice(0, limit);

    return list;
  },

  /**
   * 対策ポケモン描画（カードUIに合わせてヘッダーだけ作る）
   * - .js_pokemon-recommend-list 内に li を生成
   * - 技部分は .pokemon-recommend-list-item-atack に後から追加想定
   */
  renderRecommendations: function($listArea, recs) {
    const $area = ($listArea instanceof jQuery) ? $listArea : $($listArea);
    if (!$area.length) return;

    $area.empty();

    if (!Array.isArray(recs) || recs.length === 0) {
      $area.append('<li class="pokemon-recommend-list-item">該当なし</li>');
      return;
    }

    recs.forEach(function(p){
      const id       = p.id || p.no || p.pokedex || null;
      const typesJa  = pokemonUtil.normalizeTypesJa(p);
      const display  = pokemonUtil.getDisplayName(p);
      const imageUrl = pokemonUtil.getImageUrlByNo(id);

      const cardHtml = (typeof pokemonCard !== 'undefined' && pokemonCard && typeof pokemonCard.build === 'function')
        ? pokemonCard.build({
            name  : display,
            image : imageUrl,
            types : typesJa
          })
        : '<div class="pokemon-info-wrapper">' + display + '</div>';

      const liHtml =
        '<li class="pokemon-recommend-list-item js_toggle-wrapper">' +
          '<div class="pokemon-recommend-list-item-header js_pokemon-recommend-list-item-header">' +
            cardHtml +
            '<a href="" class="js_toggle-trigger"></a>' +
          '</div>' +
          '<div class="pokemon-recommend-list-item-atack js_toggle-content"></div>' +
        '</li>';

      $area.append(liHtml);
    });
  }
};
