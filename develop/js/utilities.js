// 例外的に `_00` 以外のアイコンを使うポケモン: dexNo -> suffix
// 必要になったらここに追加していく
const POKEMON_ICON_SUFFIX_BY_NO = {
  // 865: '31', // ネギガナイト: pokemon_icon_865_31.png
  // ほかにも見つかったらここへ追記
};

const pokemonCard = {
  build: function(poke) { 
    const name  = poke?.name  || '';
    const img   = poke?.image || 'https://placehold.jp/300x300.png';
    const types = Array.isArray(poke?.types) ? poke.types : [];

    const typeBadges = types.map(function(tJa) {
      const tEn = (pokemonUtil.translate.JtoE(tJa) || '').toLowerCase();
      return `
        <div class="badge">
          <span class="icon icon-type-${tEn}"></span>${tJa}
        </div>`;
    }).join('');

    return `
  <div class="pokemon-info-wrapper">
    <div class="pokemon-info-img">
      <img
        src="${img}"
        decoding="async"
        loading="lazy"
        alt="${name}"
        onerror="pokemonUtil.handleImageError(this)"
      >
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
    state: { POKEMON_DATA: [], TYPE_DEFENSE: [], MOVES: [], GO_META: [], GO_META_OVERRIDE: {} },
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
        }),
        $.getJSON('../../data/pokemon_go_meta_override.json').done(d => {
          this.state.GO_META_OVERRIDE = d || {};
        })
      ];

      $.when.apply($, jobs).done(() => {
        // 互換のため：必要ならグローバルにも流す（移行期）
        window.__TYPE_DEFENSE_TABLE__   = this.state.TYPE_DEFENSE;
        window.__POKEMON_DATA__         = this.state.POKEMON_DATA;
        window.__MOVES_MASTER_LOCALIZED__ = this.state.MOVES;
        window.__POKEMON_GO_META__      = this.state.GO_META;
        window.__POKEMON_GO_META_OVERRIDE__ = this.state.GO_META_OVERRIDE;

        $(document).trigger('pokemon:data-ready', [this.state]);
        dfd.resolve(this.state);
      }).fail(dfd.reject);

      this._dfd = dfd;
      return dfd.promise();
    },

    onReady(fn) { return this.loadAll().done(fn); },
    get(key)    { return this.state[key]; }
  },

// 図鑑番号ベースで GO ステータス＋ゲンシ／メガ override を当てる版
attachGoStats : (function(){
  let _metaById  = null; // pokemonId → meta
  let _metaByNo  = null; // no        → meta
  let _ovByBase  = null; // basePokemonId → [override,...]
  let _ovByNo    = null; // dex no         → [override,...]

  function buildIndexes() {
    if (_metaById && _metaByNo && _ovByBase && _ovByNo) return;

    const metaList = pokemonUtil.data.get('GO_META') || [];
    const ovRaw    = pokemonUtil.data.get('GO_META_OVERRIDE') || {};

    _metaById = {};
    _metaByNo = {};
    metaList.forEach(function(m){
      if (!m) return;
      const pid = m.pokemonId;
      const no  = Number(m.no);
      if (pid) _metaById[pid] = m;
      if (Number.isFinite(no)) _metaByNo[no] = m;
    });

    _ovByBase = {};
    _ovByNo   = {};

    Object.keys(ovRaw || {}).forEach(function(key){
      const ov = ovRaw[key];
      if (!ov) return;

      const baseId = ov.basePokemonId || key.split('_')[0]; // 'KYOGRE' など
      if (!baseId) return;

      const tempId = ov.tempId || key.split('_').slice(1).join('_'); // 'TEMP_EVOLUTION_PRIMAL' 等
      const stats  = ov.stats || {};

      // basePokemonId → list
      if (!_ovByBase[baseId]) _ovByBase[baseId] = [];
      _ovByBase[baseId].push({
        key,
        basePokemonId: baseId,
        tempId,
        stats
      });

      // 図鑑番号でも引けるように no を求める
      const meta = _metaById[baseId];
      const no   = meta ? Number(meta.no) : NaN;
      if (Number.isFinite(no)) {
        if (!_ovByNo[no]) _ovByNo[no] = [];
        _ovByNo[no].push({
          key,
          basePokemonId: baseId,
          tempId,
          stats
        });
      }
    });

    console.log(
      '[attachGoStats] metaById=', Object.keys(_metaById).length,
      'metaByNo=', Object.keys(_metaByNo).length,
      'overrideBases=', Object.keys(_ovByBase).length,
      'overrideNos=', Object.keys(_ovByNo).length
    );
  }

  // ゲンシ／メガっぽい名前かどうか
  function detectFlags(pd) {
    const flags = [];

    [
      pd.formKey,
      pd.form,
      pd.formId,
      pd.tempEvoId,
      pd.nameEn,
      pd.nameJa
    ].forEach(function(v){
      if (v == null) return;
      flags.push(String(v).toUpperCase());
    });

    const isPrimal = flags.some(function(s){
      return s.indexOf('ゲンシ') >= 0 || s.indexOf('PRIMAL') >= 0;
    });

    const isMega = flags.some(function(s){
      return s.indexOf('メガ') >= 0 || s.indexOf('MEGA') >= 0;
    });

    return { isPrimal, isMega };
  }

  // override リストから、PRIMAL / MEGA を見て 1つ選ぶ
  function chooseOverride(list, flags) {
    if (!list || !list.length) return null;
    const { isPrimal, isMega } = flags;
    let candidate = null;

    list.forEach(function(ov){
      const tid = String(ov.tempId || '').toUpperCase();
      if (!tid) return;

      if (isPrimal && tid.indexOf('PRIMAL') >= 0) {
        candidate = ov;
      } else if (isMega && tid.indexOf('MEGA') >= 0) {
        candidate = ov;
      }
    });

    return candidate;
  }

  return function attachGoStats(pd) {
    if (!pd) return pd;

    buildIndexes();

    // 図鑑番号（no）を優先して見る
    let dexNo = null;
    if (pd.no != null && Number.isFinite(Number(pd.no))) {
      dexNo = Number(pd.no);
    } else if (pd.id != null && Number.isFinite(Number(pd.id))) {
      dexNo = Number(pd.id);
    }

    // ベースとなる meta（通常フォーム）
    let baseMeta = null;

    if (dexNo != null && _metaByNo[dexNo]) {
      baseMeta = _metaByNo[dexNo];
    } else {
      // no が取れない場合のフォールバック：pokemonId ベース
      const rawId  = pd.pokemonId || pd.id;
      const baseId = rawId ? String(rawId).split('_')[0] : null;
      if (baseId && _metaById[baseId]) {
        baseMeta = _metaById[baseId];
      }
    }

    if (baseMeta && baseMeta.stats) {
      const s = baseMeta.stats;
      pd.goStats = pd.goStats || {};
      pd.goStats.attack  = s.attack;
      pd.goStats.defense = s.defence;
      pd.goStats.stamina = s.stamina;
    }

    // === ここからゲンシ／メガ override ===
    const flags = detectFlags(pd);

    let ovList = null;

    if (dexNo != null && _ovByNo[dexNo]) {
      ovList = _ovByNo[dexNo];
    } else if (baseMeta && baseMeta.pokemonId && _ovByBase[baseMeta.pokemonId]) {
      ovList = _ovByBase[baseMeta.pokemonId];
    }

    const ov = chooseOverride(ovList, flags);
    if (ov && ov.stats) {
      const s = ov.stats;
      pd.goStats = pd.goStats || {};
      if (s.attack  != null) pd.goStats.attack  = s.attack;
      if (s.defence != null) pd.goStats.defense = s.defence;
      if (s.stamina != null) pd.goStats.stamina = s.stamina;
      console.log('[attachGoStats] override applied:', dexNo, pd.nameJa || pd.nameEn, ov.key, pd.goStats);
    }

    return pd;
  };
})(),

  // 画像URL関連 ---------------------------------------------------
  getImageUrl : function(p) {
    if (!p || !p.no) return '';

    const no4 = String(p.no).padStart(4, '0');
    const id  = String(p.pokemonId || '').toUpperCase();
    let suffix = '00';

    const kind = p.formKind;    // 'base' | 'mega' | 'primal' | 'region'
    const region = p.region;    // 'alola' | 'galar' | null

    if (kind === 'mega') {
      let sub = 'mega';
      if (/_MEGA_X$/i.test(p.form)) sub = 'mega_x';
      if (/_MEGA_Y$/i.test(p.form)) sub = 'mega_y';

      const mapKey = `${id}|${sub}`;
      suffix = pokemonSpecialIconMap[mapKey] ?? '00';

    } else if (kind === 'primal') {
      suffix = pokemonSpecialIconMap[`${id}|primal`] ?? '00';

    } else if (kind === 'region' && region) {
      suffix = pokemonSpecialIconMap[`${id}|${region}`] ?? '00';
    }

    return `/images/pokemon/pokemon_icon_${no4}_${suffix}.png`;
  },

  getImageUrlByNo : function(no) {
    if (!no && no !== 0) return '/images/no_img.svg';

    const n3 = String(no).padStart(3, '0');

    // 1. まずは通常フォーム用の _00 を優先
    if (pokemonUtil.imageSuffixExists(no, '00')) {
      return '/images/pokemon/pokemon_icon_' + n3 + '_00.png';
    }

    // 2. _00 が無ければ、その No の suffix 一覧を取得して先頭を使う
    const suffixList = pokemonUtil.listAvailableFormSuffix(no);
    if (suffixList.length > 0) {
      const suffix = suffixList[0]; // ここは必要に応じてソートルールを変えてもOK
      return '/images/pokemon/pokemon_icon_' + n3 + '_' + suffix + '.png';
    }

    // 3. それでもなければ no image（onerror＋no_img.svg でも最終保険あり）
    return '/images/no_img.svg';
  },

  handleImageError : function(img) {
    // wrapper に no_img クラスをつける
    const wrapper = img.closest('.pokemon-info-img');
    if (wrapper) wrapper.classList.add('no_img');

    // 差し替え画像
    img.src = '/images/no_img.svg';

    // 無限ループ防止
    img.onerror = null;
  },

  // 画像ファイル一覧を返すヘルパー
  getImageFileList : function() {
    return Array.isArray(window.POKEMON_IMAGE_FILE_LIST)
      ? window.POKEMON_IMAGE_FILE_LIST
      : [];
  },

  // 指定 No の suffix 一覧を取得（例: no=865 → ['31']）
  listAvailableFormSuffix : function(no) {
    if (!no && no !== 0) return [];

    const files = pokemonUtil.getImageFileList();
    const n3    = String(no).padStart(3, '0'); // 001, 154, 865

    const prefix = 'pokemon_icon_' + n3 + '_';
    const suffixes = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.startsWith(prefix)) continue;
      // pokemon_icon_001_00.png → 00
      const m = f.match(/^pokemon_icon_\d+_(\d+)\.png$/i);
      if (m && m[1]) {
        suffixes.push(m[1]);
      }
    }

    return suffixes;
  },

  // 指定 No + suffix のファイルが存在するかどうか
  imageSuffixExists : function(no, suffix) {
    if (!suffix) return false;
    const files = pokemonUtil.getImageFileList();
    const n3    = String(no).padStart(3, '0');
    const name  = 'pokemon_icon_' + n3 + '_' + suffix + '.png';
    return files.includes(name);
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

  normalizeMultiplier: function (e) {
    const ONE = 1.0;
    if (e == null) return ONE;

    const coerce = v => {
      if (v == null) return null;
      if (typeof v === 'number') return (isFinite(v) && v > 0) ? v : null;
      if (typeof v === 'string') {
        const s = v.trim();
        const mPct = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*%$/);
        if (mPct) return parseFloat(mPct[1]) / 100;
        const mNum = s.match(/^[×x]?\s*([0-9]+(?:\.[0-9]+)?)$/i);
        if (mNum) return parseFloat(mNum[1]);
        const n = parseFloat(s.replace(/[^\d.]/g, ''));
        return isFinite(n) ? n : null;
      }
      return null;
    };

    // 直接の数値/文字列
    const direct = coerce(e);
    if (direct != null) return direct;

    // オブジェクト形式
    if (typeof e === 'object') {
      if ('value' in e) {
        const v = coerce(e.value);
        if (v != null) {
          if (v === -2) return 0.390625;
          if (v === -1) return 0.625;
          if (v ===  0) return 1.0;
          if (v ===  1) return 1.6;
          if (v > 0)   return v;      // 2.56 等
        }
      }
      const raw = e.mult ?? e.multiplier ?? e.m ?? e.x;
      let m = coerce(raw);
      if (m != null) {
        if (typeof raw === 'number' && m > 3 && m <= 300) m = m / 100; // 160 → 1.6 保険
        return m;
      }
    }
    return ONE;
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

    // 通常技（quick + eliteQuick）
    const quickIds = []
      .concat(Array.isArray(goMoves.quick) ? goMoves.quick : [])
      .concat(Array.isArray(goMoves.eliteQuick) ? goMoves.eliteQuick : []);

    // スペシャル技（cinematic + eliteCinematic）
    const cinematicIds = []
      .concat(Array.isArray(goMoves.cinematic) ? goMoves.cinematic : [])
      .concat(Array.isArray(goMoves.eliteCinematic) ? goMoves.eliteCinematic : []);

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
      if (!p) {
        return {
          id: null,
          nameJa: String(key),
          typesJa: [],
          typesEn: [],
          moves: { normal: [], special: [] }
        };
      }

      const id = normalizeId(p);
      const { typesJa, typesEn } = normalizeTypes(p);

      // ★ 強化: あらゆるキーで GO を引く
      const meta = pokemonUtil._resolveGoMeta(p) || {};

      // ★ 技ID: quick / cinematic 系 + elite 系も拾う
      const mMoves = meta.moves || {};

      // 通常技（fast / quick / moves.fast / moves.quick / moves.eliteQuick などを全部マージ）
      const fastIds = []
        .concat(Array.isArray(meta.fastMoves)      ? meta.fastMoves      : [])
        .concat(Array.isArray(meta.quickMoves)     ? meta.quickMoves     : [])
        .concat(Array.isArray(mMoves.fast)         ? mMoves.fast         : [])
        .concat(Array.isArray(mMoves.quick)        ? mMoves.quick        : [])
        .concat(Array.isArray(mMoves.eliteQuick)   ? mMoves.eliteQuick   : [])
        .concat(Array.isArray(meta.eliteQuickMoves)? meta.eliteQuickMoves: []);

      // スペシャル技（charged / cinematic / moves.charged / moves.cinematic / moves.eliteCinematic など全部）
      const chargedIds = []
        .concat(Array.isArray(meta.chargedMoves)        ? meta.chargedMoves        : [])
        .concat(Array.isArray(meta.cinematicMoves)      ? meta.cinematicMoves      : [])
        .concat(Array.isArray(mMoves.charged)           ? mMoves.charged           : [])
        .concat(Array.isArray(mMoves.cinematic)         ? mMoves.cinematic         : [])
        .concat(Array.isArray(mMoves.eliteCinematic)    ? mMoves.eliteCinematic    : [])
        .concat(Array.isArray(meta.eliteCinematicMoves) ? meta.eliteCinematicMoves : []);

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
        goStats,
        moves: {
          normal : Array.isArray(fastIds)    ? fastIds.map(m => normMove(m, 'normal'))   : [],
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
  multFor(moveTypeEn, defenderTypesJa, defenseChart){
    if (!moveTypeEn || !Array.isArray(defenderTypesJa) || !defenderTypesJa.length) return 1.0;
    const tEn = String(moveTypeEn).toLowerCase();
    let m = 1.0;
    defenderTypesJa.forEach(defJa => {
      const defEn = pokemonUtil.translateTypes.toEnType(defJa);
      if (!defEn) return;
      const row = defenseChart.find(r => (r.type || '').toLowerCase() === String(defEn).toLowerCase());
      if (!row || !Array.isArray(row.effect)) return;
      const ef  = row.effect.find(x => (x.type || '').toLowerCase() === tEn);
      const mv  = pokemonUtil.normalizeMultiplier(ef ? { value: ef.value, mult: ef.mult } : {});
      m *= (Number.isFinite(mv) && mv > 0) ? mv : 1.0;
    });
    return m;
  },
  filterSuperEffectiveMoves: function(moves, defenderTypesJa, defenseChart){
    if (!Array.isArray(moves)) return [];
    const chart = Array.isArray(defenseChart) ? defenseChart : (window.__TYPE_DEFENSE_TABLE__ || []);
    const EPS = 1e-6;

    return moves.filter(m => {
      const tEn =
        (m.typeEn || m.type || m.type_en || '').toString().toLowerCase();
      if (!tEn) return false; // 型不明は除外
      const mult = pokemonUtil.multFor(tEn, defenderTypesJa, chart);
      return mult > 1.0 + EPS; // こうかばつぐんのみ
    });
  },
  toEnTypeLower : function(t){
    if (!t) return '';
    let s = String(t);
    s = s.replace(/^POKEMON_TYPE_/i, ''); // POGOのプリフィックス除去
    return s.trim().toLowerCase();        // ex) 'WATER' → 'water'
  },

};
