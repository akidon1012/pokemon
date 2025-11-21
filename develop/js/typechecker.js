const tabs = {
  tab : '.js_pokemon-select-tab',
  content : '.js_pokemon-select-tab-content',
  isActiveClassName : 'is_active',
  ini : function() {
    const tab = $(tabs.tab);
    tab.each(function() {
      const _this = $(this);
      const num = _this.index();
      $(this).on('click', function() {
        tabs.click(_this, num);
      });
    });
  },
  click : function(obj, num) {
    const tab = $(tabs.tab);
    const content = $(tabs.content);
    tab.removeClass(tabs.isActiveClassName);
    content.removeClass(tabs.isActiveClassName);
    obj.addClass(tabs.isActiveClassName);
    content.eq(num).addClass(tabs.isActiveClassName);
    if ( num == 0 ) {
      const checkType = $(typeChecker.getType.checkbox);
      if ($(typeChecker.getType.checkbox + ':checked').length > 0) {
        $('.js_pokemon-search').addClass(tabs.isActiveClassName);
      } else {
        $('.js_pokemon-search').removeClass(tabs.isActiveClassName);
      }
    }
  }
}
const toggle = {
  wrapper : '.js_toggle-wrapper',
  trigger : '.js_toggle-trigger',
  content : '.js_toggle-content',
  isOpenedClassName : 'is_toggle-opened',

  ini : function() {
    // 既存のクリックイベントを一旦解除
    $(document).off('click.toggle');

    // document にイベント委譲する（どんな動的HTMLでも反応する）
    $(document).on('click.toggle', toggle.trigger, function(e){
      e.preventDefault();

      const $btn = $(this);
      const $wrapper = $btn.closest(toggle.wrapper);
      const $content = $wrapper.find(toggle.content);

      if ($content.length === 0) return;

      toggle.toggle($btn, $content);
    });
  },

  toggle : function($btn, $target) {
    if ($btn.hasClass(toggle.isOpenedClassName)) {
      // close
      $btn.removeClass(toggle.isOpenedClassName);
      $target.slideUp().removeClass(toggle.isOpenedClassName);
    } else {
      // open
      $btn.addClass(toggle.isOpenedClassName);
      $target.slideDown().addClass(toggle.isOpenedClassName);
    }
  }
};

