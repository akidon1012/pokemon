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
    ini: function() {
      const sel = typeChecker.getType.checkbox || '[name="pokemon-type"]';

      // ★ データ準備待ち（pokemonUtil.data を優先）
      const POK = (pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__;
      const DEF = (pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__;
      const ready = Array.isArray(POK) && Array.isArray(DEF);
      if (!ready) {
        console.warn('[getType.ini] data not ready -> wait pokemon:data-ready');
        $(document).off('pokemon:data-ready.getTypeIni')
                  .on('pokemon:data-ready.getTypeIni', () => typeChecker.getType.ini());
        return;
      }

      // ★ インデックスは一度だけ構築
      if (!typeChecker.getType._index) typeChecker.getType._buildIndex();

      // --- A) 一覧描画（既存の check を呼ぶ） ---
      $(document).off('change.pokemonType.core')
                .on('change.pokemonType.core', sel, function() {
                    const DEF_NOW = (pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || [];
                    typeChecker.getType.check(DEF_NOW, $(this));
                });

      // --- B) おすすめ（別名前空間） ---
      $(document).off('change.pokemonType.recommend')
                .on('change.pokemonType.recommend', sel, function() {
                    const selected =
                      (typeChecker.searchPokemon?.getSelectedTypesJa?.() || [])
                      .map(v => pokemonUtil.translateTypes?.toJaType?.(v) || v);

                    const $wrap = $('.js_pokemon-recommend-list');
                    if (!selected.length) { $wrap.empty(); return; }

                    const DEF_NOW = (pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || [];
                    const POK_NOW = (pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__ || [];

                    const counter = pokemonUtil.getCounterTypes(selected, DEF_NOW) || [];
                    const recs    = pokemonUtil.pickPokemonByTypes(counter, { dataset: POK_NOW, limit: 20 }) || [];
                    const json    = pokemonUtil.getPokemonData(recs) || [];
                    typeChecker.recommend.renderRecommendations($wrap, json);
                    console.log('recommend', json);
                });

      // 初期反映
      const first = document.querySelector(sel + ':checked');
      if (first) $(first).trigger('change');
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

      // 0個 → クリア
      if (checked.length === 0) {
        typeChecker.getType.clear();
        return;
      }
      // 3個以上はガード
      if (checked.length > 2) {
        typeChecker.getType.error();
        btn.prop('checked', false);
        return;
      }

      // 描画リセット
      effectWrap.empty();
      effect1.empty(); effect2.empty(); effect3.empty(); effect4.empty(); effect5.empty();

      // 全攻撃タイプを 1.0 で初期化
      const attackTypes = typeChecker.getType.typeName.slice();   // ['normal','fire',...]
      const multMap = {};
      attackTypes.forEach(function(t){ multMap[t] = 1.0; });

      // 防御タイプごとに、防御相性テーブルから倍率を乗算
      checked.forEach(function(defTypeEn){
        // row.type が EN、row.typeJa が JA のどちらでも拾えるように
        const defJa = pokemonUtil.translate.EtoJ(defTypeEn);
        const row =
          TABLE.find(function(r){ return r.type === defTypeEn; }) ||
          TABLE.find(function(r){ return r.typeJa === defJa; });

        if (!row || !Array.isArray(row.effect)) return;

        row.effect.forEach(function(e){
          const atkEn = e.type;  // 攻撃タイプ EN
          if (!attackTypes.includes(atkEn)) return;

          // ★ここが一番大事：必ず normalizeMultiplier を通す
          var m = 1.0;
          if (pokemonUtil && typeof pokemonUtil.normalizeMultiplier === 'function') {
            m = pokemonUtil.normalizeMultiplier(e);
          } else if (e.mult != null) {
            // 念のため旧形式にも対応
            var tmp = Number(String(e.mult).replace(/[^\d.]/g, ''));
            m = (Number.isFinite(tmp) && tmp > 0) ? tmp : 1.0;
          }

          var cur = multMap[atkEn];
          if (!Number.isFinite(cur)) cur = 1.0;
          multMap[atkEn] = cur * m;
        });
      });

      // バケットごとに出力
      attackTypes.forEach(function(t){
        var raw = multMap[t];
        if (!Number.isFinite(raw) || raw <= 0) raw = 1.0;  // NaN/0 を等倍に潰す
        const mult = Number(raw.toFixed(2));               // 表示用に丸め
        const ja   = pokemonUtil.translate.EtoJ(t);

        const html =
          `
          <li><a href="javascript:void(0);" data-type="${t}">
            <span class="icon icon-type-${t}"></span>${ja} <span class="multiplier">×${mult}</span>
          </a></li>
          `

        // bucket() は既存のグローバル想定（NaNはもう来ない）
        switch (typeChecker.bucket(mult)) {
          case 'x2win':  effect5.append(html); break; // 2.56
          case 'x1win':  effect4.append(html); break; // 1.6
          case 'x1lose': effect2.append(html); break; // 0.625
          case 'x2lose': effect1.append(html); break; // 0.39
          default:       effect3.append(html); break; // 1.0
        }
      });

      // 検索リストは従来どおり再構築
      typeChecker.searchPokemon.clear(window.__pokemonListData || []);
      const searchWrapper = $(typeChecker.searchPokemon.wrapper);
      const pokemonList   = searchWrapper.find(typeChecker.searchPokemon.pokemonList);
      if ($('.js_list-html').length) {
        pokemonList.html($('.js_list-html').html());
      }
      const selectedJa = (typeof typeChecker.searchPokemon.getSelectedTypesJa === 'function')
        ? typeChecker.searchPokemon.getSelectedTypesJa()
        : [];
      requestAnimationFrame(() => {
        typeChecker.getType._filterListByTypesJa(selectedJa);
      });
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
        const types = data[i].types;
        if ( pokemonName ) {
          pokemonList.append(`<li><a href="javascript:void(0);" data-no="${no}" data-types-ja="${types.join(',')}">${pokemonName}</a></li>`);
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
        const types = data[i].types;
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
    recommendCounters: function(options) {
      if (typeChecker.recommend.recommendCounters._running) return [];
      typeChecker.recommend.recommendCounters._running = true;

      try {
        const defenderTypesJa = Array.isArray(options?.defenderTypesJa) ? options.defenderTypesJa : [];

        const pokemonDataset =
          Array.isArray(options?.pokemonDataset)
            ? options.pokemonDataset
            : ((pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__ || []);

        const defenseChart =
          Array.isArray(options?.defenseChart)
            ? options.defenseChart
            : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

        const limit = Number(options?.limit || 5);
        if (!defenderTypesJa.length) return [];

        const EPS = 1e-6;

        const findDefenseRow = function(defJa) {
          const defEn = pokemonUtil.translateTypes.toEnType(defJa);
          if (!defEn) return null;
          const defEnLower = defEn.toLowerCase();
          return defenseChart.find(r => (r.type || '').toLowerCase() === defEnLower) || null;
        };

        const multMap = new Map();
        defenderTypesJa.forEach(defJa => {
          const row = findDefenseRow(defJa);
          if (!row || !Array.isArray(row.effect)) return;
          row.effect.forEach(e => {
            const atkJa = pokemonUtil.translateTypes.toJaType(e.type);
            if (!atkJa) return;
            const m   = pokemonUtil.normalizeMultiplier(e);
            const cur = multMap.get(atkJa) ?? 1.0;
            multMap.set(atkJa, cur * m);
          });
        });

        const counterTypesJa = Array.from(multMap.entries())
          .filter(([, v]) => v > (1.0 + EPS))
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => k);

        if (!counterTypesJa.length) return [];

        const list = pokemonDataset
          .filter(p => !p.isMegaEvolution)
          .map(p => {
            const typesJa = pokemonUtil.normalizeTypesJa(p);
            const hit     = counterTypesJa.some(t => typesJa.includes(t));
            const total   = pokemonUtil.totalBase(p);
            return Object.assign({}, p, { _typesJa: typesJa, _hits: hit, _total: total });
          })
          .filter(p => p._hits)
          .sort((a, b) => b._total - a._total)
          .slice(0, limit);

        return list;
      } finally {
        typeChecker.recommend.recommendCounters._running = false;
      }
    },

    renderRecommendations : function($wrap, json) {
      if (!$wrap || !$wrap.length) {
        console.warn('[recommend.renderRecommendations] wrapper not found:', $wrap);
        return;
      }
      if (!Array.isArray(json)) json = [];
      let html = '';
      for (let i = 0; i < json.length; i++) {
        const d = json[i] || {};
        console.log(d);
        const img = pokemonUtil.getImageUrlByNo(d.id);
        const typesJa = d.typesJa;
        const typesEn = d.typesEn;
        let typeHtml = '';
        for (let j=0; j<typesJa.length; j++) {
          typeHtml = `
            <div class="badge"><span class="icon icon-type-${typesEn[j]}"></span>${typesJa[j]}</div>
          `
        }
        const normalAttacks = d.moves.normal;
        const normalLabel   = normalAttacks[0]?.typeJa || 'ノーマル';  // ★追加
        let normalAttacksHtml = `
          <dl class="pokemon-recommend-list-item-atack">
            <dt class="pokemon-recommend-list-item-atack-label">${normalLabel}</dt>
        `;
        for ( let j=0; j<normalAttacks.length; j++ ) {
          normalAttacksHtml += `
            <dd class="pokemon-recommend-list-item-atack-name">
              <span class="icon icon-type-${normalAttacks[j].typeEn}"></span>${normalAttacks[j].nameJa}
            </dd>
          `
        }
        normalAttacksHtml += `</dl>`;

        const specialAttacks = d.moves.special;
        const specialLabel   = specialAttacks[0]?.typeJa || 'スペシャル'; // ★追加
        let specialAttacksHtml = `
          <dl class="pokemon-recommend-list-item-atack">
            <dt class="pokemon-recommend-list-item-atack-label">${specialLabel}</dt>
        `;
        for ( let j=0; j<specialAttacks.length; j++ ) {
          specialAttacksHtml += `
            <dd class="pokemon-recommend-list-item-atack-name">
              <span class="icon icon-type-${specialAttacks[j].typeEn}"></span>${specialAttacks[j].nameJa}
            </dd>
          `
        }
        specialAttacksHtml += `</dl>`;

        html += `
          <li class="pokemon-recommend-list-item js_toggle-wrapper">
            <div class="pokemon-recommend-list-item-header js_pokemon-recommend-list-item-header">
              <div class="pokemon-info-wrapper">
                <div class="pokemon-info-img">
                  <img src="${img}" decoding="async" loading="lazy" alt="${d.nameJa}">
                </div>
                <div class="pokemon-info-name">${d.nameJa}</div>
                <div class="pokemon-info-type">
                  ${typeHtml}
                </div>
              </div>
              <a href="" class="js_toggle-trigger"></a>
            </div>
            <div class="js_toggle-content">
              <dl class="pokemon-recommend-info-score">
                <dt class="pokemon-recommend-info-score-label">種族値</dt>
                <dl class="pokemon-recommend-info-score-value">
                  <ul class="pokemon-recommend-info-score-list">
                    <li class="pokemon-recommend-info-score-list-item">
                      こうげき <span class="num">${d.goStats.attack}</span>
                    </li>
                    <li class="pokemon-recommend-info-score-list-item">
                      ぼうぎょ <span class="num">${d.goStats.defense}</span>
                    </li>
                    <li class="pokemon-recommend-info-score-list-item">
                      HP <span class="num">${d.goStats.stamina}</span>
                    </li>
                  </ul>
                </dl>
              </dl>
              <div class="pokemon-recommend-list-item-atack-wrapper">
                ${normalAttacksHtml}
                ${specialAttacksHtml}
              </div>
            </div>
          </li>
        `
        // html += '<li class="pokemon-recommend-item">';
        // html +=   '<div class="pokemon-head">';
        // html +=     '<span class="pokemon-name">' + (d.nameJa || d.nameEn || '-') + '</span>';
        // html +=     '<span class="pokemon-types">' + (Array.isArray(d.typesJa) && d.typesJa.length ? d.typesJa.join(' / ') : '-') + '</span>';
        // html +=     '<span class="pokemon-total">BST: ' + (d.baseTotal ?? '-') + '</span>';
        // html +=   '</div>';

        // html +=   '<div class="pokemon-moves pokemon-moves-normal"><ul>';
        // (d.moves?.normal || []).forEach(m => {
        //   html += '<li class="move move-normal">';
        //   html +=   '<span class="move-name">' + (m.nameJa || m.nameEn || '-') + '</span>';
        //   html +=   '<span class="move-type">[' + (m.typeJa || m.typeEn || '-') + ']</span>';
        //   if (m.power != null)  html += '<span class="move-power"> P:' + m.power + '</span>';
        //   if (m.turns != null)  html += '<span class="move-turns"> T:' + m.turns + '</span>';
        //   html += '</li>';
        // });
        // html +=   '</ul></div>';

        // html +=   '<div class="pokemon-moves pokemon-moves-special"><ul>';
        // (d.moves?.special || []).forEach(m => {
        //   html += '<li class="move move-special">';
        //   html +=   '<span class="move-name">' + (m.nameJa || m.nameEn || '-') + '</span>';
        //   html +=   '<span class="move-type">[' + (m.typeJa || m.typeEn || '-') + ']</span>';
        //   if (m.power  != null) html += '<span class="move-power"> P:' + m.power + '</span>';
        //   if (m.energy != null) html += '<span class="move-energy"> E:' + m.energy + '</span>';
        //   html += '</li>';
        // });
        // html +=   '</ul></div>';

        // html += '</li>';
      }
      $wrap.html(html);
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
