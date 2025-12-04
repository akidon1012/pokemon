const GO_META_LIST   = window.POKEMON_GO_META || window.POKEMON_GO_META_LOCALIZED || [];
const MOVES_MASTER   = window.MOVES_MASTER_LOCALIZED || window.MOVES_MASTER || [];
const MOVE_NAME_DICT = window.MOVE_NAME_DICT || {};

const pokemonCard = {
   // -----------------------------
  // 技1行分（ノーマル／スペシャル共通）
  // -----------------------------
  buildMoveRow: function (mv, options) {
    const opt  = options || {};
    const esc  = pokemonUtil.escapeHtml;
    const toEn = pokemonUtil.toEnTypeLower;

    const name   = mv.nameJa || mv.name || '';
    const typeEn = toEn(mv.typeJa || mv.type);
    const power  = mv.power;

    const category  = opt.category || 'normal'; // 'normal' or 'special'
    const showStars = !!opt.showStars;         // true: ★を描画
    const showGauge = !!opt.showGauge;         // true: ゲージsvgを描画

    // ★レーティング（1〜5・0は表示なし）
    const rating = showStars ? (opt.rating || mv.__globalRating || 0) : 0;

    // ゲージID
    const gaugeId = showGauge
      ? (opt.gaugeId || mv.__gaugeSvgId || pokemonCard.resolveGaugeId(mv))
      : '';

    const strongest = !!(opt.isStrongest || mv.__isStrongest);

    let h = '';

    h += '<dd class="pokemon-info-list-item-attack-info';
    if (typeEn)    h += ' is_' + typeEn;
    if (strongest) h += ' is_strongest';
    h += '">';

    // 技名＋タイプアイコン
    h += '<div class="pokemon-info-list-item-attack-name">';
    if (typeEn) {
      h += '<span class="icon-type icon-type-' + typeEn + '"></span>';
    }
    h += esc(name);
    h += '</div>';

    // ★★ スペシャル技のときだけ ★★
    if (category === 'special') {
      // ★アイコン
      if (rating > 0) {
        h += '<div class="pokemon-info-list-item-attack-stars">';
        for (let i = 0; i < rating; i += 1) {
          h += '<span class="icon-star"></span>';
        }
        h += '</div>';
      }

      // ゲージ
      if (gaugeId) {
        h += '<div class="pokemon-info-list-item-attack-gauge">';
        h += '<svg class="gauge" aria-hidden="true"><use href="#' + gaugeId + '"></use></svg>';
        h += '</div>';
      }
    }

    // 威力（ノーマル／スペシャル共通）
    if (power != null) {
      h += '<div class="pokemon-info-list-item-attack-power">' + power + '</div>';
    }

    h += '</dd>';

    return h;
  },

  // -----------------------------
  // スペシャル技のゲージ判定
  // -----------------------------
  resolveGaugeId: function (mv) {
    if (mv.__gaugeSvgId) return mv.__gaugeSvgId;

    const energy = mv.energy;
    if (energy == null || energy >= 0) return '';

    const abs = Math.abs(energy);
    if (abs >= 75) return 'gauge1'; // 1ゲージ
    if (abs >= 45) return 'gauge2'; // 2ゲージ
    return 'gauge3';                // それ以外は3ゲージとみなす
  },

  // -----------------------------
  // カード1枚分のHTML（1匹／おすすめ共通）
  // -----------------------------
  buildInfoItemHtml: function (poke, options) {
    const opt      = options || {};
    const opened   = !!opt.opened;        // true: 初期展開
    const showStars = !!opt.showStars;    // true: ★表示

    const esc  = pokemonUtil.escapeHtml;
    const toEn = pokemonUtil.toEnTypeLower;

    const nameJa  = poke.nameJa || poke.name || '';
    const typesJa = Array.isArray(poke.typesJa || poke.types)
      ? (poke.typesJa || poke.types)
      : [];

    const statsSrc = poke.goStats || poke.stats || poke.baseStats || {};
    const atk = statsSrc.attack  || statsSrc.atk     || 0;
    const def = statsSrc.defense || statsSrc.defence || statsSrc.def || 0;
    const sta = statsSrc.stamina || statsSrc.hp      || statsSrc.sta || 0;

    const movesObj     = poke.moves || {};
    const normalMoves  = Array.isArray(movesObj.normal)  ? movesObj.normal  : [];
    const specialMoves = Array.isArray(movesObj.special) ? movesObj.special : [];

    const h = [];

    h.push('<div class="pokemon-info-list-item js_toggle-wrapper">');

    // ヘッダー
    h.push('<div class="pokemon-info-list-item-header js_pokemon-info-list-item-header">');
    h.push('<div class="pokemon-info-wrapper">');
    h.push('<a href="javascript:void(0);" class="js_toggle-trigger' +
      (opened ? ' is_toggle-opened' : '') + '">');

    h.push('<div class="pokemon-info-name">' + esc(nameJa) + '</div>');

    h.push('<div class="pokemon-info-type">');
    typesJa.forEach(function (tJa) {
      const tEn = toEn(tJa);
      h.push('<div class="badge">');
      h.push('<span class="icon-type icon-type-' + tEn + '"></span>' + esc(tJa));
      h.push('</div>');
    });
    h.push('</div>'); // .pokemon-info-type

    h.push('</a>');
    h.push('</div>'); // .pokemon-info-wrapper
    h.push('</div>'); // .pokemon-info-list-item-header

    // トグル本体
    h.push('<div class="js_toggle-content' +
      (opened ? ' is_toggle-opened' : '') +
      '" style="display:' + (opened ? 'block' : 'none') + ';">');

    // 種族値
    h.push('<dl class="pokemon-info-score">');
    h.push('<dt class="pokemon-info-score-label">種族値(GO)</dt>');
    h.push('<dl class="pokemon-info-score-value">');
    h.push('<ul class="pokemon-info-score-list">');

    if (atk) {
      h.push('<li class="pokemon-info-score-list-item">こうげき <span class="num">' + atk + '</span></li>');
    }
    if (def) {
      h.push('<li class="pokemon-info-score-list-item">ぼうぎょ <span class="num">' + def + '</span></li>');
    }
    if (sta) {
      h.push('<li class="pokemon-info-score-list-item">HP <span class="num">' + sta + '</span></li>');
    }

    h.push('</ul>');
    h.push('</dl>');
    h.push('</dl>');

    // わざラッパー
    h.push('<div class="pokemon-info-list-item-attack-wrapper">');

    const self = this;

    // ノーマル
    if (normalMoves.length) {
      h.push('<div class="pokemon-info-list-item-attack-wrapper">');
      h.push('<dl class="pokemon-info-list-item-attack">');
      h.push('<dt class="pokemon-info-list-item-attack-label">ノーマル</dt>');

      normalMoves.forEach(function (mv) {
        h.push(self.buildMoveRow(mv, {
          category : 'normal',
          showStars: false,
          showGauge: false
        }));
      });

      h.push('</dl>');
      h.push('</div>');
    }

    // スペシャル
    if (specialMoves.length) {
      h.push('<div class="pokemon-info-list-item-attack-wrapper">');
      h.push('<dl class="pokemon-info-list-item-attack">');
      h.push('<dt class="pokemon-info-list-item-attack-label">スペシャル</dt>');

      specialMoves.forEach(function (mv) {
        h.push(self.buildMoveRow(mv, {
          category   : 'special',
          showStars  : opt.showStars, // ★ ここが true のときだけ星表示
          showGauge  : true,
          isStrongest: !!mv.__isStrongest
        }));
      });

      h.push('</dl>');
      h.push('</div>');
    }

    h.push('</div>');  // .pokemon-info-list-item-attack-wrapper
    h.push('</div>');  // .js_toggle-content
    h.push('</div>');  // .pokemon-info-list-item

    return h.join('');
  },

  // -----------------------------
  // 1匹用レンダラー（従来の pokemonCard.render 相当）
  // -----------------------------
  render: function (poke, area) {
    const $area = (area instanceof jQuery) ? area : $(area || '.js_pokemon-search-result');
    if (!$area.length) return;

    const html = this.buildInfoItemHtml(poke, {
      opened   : true,
      showStars: false   // 1匹は★なし
    });

    $area.empty().html(html);

    if (window.userlib && userlib.ui && typeof userlib.ui.toggle === 'function') {
      userlib.ui.toggle('.js_pokemon-info-list-item-header');
    }
  },

  // 1匹表示用カード
  build: function (poke) {
    const baseName = poke.nameJa || poke.name || poke.nameEn || '';
    const regionLabel = pokemonUtil.getFormRegionLabel(
      poke.form || '',
      poke.templateId || '',
      poke.pokemonId || ''
    );

    const nameJa = regionLabel
      ? `${baseName}（${regionLabel}）`
      : baseName;
    const typesJa = Array.isArray(poke.typesJa || poke.types)
      ? (poke.typesJa || poke.types)
      : [];

    const statsSrc = poke.stats || poke.baseStats || {};
    const atk = statsSrc.attack  || statsSrc.atk     || 0;
    const def = statsSrc.defence || statsSrc.def     || 0;
    const sta = statsSrc.stamina || statsSrc.hp      || statsSrc.sta || 0;

    const movesObj     = poke.moves || {};
    const normalMoves  = Array.isArray(movesObj.normal)  ? movesObj.normal  : [];
    const specialMoves = Array.isArray(movesObj.special) ? movesObj.special : [];

    const h    = [];
    const esc  = pokemonUtil.escapeHtml;
    const toEn = pokemonUtil.toEnTypeLower;

    // =========================
    // 外枠
    // =========================
    h.push('<div class="pokemon-search-result js_pokemon-search-result">');

    // -------------------------
    // ヘッダー（名前＋タイプ）
    // -------------------------
    h.push('<div class="pokemon-info-list-item-header js_pokemon-info-list-item-header">');
    h.push('<div class="pokemon-info-wrapper">');
    h.push('<a href="javascript:void(0);" class="js_toggle-trigger is_toggle-opened">');

    // 名前
    h.push('<div class="pokemon-info-name">' + esc(nameJa) + '</div>');

    // タイプ（badge）
    h.push('<div class="pokemon-info-type">');
    typesJa.forEach(function (tJa) {
      const tEn = toEn(tJa);
      h.push('<div class="badge">');
      h.push('<span class="icon-type icon-type-' + tEn + '"></span>' + esc(tJa));
      h.push('</div>');
    });
    h.push('</div>'); // .pokemon-info-type

    h.push('</a>');
    h.push('</div>'); // .pokemon-info-wrapper
    h.push('</div>'); // .pokemon-info-list-item-header

    // -------------------------
    // 本体（toggleコンテンツ）
    // -------------------------
    h.push('<div class="js_toggle-content is_toggle-opened" style="display: block;">');

    // 種族値(GO)
    h.push('<dl class="pokemon-info-score">');
    h.push('<dt class="pokemon-info-score-label">種族値(GO)</dt>');
    h.push('<dl class="pokemon-info-score-value">');
    h.push('<ul class="pokemon-info-score-list">');

    if (atk) {
      h.push('<li class="pokemon-info-score-list-item">');
      h.push('こうげき <span class="num">' + atk + '</span>');
      h.push('</li>');
    }
    if (def) {
      h.push('<li class="pokemon-info-score-list-item">');
      h.push('ぼうぎょ <span class="num">' + def + '</span>');
      h.push('</li>');
    }
    if (sta) {
      h.push('<li class="pokemon-info-score-list-item">');
      h.push('HP <span class="num">' + sta + '</span>');
      h.push('</li>');
    }

    h.push('</ul>');
    h.push('</dl>');
    h.push('</dl>');

    // -------------------------
    // わざラッパー
    // -------------------------
    h.push('<div class="pokemon-info-list-item-attack-wrapper">');

    // ===== ノーマルわざ（ゲージなし想定のまま）=====
    if (normalMoves.length) {
      h.push('<div class="pokemon-info-list-item-attack-wrapper">');
      h.push('<dl class="pokemon-info-list-item-attack">');
      h.push('<dt class="pokemon-info-list-item-attack-label">ノーマル</dt>');

      normalMoves.forEach(function (mv) {
        // 1匹表示ではノーマルはゲージなし・星なし
        h.push(pokemonCard.buildMoveRow(mv, {
          gaugeId: '',      // 必要なら resolveGaugeId(mv) にしてもOK
          rating: 0
        }));
      });

      h.push('</dl>');
      h.push('</div>');
    }

    // ===== スペシャルわざ（ゲージあり・★なし）=====
    if (specialMoves.length) {
      h.push('<div class="pokemon-info-list-item-attack-wrapper">');
      h.push('<dl class="pokemon-info-list-item-attack">');
      h.push('<dt class="pokemon-info-list-item-attack-label">スペシャル</dt>');

      specialMoves.forEach(function (mv) {
        const gaugeId = pokemonCard.resolveGaugeId(mv);

        h.push(pokemonCard.buildMoveRow(mv, {
          gaugeId: gaugeId, // ゲージは欲しい
          rating: 0         // 1匹表示では星なし
          // isStrongest: など必要あればここで
        }));
      });

      h.push('</dl>');
      h.push('</div>');
    }

    h.push('</div>'); // .pokemon-info-list-item-attack-wrapper（外側）
    h.push('</div>'); // .js_toggle-content
    h.push('</div>'); // .pokemon-search-result

    return h.join('');
  },

};
window.pokemonCard = pokemonCard;

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

        // ★ override 側にタイプがあれば保持しておく
        const typesJa = Array.isArray(ov.typesJa) ? ov.typesJa.slice() : null;
        const typesEn = Array.isArray(ov.typesEn) ? ov.typesEn.slice() : null;
        const stats   = ov.stats || {};

        const ovEntry = {
          key,
          basePokemonId: baseId,
          tempId,
          stats,
          typesEn: ov.typesEn || null,
          typesJa: ov.typesJa || null,
        };

        // basePokemonId → list
        if (!_ovByBase[baseId]) _ovByBase[baseId] = [];
        _ovByBase[baseId].push(ovEntry);

        // 図鑑番号でも引けるように no を求める
        const meta = _metaById[baseId];
        const no   = meta ? Number(meta.no) : NaN;
        if (Number.isFinite(no)) {
          if (!_ovByNo[no]) _ovByNo[no] = [];
          _ovByNo[no].push(ovEntry);
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
    // ★ 通常フォームには絶対に適用しないようにする
    function chooseOverride(list, flags, pd) {
      if (!list || !list.length) return null;

      const { isPrimal, isMega } = flags;

      // フォームキー（メガX/Yやゲンシ用）
      const formKey = (pd && (pd.form || pd.formKey || pd.tempEvoId))
        ? String(pd.form || pd.formKey || pd.tempEvoId).toUpperCase()
        : '';

      // 通常フォーム（メガでもゲンシでもない）は override しない
      if (!isPrimal && !isMega && !formKey) {
        return null;
      }

      // 1) formKey に tempId が含まれているものを優先（X / Y の区別など）
      if (formKey) {
        for (let i = 0; i < list.length; i++) {
          const ov  = list[i];
          const tid = String(ov.tempId || ov.key || '').toUpperCase(); // 例: 'TEMP_EVOLUTION_MEGA_X'
          if (!tid) continue;

          if (formKey.indexOf(tid) >= 0) {
            return ov;
          }
        }
      }

      // 2) それでも見つからなければ、PRIMAL / MEGA フラグでざっくり選ぶ（ゲンシ／メガ共用）
      let candidate = null;
      list.forEach(function (ov) {
        const tid = String(ov.tempId || '').toUpperCase();
        if (!tid) return;

        if (isPrimal && tid.indexOf('PRIMAL') >= 0) {
          candidate = ov;
        } else if (isMega && tid.indexOf('MEGA') >= 0) {
          candidate = ov;
        }
      });

      // 3) 通常フォームに誤適用しないため、ここで list[0] にはフォールバックしない
      return candidate;
    }

    // ★ override.types からタイプ配列を組み立てて pd に反映
    function applyTypeOverride(pd, ov) {
      let typesJa = Array.isArray(ov.typesJa) ? ov.typesJa.slice() : [];
      let typesEn = Array.isArray(ov.typesEn) ? ov.typesEn.slice() : [];

      if (!typesJa.length && !typesEn.length) return;

      if (!typesEn.length && typesJa.length) {
        typesEn = typesJa.map(function(t){
          return pokemonUtil.translateTypes?.toEnType?.(t) || '';
        });
      }
      if (!typesJa.length && typesEn.length) {
        typesJa = typesEn.map(function(t){
          return pokemonUtil.translateTypes?.toJaType?.(t) || '';
        });
      }

      typesJa = Array.from(new Set(
        typesJa.map(function(t){ return (t || '').toString(); }).filter(Boolean)
      ));
      typesEn = Array.from(new Set(
        typesEn.map(function(t){ return (t || '').toString().toLowerCase(); }).filter(Boolean)
      ));

      if (typesJa.length) pd.typesJa = typesJa;
      if (typesEn.length) pd.typesEn = typesEn;
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

      // 通常フォームの GO 種族値
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

      const ov = chooseOverride(ovList, flags, pd);

      // 種族値の上書き
      if (ov && ov.stats) {
        const s = ov.stats;
        pd.goStats = pd.goStats || {};
        if (s.attack  != null) pd.goStats.attack  = s.attack;
        if (s.defence != null) pd.goStats.defense = s.defence;
        if (s.stamina != null) pd.goStats.stamina = s.stamina;
        console.log(
          '[attachGoStats] override applied:',
          dexNo,
          pd.nameJa || pd.nameEn,
          ov.key,
          pd.goStats
        );
      }

      // ★ タイプの上書き（override に typesEn / typesJa があれば使う）
      // ★ タイプの上書き（override に typesEn / typesJa があれば使う）
      if (ov) {
        // helper をそのまま使う：
        //  - En だけ／Ja だけ／両方 どれでもOK
        //  - 片方しかなければ翻訳して補完
        //  - 重複除去もしてくれる
        applyTypeOverride(pd, ov);

        if (pd.typesEn || pd.typesJa) {
          console.log(
            '[attachGoStats] type override applied:',
            dexNo,
            pd.nameJa || pd.nameEn,
            'typesEn=',
            pd.typesEn,
            'typesJa=',
            pd.typesJa
          );
        }
      }

      return pd;
    };
  })(),

  // =====================
  // suffix_map から suffix を拾う新規ヘルパー
  // =====================
  resolveSpriteSuffixFromMap : function(p) {
    const map = window.POKEMON_SPRITE_SUFFIX_MAP || {};
    if (!p || !Object.keys(map).length) return null;

    const keys = [];

    if (p.pokemonId) keys.push(String(p.pokemonId).toUpperCase());
    if (p.basePokemonId && p.tempId) {
      keys.push(`${p.basePokemonId.toUpperCase()}_${p.tempId.toUpperCase()}`);
    }
    if (p.formKey) keys.push(String(p.formKey).toUpperCase());
    if (p.formId && p.basePokemonId) keys.push(`${p.basePokemonId.toUpperCase()}_${p.formId.toUpperCase()}`);
    if (p.tempEvoId && p.basePokemonId) keys.push(`${p.basePokemonId.toUpperCase()}_${p.tempEvoId.toUpperCase()}`);

    for (const k of keys) {
      const entry = map[k];
      if (entry && entry.suffix) return String(entry.suffix);
    }
    return null;
  },

  listAvailableFormSuffix : function(no) {
    if (!no && no !== 0) return [];

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

  // JでもEでも渡ってくるのを「english lower」に統一する
  toEnTypeLower : function(str) {
    if (!str) return '';

    // いったん日本語→英語を試す
    const fromJa = pokemonUtil.translate.JtoE(str);
    if (fromJa) return String(fromJa).toLowerCase();

    // すでに英語ならそのまま小文字化
    return String(str).toLowerCase();
  },

  escapeHtml : function(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  normalizeTypesJa : function(p, meta, regionKey){
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

    // ★ meta + regionKey を受け取り、リージョン時は p を優先
    const normalizeTypes = (p, meta, regionKey) => {
      // ========= 0. リージョンフォームなら p だけで確定 =========
      if (regionKey) {
        let typesJa = [];
        let typesEn = [];

        if (Array.isArray(p?.typesJa) && p.typesJa.length) {
          typesJa = p.typesJa.slice();
        } else if (Array.isArray(p?.types) && p.types.length) {
          // p.types は日本語想定（「こおり」「はがね」など）
          typesJa = p.types.slice();
        }

        if (Array.isArray(p?.typesEn) && p.typesEn.length) {
          typesEn = p.typesEn.slice();
        } else if (typesJa.length) {
          typesEn = typesJa.map(
            t => pokemonUtil.translateTypes?.toEnType?.(t) || ''
          );
        }

        typesJa = Array.from(new Set(
          typesJa.map(t => (t || '').toString()).filter(Boolean)
        ));
        typesEn = Array.from(new Set(
          typesEn.map(t => (t || '').toString().toLowerCase()).filter(Boolean)
        ));

        return { typesJa, typesEn };
      }

      // ========= 1. ここから下は「通常フォーム用」(meta 優先) =========
      let typesJa = [];
      let typesEn = [];

      // ---- 1-1. まず GOメタの情報を優先 ----
      if (Array.isArray(meta?.typesEn) && meta.typesEn.length) {
        typesEn = meta.typesEn.slice();
      }
      if (Array.isArray(meta?.typesJa) && meta.typesJa.length) {
        typesJa = meta.typesJa.slice();
      }

      // ---- 1-2. 片側しか無い場合は相互変換 ----
      if (!typesJa.length && typesEn.length) {
        typesJa = typesEn.map(t => pokemonUtil.translateTypes?.toJaType?.(t) || '');
      }
      if (!typesEn.length && typesJa.length) {
        typesEn = typesJa.map(t => pokemonUtil.translateTypes?.toEnType?.(t) || '');
      }

      // ---- 1-3. それでも両方スカスカなら BASE から補完 ----
      if (!typesJa.length && !typesEn.length) {
        if (Array.isArray(p?.typesJa) && p.typesJa.length) {
          typesJa = p.typesJa.slice();
        } else if (Array.isArray(p?.types) && p.types.length) {
          typesJa = p.types.slice();
        }

        if (Array.isArray(p?.typesEn) && p.typesEn.length) {
          typesEn = p.typesEn.slice();
        }

        if (!typesJa.length && typesEn.length) {
          typesJa = typesEn.map(t => pokemonUtil.translateTypes?.toJaType?.(t) || '');
        }
        if (!typesEn.length && typesJa.length) {
          typesEn = typesJa.map(t => pokemonUtil.translateTypes?.toEnType?.(t) || '');
        }
      }

      // ---- 1-4. 正規化＆重複除去 ----
      typesJa = Array.from(new Set(
        typesJa.map(t => (t || '').toString()).filter(Boolean)
      ));
      typesEn = Array.from(new Set(
        typesEn.map(t => (t || '').toString().toLowerCase()).filter(Boolean)
      ));

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

    // ---- リージョン判定ヘルパー（強化版） ----
    const detectRegionKey = (src) => {
      if (!src) return null;

      // 素直にフィールドをつなぐ
      const textEn = [
        src.region,
        src.regionEn,
        src.form,
        src.formEn,
        src.formKind,
        src.formkind,
        src.formId,
        src.pokemonId,
        src.pokemon_id,
        src.templateId,
        src.template_id,
        src.nameEn
      ].filter(Boolean).join(' ').toUpperCase();

      const textJa = [
        src.region,
        src.regionJa,
        src.nameJa,
        src.name,
        src.formNameJa
      ].filter(Boolean).join('');

      if (textEn.includes('ALOLA') || textJa.includes('アローラ')) return 'ALOLA';
      if (textEn.includes('GALAR') || textJa.includes('ガラル'))   return 'GALAR';
      if (textEn.includes('HISUI') || textJa.includes('ヒスイ'))   return 'HISUI';
      if (textEn.includes('PALDEA') || textJa.includes('パルデア')) return 'PALDEA';

      // ★ それでも拾えなかったときの「最後の手段」：
      //    オブジェクト全体を文字列化して強引に検索
      try {
        const dump = JSON.stringify(src) || '';
        const dumpU = dump.toUpperCase();
        if (dumpU.includes('ALOLA') || dump.includes('アローラ')) return 'ALOLA';
        if (dumpU.includes('GALAR') || dump.includes('ガラル'))   return 'GALAR';
        if (dumpU.includes('HISUI') || dump.includes('ヒスイ'))   return 'HISUI';
        if (dumpU.includes('PALDEA') || dump.includes('パルデア')) return 'PALDEA';
      } catch (e) {
        // JSON.stringify でこけたら諦める
      }

      return null;
    };

    const getAllGoMeta = () => {
      // まずはグローバルの配列を最優先で使う
      const globalList =
        window.__POKEMON_GO_META__ ||
        window.__POKEMON_GO_META_LOCALIZED__ ||
        null;

      let list = globalList;

      // 念のため pokemonUtil.data 側もフォローするが、
      // 配列じゃなければ無視する
      if (!Array.isArray(list) && pokemonUtil.data && typeof pokemonUtil.data.get === 'function') {
        const fromData =
          pokemonUtil.data.get('POKEMON_GO_META') ||
          pokemonUtil.data.get('POKEMON_GO_META_LOCALIZED') ||
          null;
        if (Array.isArray(fromData)) {
          list = fromData;
        }
      }

      const arr = Array.isArray(list) ? list : [];

      console.log('[getPokemonData vRegion1] getAllGoMeta len=', arr.length);

      return arr;
    };

    // ★ どの版が動いているか確認用
    console.log('[getPokemonData vRegion1] called, len=', arr.length);

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

      // 1) ベースデータ側からリージョン判定
      const regionKeyFromBase = detectRegionKey(p); // ALOLA / GALAR / ... / null

      console.log(
        '[getPokemonData vRegion1] region detect',
        p.nameJa || p.name || '(no name)',
        '→',
        regionKeyFromBase
      );

      // 2) まずは従来どおり meta を拾う（通常フォームでもOK）
      let meta = pokemonUtil._resolveGoMeta
        ? (pokemonUtil._resolveGoMeta(p) || {})
        : {};

      // 3) リージョンなら、GOメタからリージョン用 meta を探して差し替え
      (function fixRegionMeta() {
        if (!regionKeyFromBase) return;

        const allMeta = getAllGoMeta();
        if (!Array.isArray(allMeta) || !allMeta.length) return;

        const rk = regionKeyFromBase.toUpperCase();

        // ベース側の「図鑑番号」（id / no / dex などをまとめて解決）
        const dexFromP = normalizeId(p);

        // ベース側の「種族キー」を作る（リージョン名は削る）
        const makeSpeciesKey = function (src) {
          if (!src) return '';
          const cand = [
            src.pokemonId,
            src.pokemon_id,
            src.speciesId,
            src.species,
            src.nameEn,
            src.name
          ].find(Boolean);
          if (!cand) return '';

          const normFn = pokemonUtil.normalizeKey
            ? pokemonUtil.normalizeKey
            : function (s) { return String(s).toLowerCase(); };

          // ALOLA/GALAR/HISUI/PALDEA などの末尾を削る
          return normFn(cand).replace(/_(alola|galar|hisui|paldea)$/i, '');
        };

        const baseSpeciesKey = makeSpeciesKey(p);

        console.log(
          '[getPokemonData vRegion1] getAllGoMeta len=',
          allMeta.length
        );
        console.log(
          '[getPokemonData vRegion1] region detect',
          p.nameJa || p.name || '(no name)',
          '→',
          regionKeyFromBase,
          'dexFromP=',
          dexFromP,
          'baseSpeciesKey=',
          baseSpeciesKey
        );

        const candidate = allMeta.find(function (m) {
          const mdex =
            m.no ??
            m.dex ??
            m.pokedex ??
            m.pokedex_id ??
            m.num ??
            m.id ??
            null;

          // ① 図鑑番号が両方ある場合は必ず一致させる
          if (dexFromP != null && mdex != null &&
              Number(mdex) !== Number(dexFromP)) {
            return false;
          }

          // ② 種族キーが取れる場合は、種族も一致させる
          if (baseSpeciesKey) {
            const cand2 = [
              m.pokemonId,
              m.pokemon_id,
              m.speciesId,
              m.species,
              m.nameEn,
              m.name
            ].find(Boolean);

            if (cand2) {
              const normFn = pokemonUtil.normalizeKey
                ? pokemonUtil.normalizeKey
                : function (s) { return String(s).toLowerCase(); };

              const mKey = normFn(cand2).replace(/_(alola|galar|hisui|paldea)$/i, '');
              if (mKey !== baseSpeciesKey) {
                // 種族違い（ラッタなど）はここで弾く
                return false;
              }
            }
          }

          const form = String(m.form || m.pokemonForm || '').toUpperCase();
          const tid  = String(m.templateId || m.template_id || '').toUpperCase();

          // ③ この meta 自体がリージョンフォームであること
          if (form.includes(rk)) return true;
          if (tid.includes('_' + rk) || tid.endsWith(rk)) return true;

          return false;
        });

        if (candidate) {
          console.log(
            '[getPokemonData vRegion1] region meta applied',
            p.nameJa || p.name || '(no name)',
            regionKeyFromBase,
            '→',
            candidate.templateId || candidate.pokemonId || '(no id)'
          );
          meta = candidate; // ★ ここでリージョン用 meta に差し替え
        } else {
          console.log(
            '[getPokemonData vRegion1] regionKey but no region meta found for',
            p.nameJa || p.name || '(no name)',
            regionKeyFromBase,
            'dexFromP=',
            dexFromP,
            'baseSpeciesKey=',
            baseSpeciesKey
          );
        }
      })();

      // 4) タイプ決定（ここはさっき直した normalizeTypes をそのまま使用）
      const id = normalizeId(p);
      const { typesJa, typesEn } = normalizeTypes(p, meta, regionKeyFromBase);

      // 5) 以降は今までどおり meta.moves から技を組み立てる
      const mMoves = meta.moves || {};

      const fastIds = []
        .concat(Array.isArray(meta.fastMoves)      ? meta.fastMoves      : [])
        .concat(Array.isArray(meta.quickMoves)     ? meta.quickMoves     : [])
        .concat(Array.isArray(mMoves.fast)         ? mMoves.fast         : [])
        .concat(Array.isArray(mMoves.quick)        ? mMoves.quick        : [])
        .concat(Array.isArray(mMoves.eliteQuick)   ? mMoves.eliteQuick   : [])
        .concat(Array.isArray(meta.eliteQuickMoves)? meta.eliteQuickMoves: []);

      const chargedIds = []
        .concat(Array.isArray(meta.chargedMoves)        ? meta.chargedMoves        : [])
        .concat(Array.isArray(meta.cinematicMoves)      ? meta.cinematicMoves      : [])
        .concat(Array.isArray(mMoves.charged)           ? mMoves.charged           : [])
        .concat(Array.isArray(mMoves.cinematic)         ? mMoves.cinematic         : [])
        .concat(Array.isArray(mMoves.eliteCinematic)    ? mMoves.eliteCinematic    : [])
        .concat(Array.isArray(meta.eliteCinematicMoves) ? meta.eliteCinematicMoves : []);

      const baseStats = {
        hp:        p.stats?.hp ?? null,
        attack:    p.stats?.attack ?? null,
        defence:   p.stats?.defence ?? null,
        spAttack:  p.stats?.spAttack ?? null,
        spDefence: p.stats?.spDefence ?? null,
        speed:     p.stats?.speed ?? null
      };
      const baseTotal = Object.values(baseStats).reduce((a, b) => a + (b || 0), 0);

      const s = meta && meta.stats ? meta.stats : {};
      const goStats = {
        attack : s.attack  ?? meta.attack      ?? meta.baseAttack  ?? meta.atk ?? null,
        defense: s.defence ?? s.defense        ?? meta.defense     ?? meta.baseDefense ?? meta.def ?? null,
        stamina: s.stamina ?? meta.stamina     ?? meta.baseStamina ?? meta.hp  ?? null
      };

      const result = {
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

        form: meta.form || p.form || '',
        pokemonId: meta.pokemonId || p.pokemonId || '',
        templateId: meta.templateId || meta.template_id || '',

        _raw: p
      };

      // ★ 最後に1件ずつ確認ログ
      console.log(
        '[getPokemonData vRegion1] result',
        result.nameJa,
        'typesEn=', result.typesEn,
        'typesJa=', result.typesJa
      );

      return result;
    });
  },

  getMetaForPokemon : function(p) {
    const metaList = Array.isArray(window.__POKEMON_GO_META__) ? window.__POKEMON_GO_META__ : [];
    if (!metaList.length || !p) return null;

    const normalizeKey = pokemonUtil.normalizeKey || (v => String(v || '').toLowerCase());

    // ★ ちゃんとこの版が動いているか確認用
    console.log(
      '[getMetaForPokemon vRegion1] called for',
      p.nameJa || p.name || p.pokemonId || p.pokemon_id || '(no name)'
    );

    // ★ リージョン判定ヘルパー（name も見る）
    const detectRegionKey = function(src) {
      if (!src) return null;

      const textEn = [
        src.region,
        src.form,
        src.formKind,
        src.formkind,
        src.formId,
        src.pokemonId,
        src.pokemon_id,
        src.templateId,
        src.template_id,
        src.nameEn
      ].filter(Boolean).join(' ').toUpperCase();

      const textJa = [
        src.nameJa,
        src.name,        // ここがポイント：「ロコン（アローラ）」など
        src.formNameJa
      ].filter(Boolean).join('');

      if (textEn.includes('ALOLA') || textJa.includes('アローラ')) return 'ALOLA';
      if (textEn.includes('GALAR') || textJa.includes('ガラル'))   return 'GALAR';
      if (textEn.includes('HISUI') || textJa.includes('ヒスイ'))   return 'HISUI';
      if (textEn.includes('PALDEA') || textJa.includes('パルデア')) return 'PALDEA';

      return null;
    };

    const dex  = p.dex || p.pokedex_id || p.pokedexId || p.id || p.no;
    const name = p.name || p.nameEn || p.pokemon_id || p.pokemonId || p.species || p.speciesId;

    const regionKey = detectRegionKey(p);

    // ------------------------------------------------
    // 1) まずリージョンフォームを最優先で探す
    // ------------------------------------------------
    if (regionKey) {
      const rk = regionKey.toUpperCase();

      const baseIdRaw =
        p.pokemonId || p.pokemon_id || p.species || p.speciesId || name || '';
      const baseId = String(baseIdRaw).toUpperCase()
        .replace(/_ALOLA|_GALAR|_HISUI|_PALDEA/g, '');

      const candidate = metaList.find(m => {
        const mdex =
          m.dex ?? m.pokedex ?? m.pokedex_id ?? m.num;

        if (dex != null && mdex != null && mdex !== dex) {
          return false;
        }

        const pid = String(m.pokemonId || m.pokemon_id || m.species || m.speciesId || '').toUpperCase();
        const tid = String(m.templateId || m.template_id || '').toUpperCase();

        // リージョン名を含んでいるか
        const hasRegion = pid.includes(rk) || tid.includes(rk);
        if (!hasRegion) return false;

        if (!baseId) return true;

        // 同じベースIDのリージョンフォームかどうか
        return pid.includes(baseId) || tid.includes(baseId);
      });

      if (candidate) {
        console.log(
          '[getMetaForPokemon vRegion1] region match',
          regionKey,
          '→',
          candidate.pokemonId || candidate.templateId || '(no id)'
        );
        return candidate;
      }

      console.log('[getMetaForPokemon vRegion1] regionKey detected but no candidate', regionKey);
    }

    // ------------------------------------------------
    // 2) ここから下は元のロジックと同じ（通常フォーム用）
    // ------------------------------------------------
    if (dex != null) {
      const byDex = metaList.find(m =>
        m.dex === dex || m.pokedex === dex || m.pokedex_id === dex || m.num === dex
      );
      if (byDex) {
        console.log('[getMetaForPokemon vRegion1] dex match', dex,
          '→', byDex.pokemonId || byDex.templateId || '(no id)');
        return byDex;
      }
    }

    if (name) {
      const ln = normalizeKey(name);
      const byName = metaList.find(m => {
        const keys = [m.name, m.pokemon_id, m.pokemonId, m.species, m.speciesId].filter(Boolean);
        return keys.some(k => normalizeKey(k) === ln);
      });
      if (byName) {
        console.log('[getMetaForPokemon vRegion1] name match', name,
          '→', byName.pokemonId || byName.templateId || '(no id)');
        return byName;
      }
    }

    console.log('[getMetaForPokemon vRegion1] no meta found for', name || dex);
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

  // フォルム/テンプレートID/ポケモンID → 「ガラル」「アローラ」「X」「Y」などのラベル
  getFormRegionLabel : function(form, templateId, pokemonId) {
    form       = (form       || '').toString().toUpperCase();
    templateId = (templateId || '').toString().toUpperCase();
    pokemonId  = (pokemonId  || '').toString().toUpperCase();

    // ==== 1. メガリザードンX / Y を最優先で判定 ====
    if (pokemonId === 'CHARIZARD') {
      // どちらかに "MEGA_X" / "MEGA_Y" が含まれていればOKにしておく
      if (form.indexOf('MEGA_X') >= 0 || templateId.indexOf('MEGA_X') >= 0) return 'X';
      if (form.indexOf('MEGA_Y') >= 0 || templateId.indexOf('MEGA_Y') >= 0) return 'Y';
    }

    // ==== 2. 汎用メガは表示いじらない（「メガデンリュウ」のまま） ====
    if (form.indexOf('MEGA') >= 0 || templateId.indexOf('MEGA') >= 0) {
      return '';  // 「（メガ）」などは付けない
    }

    // ==== 3. リージョン判定 ====
    const REGION_LABELS = {
      ALOLA   : 'アローラ',
      ALOLAN  : 'アローラ',
      GALAR   : 'ガラル',
      GALARIAN: 'ガラル',
      HISUI   : 'ヒスイ',
      HISAUI  : 'ヒスイ',
      PALDEA  : 'パルデア'
    };

    for (var key in REGION_LABELS) {
      if (!Object.prototype.hasOwnProperty.call(REGION_LABELS, key)) continue;
      if (form.indexOf(key) >= 0 || templateId.indexOf(key) >= 0) {
        return REGION_LABELS[key];
      }
    }

    return '';  // ラベルなし
  },

  // ==== 画面に表示する正式名を生成 ====
  buildRecommendDisplayName : function(d) {
    if (!d) return '';

    // ベースの名前（ここに既に「（アローラ）」などが入っていることがある）
    const baseName = d.nameJa || d.name || '';

    const labels = [];

    // ---- リージョンラベル（アローラ／ガラル／ヒスイ／パルデア） ----
    // d.region が「アローラ」みたいな日本語で入っている前提
    const regionJa = d.region || '';

    if (regionJa) {
      // すでに「アローラ」が付いている場合は追加しない
      if (!baseName.includes(regionJa)) {
        labels.push('（' + regionJa + '）');
      }
    }

    // ---- メガ進化などのラベル（必要なら） ----
    const kind = d.formKind || '';
    if (kind === 'mega') {
      // 「メガ」が元名に入っていなければ付ける
      if (!baseName.includes('メガ')) {
        // メガは先頭に付けたいなら unshift、後ろに付けたいなら push
        labels.unshift('メガ');
      }
    }

    // ★ ここに他のフォームラベルを足したいときは、labels.push(...) で追加

    if (!labels.length) {
      // 何も付けるものがなければ元の名前のまま
      return baseName;
    }

    const suffix = labels.join('');

    // 念のため「完全一致で既に含まれている」場合も二重追加しない
    if (baseName.includes(suffix)) {
      return baseName;
    }

    // 基本は「元の名前＋ラベル」で返す
    return baseName + suffix;
  },

  // 「ゲージ本数」を計算（スペシャル技用）
  getBarsForGlobal : function(m) {
    let bars = m && m.gaugeBars;
    if (!bars) {
      const e = Math.abs(Number(m && m.energy) || 0);
      if (e > 0) {
        if (e <= 35)      bars = 3;
        else if (e <=55)  bars = 2;
        else              bars = 1;
      } else {
        bars = 1;
      }
    }
    bars = Math.max(1, Math.min(3, bars));
    return bars;
  },

  // 任意のスペシャル技に 1〜5 のレーティングを付ける
  getGlobalSpecialRating : function(move, fallbackScore) {
    if (isGlobalSpecialFlat) {
      return 3; // 全部同じくらい → 真ん中
    }
    const s = globalSpecialScoreMap.get(move) || fallbackScore || 0;
    if (!s || !isFinite(s)) return 3;

    const norm = (s - globalSpecialMin) / (globalSpecialMax - globalSpecialMin); // 0〜1
    const r = Math.round(1 + norm * 4); // 1〜5
    return Math.max(1, Math.min(5, r));
  },

// id → 技オブジェクト を引く小さなヘルパー
  findMoveById : function(moveId) {
    if (!moveId) return null;
    const id = String(moveId).toUpperCase();

    // moves_master*_localized.json から検索
    const hit = MOVES_MASTER.find(function(m) {
      return String(m.id).toUpperCase() === id;
    });
    if (hit) return hit;

    // もし move_name_dict 経由で補完したければここで
    // （今はそのまま返さないで null にしておく）
    return null;
  },

  // pokemon_list の1件＋GOメタをマージして moves を付ける
  enrichPokemonWithMovesFromMeta : function(basePoke) {
    if (!basePoke) return basePoke;

    const pokemonId = basePoke.pokemonId;
    const form      = basePoke.form || '';

    // 1) GOメタの該当エントリを探す
    let meta = GO_META_LIST.find(function(m) {
      return m.pokemonId === pokemonId && (m.form || '') === form;
    });
    if (!meta) {
      // フォーム一致がない場合は pokemonId だけで探す（通常形）
      meta = GO_META_LIST.find(function(m) {
        return m.pokemonId === pokemonId;
      });
    }

    if (!meta) {
      // メタが見つからなければそのまま返す（moves は無し）
      return basePoke;
    }

    const quickIds     = (meta.moves && meta.moves.quick)     || [];
    const cinematicIds = (meta.moves && meta.moves.cinematic) || [];

    const normalMoves = quickIds
      .map(pokemonUtil.findMoveById)
      .filter(Boolean); // null を除外

    const specialMoves = cinematicIds
      .map(pokemonUtil.findMoveById)
      .filter(Boolean);

    // 2) moves を生やした新しいオブジェクトを返す
    const moves = {
      normal : normalMoves,
      special: specialMoves
    };

    // basePoke に moves を足したものを返す
    return Object.assign({}, basePoke, { moves: moves });
  }

};