const typeChecker = {
  MULT : { dbl: 1.6, half: 0.625, zero: 0.39 }, // 単タイプ時の係数
  EPS : 0.01,
  listScope : {
    // 参照は関数内で（初期化時に typeChecker を触らない）
    rootCandidates() {
      const extra = (typeChecker && typeChecker.searchPokemon && typeChecker.searchPokemon.wrapper) || null;
      return [
        extra,
        '.js_pokemon-search',
        '.js_pokemon-result',
        '.js_tab-panel:visible',
        'main'
      ].filter(Boolean);
    },
    itemCandidates() {
      const extra = (typeChecker && typeChecker.searchPokemon && typeChecker.searchPokemon.pokemonListItem) || null;
      return [
        extra,
        '.js_pokemon-list-item',
        '.js_pokemon-item',
        'li[data-no]',
        '[data-no]'
      ].filter(Boolean);
    },
    pickRoot() {
      let best = { $el: $(), count: -1, sel: '' };
      const roots = this.rootCandidates();
      const items = this.itemCandidates();
      for (const sel of roots) {
        const $r = $(sel);
        if (!$r.length) continue;
        let cnt = 0;
        for (const isel of items) cnt = Math.max(cnt, $r.find(isel).length);
        if (cnt > best.count) best = { $el: $r.first(), count: cnt, sel };
      }
      return best.$el;
    },
    pickItems($root) {
      if (!$root || !$root.length) return $();
      for (const sel of this.itemCandidates()) {
        const found = $root.find(sel);
        if (found.length) return found;
      }
      return $();
    }
  },

  bucket : function(mult) {
    if (Math.abs(mult - (typeChecker.MULT.dbl * typeChecker.MULT.dbl)) < typeChecker.EPS) return 'x2win';     // 2.56
    if (Math.abs(mult - typeChecker.MULT.dbl) < typeChecker.EPS)               return 'x1win';     // 1.6
    if (Math.abs(mult - 1.0) < typeChecker.EPS)                    return 'even';      // 1.0
    if (Math.abs(mult - typeChecker.MULT.half) < typeChecker.EPS)              return 'x1lose';    // 0.625
    if (Math.abs(mult - typeChecker.MULT.zero) < typeChecker.EPS)              return 'x2lose';    // 0.39
    // 端数（複合タイプの 1.6×0.625=1.0 以外 etc.）は近い方へ寄せる
    if (mult > 1.3)  return 'x1win';
    if (mult < 0.5)  return 'x2lose';
    if (mult < 0.9)  return 'x1lose';
    return 'even';
  },
  getType : {
    checkbox : '[name="pokemon-type"]',
    effect : '.js_effect',
    effect5 : '.js_effect5',
    effect4 : '.js_effect4',
    effect3 : '.js_effect3',
    effect2 : '.js_effect2',
    effect1 : '.js_effect1',
    resultData : '.js_result-data',
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
    errMsg : '.js_error-msg',
    ini : function(typeData) {
      console.log('[getType.ini] called', arguments);
      // ★ 相性テーブルをここで必ず決定して保持する
      const TABLE = Array.isArray(typeData)
        ? typeData
        : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

      typeChecker.getType._chart = TABLE;   // ← これが undefined にならないようにする
      typeChecker.getType._mode  = 'go';    // 一応モードも保持（今まで通り）

      const checkType = $(typeChecker.getType.checkbox);

      // ここから下は「元々動いてた頃」のままに戻す
      $(document).off('change.pokemonType');
      $(document).on(
        'change.pokemonType',
        typeChecker.getType.checkbox,
        function(e) {
          const _this = $(this);
          console.log('[pokemon-type change]', _this.val(), _this.prop('checked')); // デバッグ

          // ★ check 側では引数をそのまま渡しておく（中で TABLE を再決定してるならそのまま）
          typeChecker.getType.check(typeData, _this);

          console.log('defenderTypesJa:', typeChecker.searchPokemon.getSelectedTypesJa());
        }
      );
    },
    check : function(typeData, btn) {
      const effectWrap = $(typeChecker.getType.effect);
      const effect5    = $(typeChecker.getType.effect5);   // こうかばつぐん×2（2.56）
      const effect4    = $(typeChecker.getType.effect4);   // こうかばつぐん（1.6）
      const effect3    = $(typeChecker.getType.effect3);   // こうかふつう（1.0）
      const effect2    = $(typeChecker.getType.effect2);   // こうかいまひとつ（0.625）
      const effect1    = $(typeChecker.getType.effect1);   // こうかいまひとつ×2（0.39）

      const TABLE = Array.isArray(typeData)
        ? typeData
        : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

      // 現在選択中の“受ける側タイプ”（0〜2）※ value は英名 'fire' など
      const checked = $(typeChecker.getType.checkbox)
        .filter(':checked')
        .map(function(){ return $(this).val(); })
        .get();

      // 0個 → 全クリア（相性表示・リスト・おすすめ）
      if (checked.length === 0) {
        typeChecker.getType.clear(); // ★ ここでおすすめリストも空にしている想定
        return;
      }

      // 3個以上はガード
      if (checked.length > 2) {
        typeChecker.getType.error();
        btn.prop('checked', false);
        return;
      }

      // --- 相性表の描画 --------------------
      effectWrap.empty();
      effect1.empty(); effect2.empty(); effect3.empty(); effect4.empty(); effect5.empty();

      const attackTypes = typeChecker.getType.typeName.slice();   // ['normal','fire',...]
      const multMap = {};
      attackTypes.forEach(function(t){ multMap[t] = 1.0; });

      checked.forEach(function(defTypeEn){
        const defJa = pokemonUtil.translate.EtoJ(defTypeEn);
        const row =
          TABLE.find(function(r){ return r.type === defTypeEn; }) ||
          TABLE.find(function(r){ return r.typeJa === defJa; });

        if (!row || !Array.isArray(row.effect)) return;

        row.effect.forEach(function(e){
          const atkEn = e.type;  // 攻撃タイプ EN
          if (!attackTypes.includes(atkEn)) return;

          let m = 1.0;
          if (pokemonUtil && typeof pokemonUtil.normalizeMultiplier === 'function') {
            m = pokemonUtil.normalizeMultiplier(e);
          } else if (e.mult != null) {
            const tmp = Number(String(e.mult).replace(/[^\d.]/g, ''));
            m = (Number.isFinite(tmp) && tmp > 0) ? tmp : 1.0;
          }

          let cur = multMap[atkEn];
          if (!Number.isFinite(cur)) cur = 1.0;
          multMap[atkEn] = cur * m;
        });
      });

      attackTypes.forEach(function(t){
        let raw = multMap[t];
        if (!Number.isFinite(raw) || raw <= 0) raw = 1.0;
        const mult = Number(raw.toFixed(2));
        const ja   = pokemonUtil.translate.EtoJ(t);

        const html =
          `
          <li><a href="javascript:void(0);" data-type="${t}">
            <span class="icon icon-type-${t}"></span>${ja} <span class="multiplier">×${mult}</span>
          </a></li>
          `;

        switch (typeChecker.bucket(mult)) {
          case 'x2win':  effect5.append(html); break; // 2.56
          case 'x1win':  effect4.append(html); break; // 1.6
          case 'x1lose': effect2.append(html); break; // 0.625
          case 'x2lose': effect1.append(html); break; // 0.39
          default:       effect3.append(html); break; // 1.0
        }
      });

      // --- ポケモン一覧のフィルタ（今まで通り） --------------------
      typeChecker.searchPokemon.clear(window.__pokemonListData || []);
      const searchWrapper = $(typeChecker.searchPokemon.wrapper);
      const pokemonList   = searchWrapper.find(typeChecker.searchPokemon.pokemonList);
      if ($('.js_list-html').length) {
        pokemonList.html($('.js_list-html').html());
      }
      const selectedJa = (typeof typeChecker.searchPokemon.getSelectedTypesJa === 'function')
        ? typeChecker.searchPokemon.getSelectedTypesJa()
        : [];

      // リストの絞り込みだけ rAF で（ここは元の挙動をキープ）
      requestAnimationFrame(() => {
        typeChecker.getType._filterListByTypesJa(selectedJa);
      });

      // --- ★ 対策おすすめリストの更新（ここだけでやる） --------------------
      try {
        // 受ける側タイプ（英）→ 日本語
        const defenderTypesJa = checked
          .map(function(en){ return pokemonUtil.translate.EtoJ(en); })
          .filter(Boolean);

        console.log('[recommend] defenderTypesJa =', defenderTypesJa);

        const $wrapRecommend = $('.js_pokemon-recommend-list');

        if (!defenderTypesJa.length) {
          // 0個ならおすすめはクリア
          $wrapRecommend.empty();
          console.log('[recommend] no defender types, clear list');
          return;
        }

        const POK_NOW =
          (pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__ || [];

        const DEF_NOW = Array.isArray(TABLE)
          ? TABLE
          : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

        const recList = typeChecker.recommend.recommendCounters({
          defenderTypesJa: defenderTypesJa,
          pokemonDataset : POK_NOW,
          defenseChart   : DEF_NOW,
          limit          : 20
        }) || [];

        console.log('[recommend] recList length =', recList.length);
        if (recList.length) {
          console.log('[recommend] first =', recList[0]);
        }

        typeChecker.recommend.renderRecommendations($wrapRecommend, recList);
      } catch (err) {
        // console.error('[getType.check] recommend error:', err);
      }
    },

    clear : function() {
      const effect = $(typeChecker.getType.effect);
      const resultData = $(typeChecker.getType.resultData).find('input[type="hidden"]');
      resultData.each(function() { $(this).val('1'); });
      effect.empty();
    },
    error : function() {
      const msg = $(typeChecker.getType.errMsg);
      msg.fadeIn(300);
      setTimeout(function() {
        msg.fadeOut(1000);
      }, 1000);
    },
    _filterListByTypesJa: function(selectedJa) {
      const hasFilter = Array.isArray(selectedJa) && selectedJa.length > 0;
      const set = new Set(selectedJa || []);

      const $root  = typeChecker.listScope.pickRoot();
      const $items = typeChecker.listScope.pickItems($root);
      if (!$items.length) {
        console.warn('[getType] list items not found in scope');
        return;
      }

      let showCnt = 0, totalCnt = 0, missCnt = 0;
      $items.each(function() {
        totalCnt++;
        const $el = $(this);
        const typesJa = typeChecker.getType._resolveTypesForElement($el);
        if (!typesJa.length) {
          missCnt++;
          if (missCnt <= 5) {
            console.debug('[miss] no types', {
              no: $el.attr('data-no'),
              nameEn: $el.attr('data-name-en') || $el.data('nameEn'),
              nameJa: $el.attr('data-name-ja') || $el.data('nameJa'),
              species: $el.attr('data-species-id') || $el.data('speciesId')
            });
          }
        }
        const show = !hasFilter || typesJa.some(t => set.has(t));
        if (show) showCnt++;
        $el.toggle(show);
      });

      console.log(`[getType] filtered (scoped): ${showCnt}/${totalCnt} (miss types: ${missCnt})`);

    },
    _resolveTypesForElement: function($el) {
      const pre = ($el.attr('data-types-ja') || '').split(',').filter(Boolean);
      if (pre.length) return pre;

      const { byNo, byEn, byJa, bySp } = (typeChecker.getType._index || {});
      const rawNo = $el.attr('data-no');
      const no = rawNo && /^\d+$/.test(rawNo) ? Number(rawNo) : null;
      if (no != null && byNo?.has(no)) return pokemonUtil.normalizeTypesJa(byNo.get(no)) || [];

      const en = ($el.attr('data-name-en') || $el.data('nameEn') || '').toLowerCase();
      if (en && byEn?.has(en)) return pokemonUtil.normalizeTypesJa(byEn.get(en)) || [];

      const ja = $el.attr('data-name-ja') || $el.data('nameJa') || '';
      if (ja && byJa?.has(ja)) return pokemonUtil.normalizeTypesJa(byJa.get(ja)) || [];

      const sp = ($el.attr('data-species-id') || $el.data('speciesId') || '').toLowerCase();
      if (sp && bySp?.has(sp)) return pokemonUtil.normalizeTypesJa(bySp.get(sp)) || [];

      return [];

    },
    _buildIndex : function() {
      const ds = (pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__ || [];
      const byNo = new Map(), byEn = new Map(), byJa = new Map(), bySp = new Map();
      ds.forEach(p => {
        const no = p.no ?? p.dex ?? p.pokedex_id;
        if (no != null) byNo.set(Number(no), p);
        const en = (p.nameEn || p.name || '').toLowerCase();
        if (en) byEn.set(en, p);
        const ja = p.nameJa || p.name_jp || p.name_ja || '';
        if (ja) byJa.set(ja, p);
        const sp = (p.speciesId || p.pokemonId || p.pokemon_id || '').toLowerCase();
        if (sp) bySp.set(sp, p);
      });
      typeChecker.getType._index = { byNo, byEn, byJa, bySp };
      console.log('[index] built: no=%d en=%d ja=%d sp=%d', byNo.size, byEn.size, byJa.size, bySp.size);
    },
  },
  searchPokemon : {
    wrapper : '.js_pokemon-search',
    pokemonList : '.js_pokemon-search-list',
    typeList : '.js_pokemon-type-list',
    textbox : '.js_pokemon-search-input',
    checkbox : '[name="pokemon-type"]',
    recommendList : ('.js_pokemon-recommend-list'),
    isActiveClassName : 'is_active',
    resetBtn : '.js_reset',
    clearBtn : '.js_search-clear',
    selectedArea : '.js_pokemon-search-result',      // 追加：選択結果の描画先
    cacheData : [],                                  // 追加：iniで受け取ったデータを保持（リセット再構築用）
    typeName : [
      'normal','fire','water','grass','electric','ice','fighting','poison','ground',
      'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
    ],
    typeNameJa : [
      'ノーマル','ほのお','みず','くさ','でんき','こおり','かくとう','どく','じめん',
      'ひこう','エスパー','むし','いわ','ゴースト','ドラゴン','あく','はがね','フェアリー'
    ],

    // ========== 共通カードの描画/クリア ==========
    renderSelected : function(poke){
      // const 定義/グローバルのどちらでも拾えるように解決
      var card = (typeof pokemonCard !== 'undefined' && pokemonCard) || window.pokemonCard || null;
      if (!card) return;

      if (typeof card.render === 'function') {
        card.render(poke, this.selectedArea || '.js_pokemon-search-result');
      } else if (typeof card.build === 'function') {
        $(this.selectedArea || '.js_pokemon-search-result').empty().append(card.build(poke));
      }
      var $img = $(this.selectedArea || '.js_pokemon-search-result').find('img').first();
      if ($img.length) {
        $img.off('error.spFallback').on('error.spFallback', function(){
          // PokeAPI 通常スプライトにフォールバック
          this.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + (poke?.id || '') + '.png';
        });
      }
    },

    resolveImage : function(noOrId, pokeObj){
      if (pokeObj && pokeObj.image) return pokeObj.image;
      var id = typeChecker.searchPokemon.normalizeId(noOrId);
      if (id) {
        // 公式アートワーク直URL（常に確定で作る）
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
      }
      return 'https://placehold.jp/300x300.png';
    },

    clearSelected : function(){
      $(this.selectedArea).empty();
      $(typeChecker.searchPokemon.recommendList).empty();
    },

    // ========== リスト項目 → pokeオブジェクトの正規化 ==========
    normalizeFromAnchor : function($a){
      const nameJa   = $a.text();
      const typesStr = $a.data('types-ja') ?? $a.attr('data-types-ja'); // 'みず,くさ'
      const typesJa  = String(typesStr || '').split(',').filter(Boolean);

      // data-no は .data() → .attr() の順で安全取得
      const rawNo    = ($a.data('no') != null) ? $a.data('no') : $a.attr('data-no');
      const id       = typeChecker.searchPokemon.normalizeId(rawNo);
      return {
        id    : id,
        name  : nameJa,
        types : typesJa,
        image : typeChecker.searchPokemon.resolveImage(id, null)
      };
    },

    normalizeId : function(no){
      if (no == null) return null;
      var m = String(no).match(/\d+/);
      if (!m) return null;
      var id = parseInt(m[0], 10);
      return Number.isFinite(id) && id > 0 ? id : null;
    },


    // ========== イベントハンドラ（関数参照でバインド） ==========
    handlePick: function(e) {
      e.preventDefault();
      const $a = $(this);

      const nameJa   = $a.text();
      const typesStr = $a.data('types-ja') ?? $a.attr('data-types-ja');
      const typesJa  = String(typesStr || '').split(',').filter(Boolean);
      const no       = $a.data('no');
      const image    = pokemonUtil.getImageUrlByNo(no);

      // カード描画
      const resultArea = $('.js_pokemon-search-result');
      pokemonCard.render({
        name:  nameJa,
        types: typesJa,
        image: image
      }, resultArea);

      // ★ここを追加：タイプ選択チェックボックス反映
      if (typesJa.length) {
        typeChecker.searchPokemon.select(typesJa);
      } else {
        typeChecker.getType.clear();
        $(typeChecker.getType.checkbox).each(function(){ $(this).prop('checked', false); });
      }

      // テキストボックス更新
      const textbox = $(typeChecker.searchPokemon.wrapper).find(typeChecker.searchPokemon.textbox);
      textbox.val(nameJa);
      textbox.trigger('keyup'); // 再フィルタ
      $(typeChecker.searchPokemon.wrapper).removeClass(typeChecker.searchPokemon.isActiveClassName);
      textbox.blur();
    },

    handleReset : function(){
      const wrapper     = $(typeChecker.searchPokemon.wrapper);
      const pokemonList = wrapper.find(typeChecker.searchPokemon.pokemonList);
      const checkbox    = $(typeChecker.getType.checkbox);
      const recommendList = $(typeChecker.getType.checkbox);
      const clearBtn    = $(typeChecker.searchPokemon.clearBtn);
      const data        = typeChecker.searchPokemon.cacheData;

      pokemonList.empty();
      typeChecker.searchPokemon.clear(data);          // リスト再構築
      if (typeChecker.getType?.clear) typeChecker.getType.clear();
      checkbox.each(function(){ $(this).prop('checked', false); });
      wrapper.find(typeChecker.searchPokemon.textbox).val('').trigger('focus');
      typeChecker.getType._filterListByTypesJa([]);
      clearBtn.hide();

      // ★ 追加：選択カードをクリア
      typeChecker.searchPokemon.clearSelected();
    },

    // ========== 既存：初期化 ==========
    ini : function(data) {
      // データ保持（リセットで再構築に使用）
      this.cacheData = Array.isArray(data) ? data : [];

      typeChecker.searchPokemon.clear(data);

      const wrapper     = $(typeChecker.searchPokemon.wrapper);
      const textbox     = wrapper.find(typeChecker.searchPokemon.textbox);
      const pokemonList = wrapper.find(typeChecker.searchPokemon.pokemonList);
      const checkbox    = $(typeChecker.getType.checkbox);
      const resetBtn    = $(typeChecker.searchPokemon.resetBtn);
      const clearBtn    = $(typeChecker.searchPokemon.clearBtn);

      // 初回キャッシュ作成
      if ($('.js_list-html').length === 0) {
        $('body').append('<ul class="js_list-html" style="display:none;"></ul>\n');
        $('.js_list-html').html(pokemonList.html());
      }

      // ====== フォーカス・ブラー制御 ======
      let blurTimer = null;
      textbox.off('focus click').on('focus click', function() {
        if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
        wrapper.addClass(typeChecker.searchPokemon.isActiveClassName);
        // リストが空なら復元
        if (pokemonList.find('li').length === 0 && $('.js_list-html').length) {
          pokemonList.html($('.js_list-html').html());
          pokemonList.find('li').show();
        }
      });
      textbox.off('blur').on('blur', function() {
        blurTimer = setTimeout(function() {
          wrapper.removeClass(typeChecker.searchPokemon.isActiveClassName);
          blurTimer = null;
        }, 120);
      });

      // ====== 入力で絞り込み ======
      let composing = false;
      textbox.on('compositionstart', function(){ composing = true; });
      textbox.on('compositionend',  function(){ composing = false; textbox.trigger('keyup'); });

      textbox.off('keyup change').on('keyup change', function() {
        if (composing) return;
        if (textbox.is(':focus')) wrapper.addClass(typeChecker.searchPokemon.isActiveClassName);

        const keywordRaw = $(this).val();
        const keyword = pokemonUtil.translate.katakana(String(keywordRaw).trim());

        // 毎回全件復元してからフィルタ
        if ($('.js_list-html').length) {
          pokemonList.html($('.js_list-html').html());
        }

        if (keyword === '') {
          pokemonList.find('li').show();
          if (typeChecker.getType?.clear) typeChecker.getType.clear();
          checkbox.each(function(){ $(this).prop('checked', false); });
          clearBtn.hide();

          // ★ 追加：入力が空になったら選択カードも削除
          typeChecker.searchPokemon.clearSelected();
          return;
        }

        pokemonList.find('li').each(function() {
          const text = $(this).text();
          $(this).toggle(text.indexOf(keyword) > -1);
        });
        clearBtn.show();
      });

      // ====== リスト選択（mousedown→pointerdown の既存方針を関数参照に置換） ======
      $(document)
        .off('pointerdown.pokemonList mousedown.pokemonList')
        .on('pointerdown.pokemonList mousedown.pokemonList', '.js_pokemon-search-list a', typeChecker.searchPokemon.handlePick);

      // ====== リセット ======
      resetBtn.off('click').on('click', typeChecker.searchPokemon.handleReset);
    },

    // 既存：型で選択（そのまま）
    select : function(arry) {
      const typeList = $(typeChecker.searchPokemon.typeList);
      const typeListItem = typeList.find('li');
      const checkbox = typeListItem.find(typeChecker.getType.checkbox);
      typeChecker.getType.clear();
      checkbox.each(function() {
        $(this).prop('checked', false);
      });
      if ( arry.length > 0 ) {
        const Jname = arry[0];
        for ( let i=0; i<typeListItem.length; i++ ) {
          const btn = typeListItem.eq(i).find(typeChecker.getType.checkbox);
          const Evalue = btn.val();
          const Jvalue = pokemonUtil.translate.EtoJ(Evalue);
          if ( Jvalue == Jname ) {
            btn.click();
          }
        }
      }
      if ( arry.length == 2 ) {
        const Jname2 = arry[1];
        for ( let i=0; i<typeListItem.length; i++ ) {
          const btn = typeListItem.eq(i).find(typeChecker.getType.checkbox);
          const Evalue = btn.val();
          const Jvalue = pokemonUtil.translate.EtoJ(Evalue);
          if ( Jvalue == Jname2 ) {
            btn.click();
          }
        }
      }
    },

    // 追加：選択中タイプ（日本語）を配列で取得
    getSelectedTypesJa : function() {
      const sel = typeChecker.getType.checkbox; // 例: 'input[name="pokemon-type"]'
      const nodes = document.querySelectorAll(sel + ':checked');
      const arr = Array.prototype.map.call(nodes, el => {
        // value が英名の場合は和名に寄せる、すでに和名ならそのまま
        const v = el.value || '';
        // どちらの可能性もある前提で normalize
        const jaFromEn = pokemonUtil.translateTypes.toJaType(v);
        return jaFromEn || v;
      });
      return arr;
    },

    clear : function(data) {
      const wrapper = $(typeChecker.searchPokemon.wrapper);
      const textbox = wrapper.find(typeChecker.searchPokemon.textbox);
      const pokemonList = wrapper.find(typeChecker.searchPokemon.pokemonList);
      for ( let i=0; i<data.length; i++ ) {
        let pokemonName = data[i].name;
        if ( data[i].form != '' ) {
          pokemonName += '（' + data[i].form + '）';
        }
        const no = data[i].no;
        const typesJa = data[i].typesJa;
        if ( pokemonName ) {
          pokemonList.append(`<li><a href="javascript:void(0);" data-no="${no}" data-types-ja="${typesJa.join(',')}">${pokemonName}</a></li>`);
        }
      }
      textbox.val('');
    }
  },
  applicable : {
    ini : function(data) {
      const effect = $(typeChecker.getType.effect);
      effect.off('click');
      effect.on('click', 'a', function() {
        const type = $(this).data('type');
        typeChecker.applicable.list(data, type);
      });
    },
    list : function(data, type) {
      for ( let i=0; i<data.length; i++ ) {
        const isMegaEvolution = data[i].isMegaEvolution;
        const evolutions = data[i].evolutions;
        const hp = data[i].stats.hp;
        const attack = data[i].stats.attack;
        const defense = data[i].stats.defense;
        const spAttack = data[i].stats.spAttack;
        const spdefense = data[i].stats.spdefense;
        const totalAttack = attack + spAttack;
        const totaldefense = defense + spdefense;
        const total = hp + totalAttack + totaldefense;
        const types = data[i].typesJa;
        let flag = 0;
        for ( let j=0; j<types.length; j++ ) {
          if ( pokemonUtil.translate.JtoE(types[j]) == type ) {
            flag = 1;
          }
        }
        if (( flag == 1 ) && ( isMegaEvolution != true ) && ( evolutions.length == 0 )) {
          if ( total > 420 ) {
            console.log(data[i].name + ':' + totalAttack + ',' + totaldefense);
          }
        }
      }
    }
  },

  recommend : {
    updateByDefenderTypes: function(checkedEn, defenseTable){
      try {
        console.log('[recommend.updateByDefenderTypes] checkedEn =', checkedEn);

        const $wrap = $('.js_pokemon-recommend-list');

        // 受ける側タイプ（英）→ 日本語に変換
        const defenderTypesJa = (Array.isArray(checkedEn) ? checkedEn : [])
          .map(function(en){ return pokemonUtil.translate.EtoJ(en); })
          .filter(Boolean);

        if (!defenderTypesJa.length) {
          // チェックが0個のときはおすすめをクリア
          $wrap.empty();
          console.log('[recommend.updateByDefenderTypes] no defender types, clear list');
          return;
        }

        const DEF_NOW = Array.isArray(defenseTable)
          ? defenseTable
          : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

        const POK_NOW =
          (pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__ || [];

        const recList = typeChecker.recommend.recommendCounters({
          defenderTypesJa: defenderTypesJa,
          pokemonDataset : POK_NOW,
          defenseChart   : DEF_NOW,
          limit          : 20
        }) || [];

        console.log('[recommend.updateByDefenderTypes] results =', recList.length);
        typeChecker.recommend.renderRecommendations($wrap, recList);
      } catch (err) {
        console.error('[recommend.updateByDefenderTypes] error:', err);
      }
    },

    // 対策おすすめを計算して返す
    recommendCounters : function(options) {
      const defenderTypesJa = options?.defenderTypesJa || [];
      const pokemonDataset  = options?.pokemonDataset  || [];
      const defenseChart    = options?.defenseChart    ||
        (pokemonUtil?.data?.get('TYPE_DEFENSE') || window.__TYPE_DEFENSE_TABLE__ || []);
      const limit           = Number(options?.limit || 20);

      console.log('[recommendCounters] start defJa=', defenderTypesJa, 'dataset=', Array.isArray(pokemonDataset) ? pokemonDataset.length : 0);

      if (!defenderTypesJa.length || !Array.isArray(defenseChart)) {
        return [];
      }

      // 攻撃タイプ × 防御タイプ構成 → 倍率をメモ化
      const multCache = new Map();
      const keyOf = function(atkEn) {
        return atkEn + '|' + defenderTypesJa.join('+');
      };

      const getMultVsDefenders = function(atkEnRaw) {
        const atkEn = (atkEnRaw || '').toString().toLowerCase();
        if (!atkEn) return 1.0;

        const k = keyOf(atkEn);
        if (multCache.has(k)) return multCache.get(k);

        let total = 1.0;

        defenderTypesJa.forEach(function(defJa){
          if (!defJa) return;

          const defEn = pokemonUtil.translate.JtoE(defJa);
          const row =
            defenseChart.find(function(r){ return r.typeJa === defJa; }) ||
            defenseChart.find(function(r){ return r.type === defEn; });

          if (!row || !Array.isArray(row.effect)) return;

          const eff = row.effect.find(function(e){
            return (e.type || '').toString().toLowerCase() === atkEn;
          });
          if (!eff) return;

          let m = 1.0;
          if (pokemonUtil && typeof pokemonUtil.normalizeMultiplier === 'function') {
            m = pokemonUtil.normalizeMultiplier(eff);
          } else if (eff.multiplier != null) {
            const tmp = Number(eff.multiplier);
            if (Number.isFinite(tmp) && tmp > 0) m = tmp;
          }
          total *= m;
        });

        if (!Number.isFinite(total) || total <= 0) total = 1.0;
        multCache.set(k, total);
        return total;
      };

      const results = [];
      const eps = 1e-3;
      const isSE = function(mult) { return mult >= (1.6 - eps); }; // こうかばつぐんのみ

      const arr = Array.isArray(pokemonDataset) ? pokemonDataset : [pokemonDataset];

      arr.forEach(function(p) {
        const pdArr = pokemonUtil.getPokemonData(p);
        let pd      = Array.isArray(pdArr) ? pdArr[0] : pdArr;
        if (!pd || !pd.id) return;

        // ★ ここでステータスだけ上書き（なければ何もしない）
        if (pokemonUtil.attachGoStats) {
          pd = pokemonUtil.attachGoStats(pd) || pd;
        }

        const normalMoves  = (pd.moves && pd.moves.normal)  || [];
        const specialMoves = (pd.moves && pd.moves.special) || [];

        // 攻撃側タイプ（STAB 判定用）
        const attackerTypesEn = (pd.typesEn || [])
          .map(function(t){ return (t || '').toString().toLowerCase(); })
          .filter(Boolean);

        const seNormal  = [];
        const seSpecial = [];
        let bestMoveScore = 0;

        const pushMove = function(m, category) {
          if (!m) return;
          const typeEn = (m.typeEn || '').toString().toLowerCase();
          if (!typeEn) return;

          const mult = getMultVsDefenders(typeEn);
          if (!isSE(mult)) return; // こうかばつぐん以外は候補外

          const power = Number(m.power || 0);
          if (!power) return;

          // STAB 判定
          const hasStab = attackerTypesEn.includes(typeEn);
          const stab    = hasStab ? 1.2 : 1.0;

          // ワザ単体スコア（威力 × 相性倍率 × STAB）
          const moveScore = power * mult * stab;

          const move = $.extend({}, m, {
            mult:      mult,
            stab:      stab,
            moveScore: moveScore,
            category:  category
          });

          if (category === 'normal') {
            seNormal.push(move);
          } else {
            seSpecial.push(move);
          }

          if (moveScore > bestMoveScore) bestMoveScore = moveScore;
        };

        normalMoves.forEach(function(m){ pushMove(m, 'normal'); });
        specialMoves.forEach(function(m){ pushMove(m, 'special'); });

        // SE 技が1つもなければ候補外
        if (!seNormal.length && !seSpecial.length) return;

        // ===== ポケモン側の総合スコア =====
        const atkStat = pd.goStats?.attack  || 0;
        const defStat = pd.goStats?.defense || pd.goStats?.defence || 0;
        const staStat = pd.goStats?.stamina || 0;

        const MAX_ATK    = 300;
        const MAX_DEFSTA = 600;

        const atkNorm  = atkStat / MAX_ATK;
        const bulkNorm = (defStat + staStat) / MAX_DEFSTA;

        const statWeight = (atkNorm * 0.7) + (bulkNorm * 0.3);

        const monScore = bestMoveScore * (statWeight || 1);

        results.push({
          id:        pd.id,
          nameJa:    pd.nameJa,
          nameEn:    pd.nameEn,
          typesJa:   pd.typesJa || [],
          typesEn:   pd.typesEn || [],
          moves: {
            normal:  seNormal,
            special: seSpecial
          },
          goStats:   pd.goStats || {},
          baseTotal: pd.baseTotal || 0,
          score:     monScore
        });
      });

      // スコア順に並べる（同点は攻撃種族値 → BST）
      results.sort(function(a, b){
        if (b.score !== a.score) return b.score - a.score;
        const atkA = a.goStats?.attack || 0;
        const atkB = b.goStats?.attack || 0;
        if (atkB !== atkA) return atkB - atkA;
        return (b.baseTotal || 0) - (a.baseTotal || 0);
      });

      const sliced = results.slice(0, limit);
      console.log('[recommendCounters] done, candidates =', sliced.length);
      if (sliced[0]) console.log('[recommendCounters] top =', sliced[0].nameJa, sliced[0]);

      return sliced;
    },

    renderRecommendations: function($wrap, json) {
      const $w = ($wrap instanceof jQuery) ? $wrap : $($wrap);
      if (!$w.length) return;

      const list = Array.isArray(json) ? json.slice() : [];
      if (!list.length) {
        $w.empty();
        return;
      }

      const EPS = 1e-6;

      if (!list.length) {
        $w.empty();
        return;
      }

      // === ここから：スコア計算＆ソート（既存の _score 計算＋ sort をこのブロックに差し替え） ===

      // 技1発の評価：威力 × STAB
      function scoreBestSpecialForPokemon(d) {
        if (!d || !d.moves) return 0;

        const specials = Array.isArray(d.moves.special) ? d.moves.special : [];
        if (!specials.length) return 0;

        // ポケモンのタイプ（英）
        const typesEn = Array.isArray(d.typesEn)
          ? d.typesEn.map(t => (t || '').toString().toLowerCase())
          : [];

        let bestScore = 0;

        for (let i = 0; i < specials.length; i++) {
          const m = specials[i] || {};
          const power = Number(m.power) || 0;
          if (!power) continue;

          const typeEn = (m.typeEn || m.type || '').toString().toLowerCase();
          if (!typeEn) continue;

          // STAB（タイプ一致なら 1.2 倍）
          const hasStab = typesEn.includes(typeEn);
          const stab = hasStab ? 1.2 : 1.0;

          const val = power * stab;  // 1発の強さ
          if (val > bestScore) bestScore = val;
        }

        return bestScore;
      }

      list.forEach(d => {
        // GO攻撃種族値（なければ原作攻撃、なければ0）
        const atk =
          (d.goStats && d.goStats.attack != null)
            ? d.goStats.attack
            : (d.baseStats && d.baseStats.attack != null
                ? d.baseStats.attack
                : 0);

        const bestSpecialScore = scoreBestSpecialForPokemon(d);

        d._bestSpecialScore = bestSpecialScore;
        d._score = atk * bestSpecialScore; // ★最終スコア
      });

      list.sort((a, b) => {
        const sa = (a && a._score != null) ? a._score : 0;
        const sb = (b && b._score != null) ? b._score : 0;
        if (sb !== sa) return sb - sa; // スコア降順

        const atkA =
          (a && a.goStats && a.goStats.attack != null) ? a.goStats.attack :
          (a && a.baseStats && a.baseStats.attack != null) ? a.baseStats.attack : 0;
        const atkB =
          (b && b.goStats && b.goStats.attack != null) ? b.goStats.attack :
          (b && b.baseStats && b.baseStats.attack != null) ? b.baseStats.attack : 0;
        if (atkB !== atkA) return atkB - atkA; // 攻撃値降順

        const bstA = (a && a.baseTotal != null) ? a.baseTotal : 0;
        const bstB = (b && b.baseTotal != null) ? b.baseTotal : 0;
        return bstB - bstA; // BST降順
      });
      // === スコア計算＆ソートここまで ===
      // === HTML組み立て ===

      // タイプバッジ
      const buildTypeBadges = function(typesJa, typesEn) {
        const jaArr = Array.isArray(typesJa) ? typesJa : [];
        const enArr = Array.isArray(typesEn) ? typesEn : [];
        let html = '';
        for (let i = 0; i < Math.max(jaArr.length, enArr.length); i++) {
          const ja = jaArr[i] || '';
          const en = (enArr[i] || '').toString().toLowerCase();
          if (!ja) continue;
          html += `
            <div class="badge">
              <span class="icon icon-type-${en}"></span>${ja}
            </div>`;
        }
        return html;
      };

      // わざブロック生成
      const buildMovesHtml = function(label, moves, opts) {
        const list = Array.isArray(moves) ? moves.slice() : [];
        if (!list.length) return '';

        const bestTypeEn   = (opts && opts.bestTypeEn)   || '';
        const bestMoveId   = (opts && opts.bestMoveId)   || '';
        const isSpecial    = (label === 'スペシャル');

        let filtered = list;

        // 通常技：スペシャルと同タイプのものを優先
        if (!isSpecial && bestTypeEn) {
          const sameType = list.filter(function(m) {
            return (m.typeEn || '').toString().toLowerCase() === bestTypeEn;
          });
          if (sameType.length) {
            filtered = sameType;
          }
        }

        // スペシャル：bestSpecial を先頭に並べる
        if (isSpecial && bestMoveId) {
          filtered.sort(function(a, b) {
            const idA = a && a.id;
            const idB = b && b.id;
            if (idA === bestMoveId && idB !== bestMoveId) return -1;
            if (idB === bestMoveId && idA !== bestMoveId) return 1;
            const pA = Number(a.power) || 0;
            const pB = Number(b.power) || 0;
            return pB - pA;
          });
        }

        let block = `
          <div class="pokemon-recommend-list-item-attack-wrapper">
            <dl class="pokemon-recommend-list-item-attack">
              <dt class="pokemon-recommend-list-item-attack-label">${label}</dt>`;

        for (let j = 0; j < filtered.length; j++) {
          const m = filtered[j] || {};
          const typeEn = (m.typeEn || '').toString().toLowerCase();
          const name   = m.nameJa || m.nameEn || '-';
          const power  = (m.power != null) ? m.power : '-';

          // ゲージ本数（スペシャルのみ）
          let gaugeNum = null;
          if (isSpecial) {
            let bars = m.gaugeBars;
            if (!bars) {
              const e = Math.abs(Number(m.energy) || 0);
              if (e > 0) {
                if (e <= 35)      bars = 3;
                else if (e <=55)  bars = 2;
                else              bars = 1;
              } else {
                bars = 1;
              }
            }
            gaugeNum = Math.max(1, Math.min(3, bars));
          }

          block += `
              <dd class="pokemon-recommend-list-item-attack-info is_${typeEn}">
                <div class="pokemon-recommend-list-item-attack-name">
                  <span class="icon icon-type-${typeEn}"></span>${name}
                </div>`;

          if (isSpecial) {
            block += `
                <div class="pokemon-recommend-list-item-attack-gauge">
                  <svg class="gauge" aria-hidden="true"><use href="#gauge${gaugeNum}"></use></svg>
                </div>`;
          }

          block += `
                <div class="pokemon-recommend-list-item-attack-power">${power}</div>
              </dd>`;
        }

        block += `
            </dl>
          </div>`;

        return block;
      };

      let html = '';

      for (let i = 0; i < list.length; i++) {
        const d = list[i] || {};
        const img = pokemonUtil.getImageUrlByNo(d.id);
        const typesJa = d.typesJa || [];
        const typesEn = d.typesEn || [];

        const typeHtml = buildTypeBadges(typesJa, typesEn);

        const normalMoves  = Array.isArray(d.moves?.normal)  ? d.moves.normal  : [];
        const specialMoves = Array.isArray(d.moves?.special) ? d.moves.special : [];

        const bestSpecial  = d._bestSpecial || null;
        const bestTypeEn   = d._bestTypeEn || '';
        const bestMoveId   = bestSpecial ? bestSpecial.id : '';

        const normalHtml  = buildMovesHtml('ノーマル',  normalMoves,  { bestTypeEn });
        const specialHtml = buildMovesHtml('スペシャル', specialMoves, { bestTypeEn, bestMoveId });

        const goAtk  = d.goStats?.attack  ?? '-';
        const goDef  = d.goStats?.defense ?? '-';
        const goStam = d.goStats?.stamina ?? '-';

        html += `
          <li class="pokemon-recommend-list-item js_toggle-wrapper">
            <div class="pokemon-recommend-list-item-header js_pokemon-recommend-list-item-header">
              <div class="pokemon-info-wrapper">
                <div class="pokemon-info-img">
                  <img src="${img}" decoding="async" loading="lazy" alt="${d.nameJa || '-'}">
                </div>
                <div class="pokemon-info-name">${d.nameJa || '-'}</div>
                <div class="pokemon-info-type">
                  ${typeHtml}
                </div>
              </div>
              <a href="javascript:void(0);" class="js_toggle-trigger"></a>
            </div>
            <div class="js_toggle-content">
              <dl class="pokemon-recommend-info-score">
                <dt class="pokemon-recommend-info-score-label">種族値(GO)</dt>
                <dl class="pokemon-recommend-info-score-value">
                  <ul class="pokemon-recommend-info-score-list">
                    <li class="pokemon-recommend-info-score-list-item">
                      こうげき <span class="num">${goAtk}</span>
                    </li>
                    <li class="pokemon-recommend-info-score-list-item">
                      ぼうぎょ <span class="num">${goDef}</span>
                    </li>
                    <li class="pokemon-recommend-info-score-list-item">
                      HP <span class="num">${goStam}</span>
                    </li>
                  </ul>
                </dl>
              </dl>
              <div class="pokemon-recommend-list-item-attack-wrapper">
                ${normalHtml}
                ${specialHtml}
              </div>
            </div>
          </li>`;
      }

      $w.html(html);
      if (window.toggle && typeof window.toggle.ini === 'function') {
        toggle.ini();
      }
    },

  },

  createRecommendHtml : function(wrapper, pokemon) {
    const pokemonData = getPokemonData(pokemon);
    for ( let i=0; i<pokemonData.length; i++ ) {
      const data = pokemonData[i];
      const id = pokemonData[i]['id'];
      const normalMoves = pokemonData[i]['moves']['normal'];
      const specialMoves = pokemonData[i]['moves']['normal'];
      for (let j=0; j<normalMoves.length; j++) {
        /* HTMLを生成 */
      }
      /* HTMLを生成 */
    }
    wrapper.append(html);
  }

}

$(function() {
  tabs.ini();
  toggle.ini();

  pokemonUtil.data.onReady(state => {
    typeChecker.searchPokemon.ini(state.POKEMON_DATA);
    typeChecker.getType.ini();                 // 内部で TYPE_DEFENSE を参照するだけ
    typeChecker.applicable.ini(state.POKEMON_DATA);

    console.log('lotad', pokemonUtil.getPokemonData('lotad'));
  });
});

// $(document).on('pokemon:data-ready', function() {
//   debugDumpDataState();                  // ① 現状の各配列の状態を出す
//   console.log('TEST getPokemonData(lotad):', pokemonUtil.getPokemonData('lotad'));
// });
// function debugDumpDataState() {
//   const A = window.__POKEMON_DATA__;
//   const B = window.__POKEMON_GO_META__;
//   const C = window.__MOVES_MASTER_LOCALIZED__;
//   const D = window.__TYPE_DEFENSE_TABLE__;
//   console.log('[STATE]',
//     { POKEMON_DATA: Array.isArray(A) ? A.length : A && typeof A,
//       GO_META:      Array.isArray(B) ? B.length : B && typeof B,
//       MOVES:        Array.isArray(C) ? C.length : C && typeof C,
//       DEF_TABLE:    Array.isArray(D) ? D.length : D && typeof D,
//     }
//   );
//   // 先頭サンプルを軽く覗く
//   if (Array.isArray(A) && A.length) console.log('[SAMPLE] POKEMON_DATA[0]', A[0]);
//   if (Array.isArray(B) && B.length) console.log('[SAMPLE] GO_META[0]', B[0]);
//   if (Array.isArray(C) && C.length) console.log('[SAMPLE] MOVES[0]', C[0]);
//   if (Array.isArray(D) && D.length) console.log('[SAMPLE] DEF_TABLE[0]', D[0]);
// }
