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
  getImageUrlByNo : function(no) {
    // 数値か文字列かに関係なく安全に扱う
    const id = parseInt(no, 10);
    if (!id || isNaN(id)) {
      console.warn('Invalid Pokémon ID:', no);
      return 'https://placehold.jp/300x300.png';
    }

    // 正しい画像URL
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  },

  // 今後の拡張例：
  getFallbackImageUrl : function(no) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${no}.png`;
  },

  getDisplayName : function(poke) {
    return poke.form ? `${poke.name}（${poke.form}）` : poke.name;
  },
  translate : {
    typeName : [
      'normal', 
      'fire', 
      'water', 
      'grass', 
      'electric', 
      'ice', 
      'fighting', 
      'poison', 
      'ground', 
      'flying', 
      'psychic', 
      'bug', 
      'rock', 
      'ghost', 
      'dragon', 
      'dark', 
      'steel', 
      'fairy'
    ], 
    typeNameJa : [
      'ノーマル', 
      'ほのお', 
      'みず', 
      'くさ', 
      'でんき', 
      'こおり', 
      'かくとう', 
      'どく', 
      'じめん', 
      'ひこう', 
      'エスパー', 
      'むし', 
      'いわ', 
      'ゴースト', 
      'ドラゴン', 
      'あく', 
      'はがね', 
      'フェアリー'
    ], 
    EtoJ : function(str) {
      let Jvalue = str;
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
      let Evalue = str;
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
      return str.replace(/[\u3041-\u3096]/g, function(match) {
        const chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
      });
    }
  },

  /**
   * 攻撃有効タイプ抽出（防御視点）
   * @param {Array} defenderTypesJa - 防御側タイプ（日本語）
   * @param {Object} defenseChart - 防御相性データ（type_defense.json）
   * @return {Set} superEffective - 有効な攻撃タイプの英語セット
   */
  pickCounterAttackTypes : function(defenseTypesJa, typeDefenseTable) {
    if (!Array.isArray(defenseTypesJa) || defenseTypesJa.length === 0) return [];
    const TABLE = Array.isArray(typeDefenseTable) ? typeDefenseTable : [];

    // value 方式(+2〜-2 等)でも multiplier 方式でも拾える正規化
    const toMul = (e) => {
      if (e == null) return 1;
      if (typeof e.multiplier === 'number') return e.multiplier;
      // 旧: 攻撃←防御の足し算データ（例: +2, +1, 0, -1, -2）
      const v = Number(e.value);
      if (Number.isFinite(v)) {
        if (v >= 2)  return 2.56; // x4
        if (v === 1) return 1.6;  // x2
        if (v === 0) return 1.0;
        if (v === -1) return 0.625; // x0.5
        if (v <= -2) return 0.39;   // x0.25（≈0.390625）
      }
      return 1.0;
    };

    const multMap = new Map(); // key: 攻撃タイプ(和名), val: 合成倍率
    defenseTypesJa.forEach(defJa => {
      const row = TABLE.find(r => r.typeJa === defJa);
      if (!row || !Array.isArray(row.effect)) return;
      row.effect.forEach(e => {
        const atkJa = e.typeJa;
        const cur = multMap.get(atkJa) ?? 1;
        multMap.set(atkJa, cur * toMul(e));
      });
    });

    return Array.from(multMap.entries())
      .filter(([,m]) => m > 1)        // こうかばつぐんのみ
      .sort((a,b) => b[1] - a[1])     // 倍率の高い順
      .map(([atkJa]) => atkJa);
  },

  /**
   * 種族値合計（単純化）
   */
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

  /**
   * 対策ポケモン抽出（防御側タイプからこうかばつぐんを取れるもの）
   */
  recommendCounters: function(options) {
    const {
      defenderTypesJa = [],
      pokemonDataset = [],
      defenseChart = {},
      limit = 5
    } = options;

    const atkTypesEN = pokemonUtil.pickCounterAttackTypes(defenderTypesJa, defenseChart);
    if (!atkTypesEN.size) return [];

    const list = pokemonDataset
      .filter(function(p) { return !p.isMegaEvolution; })
      .map(function(p) {
        const typesEN = pokemonUtil.translateTypes.toEnTypes(p.types || []);
        const hits = typesEN.some(function(t) { return atkTypesEN.has(t); });
        return Object.assign({}, p, {
          _typesEN: typesEN,
          _total: pokemonUtil.totalBase(p),
          _hits: hits
        });
      })
      .filter(function(p) { return p._hits; })
      .sort(function(a, b) { return b._total - a._total; })
      .slice(0, limit);

    return list;
  },

  /**
   * 対策ポケモン描画
   */
  renderRecommendations: function($listArea, recs) {
    $listArea.empty();

    recs.forEach(function(p) {
      const $li = $('<li class="pokemon-recommend-list-item js_toggle-wrapper"></li>');
      const $header = $('<div class="pokemon-recommend-list-item-header js_pokemon-recommend-list-item-header"></div>');
      const $content = $('<div class="pokemon-recommend-list-item-atack js_toggle-content"></div>');

      $li.append($header, $content);
      $listArea.append($li);

      // pokemonCardを使ってヘッダー生成
      pokemonCard($header, {
        id: p.id,
        nameJa: p.name,
        typesJa: p.types,
        img: getImageUrlByNo(p.id)
      });

      // 技部分は今後追加予定
      // $content.append('<div class="pokemon-recommend-list-item-atack-normal">…</div>');
    });
  },

  normalizeTypesJa : function(item){
    // 優先順: typesJa(array) -> types(array/string 英名) -> []
    let src = item.typesJa ?? item.types ?? [];
    // 文字列なら配列化
    if (!Array.isArray(src)) src = src ? [src] : [];
    // 英名が来ても和名に寄せる
    const ja = src.map(t => {
      // 既に和名ならそのまま、英名っぽい場合は変換
      const isKana = /[ぁ-んァ-ヶ]/.test(t);
      return isKana ? t : pokemonUtil.translate.EtoJ(String(t));
    });
    return ja;
  },

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

  toJaTypeArray : function(types) {
    if (!Array.isArray(types)) return [];
    return types.map(t => {
      const s = String(t).trim();
      // すでにカタカナならそのまま
      if (/[ァ-ヴー]/.test(s)) return s;
      // 英語→日本語に変換（pokemonUtil.EtoJ か translate.EtoJ を使う）
      return (pokemonUtil && pokemonUtil.EtoJ) ? pokemonUtil.EtoJ(s) : translate.EtoJ(s);
    });
  },
  translateTypes : {
    toJaType: function(en){
      // 英→日
      const map = {
        normal:'ノーマル', fire:'ほのお', water:'みず', grass:'くさ',
        electric:'でんき', ice:'こおり', fighting:'かくとう', poison:'どく',
        ground:'じめん', flying:'ひこう', psychic:'エスパー', bug:'むし',
        rock:'いわ', ghost:'ゴースト', dragon:'ドラゴン', dark:'あく',
        steel:'はがね', fairy:'フェアリー'
      };
      return map[en] || en;
    },
    toEnType: function(ja){
      const map = {
        'ノーマル':'normal','ほのお':'fire','みず':'water','くさ':'grass',
        'でんき':'electric','こおり':'ice','かくとう':'fighting','どく':'poison',
        'じめん':'ground','ひこう':'flying','エスパー':'psychic','むし':'bug',
        'いわ':'rock','ゴースト':'ghost','ドラゴン':'dragon','あく':'dark',
        'はがね':'steel','フェアリー':'fairy'
      };
      return map[ja] || ja;
    }
  }

};
