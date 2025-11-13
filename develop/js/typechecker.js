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
                    typeChecker.recommend.renderRecommendations($wrap, {
                      defenderTypesJa: selected, 
                      pokemonDataset: pokemonUtil?.data?.get('POKEMON_DATA') || window.__POKEMON_DATA__,
                      defenseChart:  pokemonUtil?.data?.get('TYPE_DEFENSE') || window.__TYPE_DEFENSE_TABLE__,
                      limit: 20
                    });
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
    // 攻撃タイプ(英) × 防御側タイプ(和)配列 → 倍率（複合は乗算）
    getMultiplierVsDefenders : function(atkTypeEn, defenderTypesJa, defenseChart){
      const atk = pokemonUtil.toEnTypeLower(atkTypeEn);
      if (!atk || !Array.isArray(defenderTypesJa) || defenderTypesJa.length === 0) return 1.0;

      const table = Array.isArray(defenseChart) ? defenseChart
                  : (Array.isArray(window.__TYPE_DEFENSE_TABLE__) ? window.__TYPE_DEFENSE_TABLE__ : []);
      if (!table.length) return 1.0;

      // 防御1タイプごとに table の該当行を拾い倍率を掛け合わせ
      let total = 1.0;
      for (const defJa of defenderTypesJa) {
        const defEn = pokemonUtil.translateTypes?.toEnType?.(defJa);
        if (!defEn) continue;
        const row = table.find(r => (r.type || '').toLowerCase() === defEn.toLowerCase());
        if (!row || !Array.isArray(row.effect)) continue;

        // row.effect は攻撃タイプごとの倍率を持つ
        const hit = row.effect.find(e => pokemonUtil.toEnTypeLower(e.type) === atk);
        const m = pokemonUtil.normalizeMultiplier(hit || {}); // '160%' / 1.6 / {value:2.56} など全部OK
        total *= (Number.isFinite(m) && m > 0) ? m : 1.0;
      }
      return total;
    },

    filterSuperEffectiveMoves : function(moves, defenderTypesJa, defenseChart){
      if (!Array.isArray(moves) || moves.length === 0) return [];
      const out = [];
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i] || {};
        // typeEn をできるだけ確実に解決
        let tEn =
          m.typeEn ||
          m.type ||
          (m.id ? pokemonUtil.getMoveType?.(m.id) : '') ||
          (m.typeJa ? pokemonUtil.translateTypes?.toEnType?.(m.typeJa) : '');
        tEn = pokemonUtil.toEnTypeLower(tEn); // 'POKEMON_TYPE_FIRE' → 'fire'

        const mult = typeChecker.recommend.getMultiplierVsDefenders(tEn, defenderTypesJa, defenseChart);

        console.log(
          '[filterSE]', (m.nameJa || m.nameEn || '(no name)'),
          'typeEn:', tEn,
          'def:', defenderTypesJa,
          '→ mult:', mult
        );

        if (mult > 1.0 + 1e-6) {
          out.push(Object.assign({}, m, { _multVsDef: mult, typeEn: tEn }));
        }
      }
      return out;
    },

recommendCounters : function (optsOrDefTypes, maybeOpts) {
  // ============================
  // 1. 引数正規化（旧仕様互換）
  // ============================
  var options = {};

  if (Array.isArray(optsOrDefTypes) || typeof optsOrDefTypes === 'string') {
    var defJa = Array.isArray(optsOrDefTypes) ? optsOrDefTypes : [optsOrDefTypes];
    options = $.extend(true, {}, maybeOpts, {
      defenderTypesJa: defJa
    });
  } else if (optsOrDefTypes && typeof optsOrDefTypes === 'object') {
    options = optsOrDefTypes;
  }

  options = options || {};

  // ============================
  // 2. デフォルトと前処理
  // ============================
  var rawDataset = options.pokemonDataset || window.__POKEMON_DATA__ || [];
  var limit = typeof options.limit === 'number' ? options.limit : 20;

  var defenderTypesJa = (options.defenderTypesJa || []).filter(Boolean);
  var defenderTypesEn = defenderTypesJa.map(function (tJa) {
    var tEn = pokemonUtil.translateTypes.toEnType(tJa) || '';
    return String(tEn).toLowerCase();
  });

  if (!defenderTypesEn.length) {
    console.log('[rc] no defenderTypesEn, return []');
    return [];
  }

  // ★ ここで一括正規化：ID配列 → フルデータ配列
  var pokemonDataset;
  if (Array.isArray(rawDataset)) {
    pokemonDataset = pokemonUtil.getPokemonData(rawDataset) || rawDataset;
  } else {
    pokemonDataset = rawDataset;
  }

  if (!pokemonDataset || !pokemonDataset.length) {
    console.log('[rc] empty pokemonDataset');
    return [];
  }

  // ★ 相性表：配列形式(type_defense.json) → 攻撃タイプ→防御タイプのマップに変換
  var defenseChart = (function () {
    var src = options.defenseChart || window.__TYPE_DEFENSE_TABLE__ || [];
    if (!src) return {};
    if (!Array.isArray(src)) return src; // すでにマップならそのまま

    var chart = {};

    src.forEach(function (row) {
      if (!row) return;

      // row.type は「防御側タイプ」
      var defType = (row.type || row.defenseType || '').toString().toLowerCase();
      var effects = row.effect || row.effects || [];

      if (!defType || !Array.isArray(effects)) return;

      effects.forEach(function (eff) {
        if (!eff) return;

        // eff.type は「攻撃側タイプ」
        var atkType = (eff.type || eff.attackType || '').toString().toLowerCase();
        if (!atkType) return;

        if (!chart[atkType]) {
          chart[atkType] = {};
        }

        // 倍率を取得（multiplier 優先、なければ value から計算）
        var mult = 1.0;
        if (typeof eff.multiplier === 'number') {
          mult = eff.multiplier;
        } else if (typeof eff.value === 'number') {
          // value が 1, 0, -1, -2 みたいな場合は、必要ならここで変換してもOK
          mult = pokemonUtil.normalizeMultiplier(eff.value) || 1.0;
        }

        chart[atkType][defType] = mult;
      });
    });

    return chart;
  })();

  var chartKeys = defenseChart ? Object.keys(defenseChart).length : 0;
  console.log('[rc] start defJa=', defenderTypesJa,
              'defEn=', defenderTypesEn,
              'dataset=', pokemonDataset.length,
              'chartKeys=', chartKeys);

  var chartKeys = defenseChart ? Object.keys(defenseChart).length : 0;

  console.log('[rc] start defJa=', defenderTypesJa,
              'defEn=', defenderTypesEn,
              'dataset=', pokemonDataset.length,
              'chartKeys=', chartKeys);

  // ============================
  // 3. 内部ヘルパー
  // ============================
  var multCache = new Map();

  function getMultVsDefenders(atkTypeEn) {
    if (!atkTypeEn) return 1.0;

    atkTypeEn = String(atkTypeEn).toLowerCase();

    var cacheKey = atkTypeEn + '>' + defenderTypesEn.join(',');
    if (multCache.has(cacheKey)) {
      return multCache.get(cacheKey);
    }

    var mult = 1.0;

    defenderTypesEn.forEach(function (defTypeEn) {
      if (!defTypeEn) return;
      defTypeEn = String(defTypeEn).toLowerCase();

      var raw = 1.0;

      if (defenseChart &&
          defenseChart[atkTypeEn] &&
          defenseChart[atkTypeEn][defTypeEn] != null) {
        raw = defenseChart[atkTypeEn][defTypeEn];
      }

      var v = pokemonUtil.normalizeMultiplier(raw) || 1.0;
      mult *= v;
    });

    multCache.set(cacheKey, mult);
    return mult;
  }

  function filterSEMoves(moves) {
    if (!Array.isArray(moves)) return [];

    return moves.reduce(function (acc, m) {
      if (!m || !m.typeEn) return acc;

      var atkTypeEn = String(m.typeEn).toLowerCase();
      var mult = getMultVsDefenders(atkTypeEn);

      // 必要ならコメントアウト外す
      console.log('[SE check]', m.nameJa, atkTypeEn, '→', mult);

      m._multVsDef = mult;

      if (mult > 1.01) {
        acc.push(m);
      }
      return acc;
    }, []);
  }

  function calcMoveScore(m) {
    if (!m) return 0;
    var power = m.power || m.basePower || 0;
    var mult = m._multVsDef || 1.0;
    return power * mult;
  }

  function getAttackStat(data) {
    if (!data) return 0;
    if (data.goStats && data.goStats.attack) return data.goStats.attack;
    if (data.baseStats && data.baseStats.attack) return data.baseStats.attack;
    return 0;
  }

  function getBST(data) {
    if (!data) return 0;
    return pokemonUtil.totalBase(data);
  }

  // ============================
  // 4. メインループ
  // ============================
  var results = [];
  var debugSeen = 0;

  for (var i = 0; i < pokemonDataset.length; i++) {
    var data = pokemonDataset[i];
    if (!data) continue;

    var movesObj = data.moves || {};
    var normalAll = movesObj.normal || [];
    var specialAll = movesObj.special || [];

    if (debugSeen < 5) {
      console.log('[rc] data', data.id || data.no || ('idx_' + i),
                  data.nameJa, 'nm=', normalAll.length, 'sp=', specialAll.length);
      debugSeen++;
    }

    var seNormal = filterSEMoves(normalAll);
    var seSpecial = filterSEMoves(specialAll);

    if (!seNormal.length && !seSpecial.length) {
      continue;
    }

    var bestMoveScore = 0;
    var bestMoves = [];
    var candMoves = seNormal.concat(seSpecial);

    for (var j = 0; j < candMoves.length; j++) {
      var mv = candMoves[j];
      var score = calcMoveScore(mv);

      if (score > bestMoveScore) {
        bestMoveScore = score;
        bestMoves = [mv];
      } else if (Math.abs(score - bestMoveScore) < 0.0001) {
        bestMoves.push(mv);
      }
    }

    if (!bestMoveScore) continue;

    var atk = getAttackStat(data);
    if (!atk) continue;

    var pokemonScore = bestMoveScore * atk;
    var bst = getBST(data);

    results.push({
      id: data.id,
      no: data.no,
      nameJa: data.nameJa,
      nameEn: data.nameEn,
      typesJa: data.typesJa,
      typesEn: data.typesEn,
      goStats: data.goStats,
      baseStats: data.baseStats,
      moves: {
        normal: seNormal,
        special: seSpecial
      },
      score: pokemonScore,
      attack: atk,
      bst: bst
    });
  }

  console.log('[rc] loop done: results=', results.length);

  // ============================
  // 5. 並び替え＆limit
  // ============================
  results.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.attack !== a.attack) return b.attack - a.attack;
    return (b.bst || 0) - (a.bst || 0);
  });

  if (limit > 0 && results.length > limit) {
    results.length = limit;
  }

  console.log('[rc] return', results.length);
  return results;
},
    
    renderRecommendations: function($wrap, jsonOrOptions){
      // jQuery 判定はややこしいので、素直に $() に通す
      const $w = $($wrap);
      console.log('[renderRecommendations] wrap length =', $w.length, 'arg =', jsonOrOptions);
      if (!$w.length) return;

      // ============================
      // 1. 第2引数を判定
      // ============================
      let list = [];

      if (Array.isArray(jsonOrOptions)) {
        // 旧仕様：すでに配列が渡されている場合はそのまま使う
        list = jsonOrOptions;
      } else if (jsonOrOptions && typeof jsonOrOptions === 'object') {
        // 新仕様：options を渡された場合はここで recommendCounters を実行
        list = typeChecker.recommend.recommendCounters(jsonOrOptions) || [];
        console.log('[renderRecommendations] list length =', list.length);
      }

      if (!Array.isArray(list) || list.length === 0) {
        $w.empty();
        return;
      }

      // ============================
      // 2. 描画
      // ============================
      let html = '';

      for (let i = 0; i < list.length; i++) {
        const d = list[i] || {};
        const img = pokemonUtil.getImageUrlByNo(d.id);
        const typesJa = Array.isArray(d.typesJa) ? d.typesJa : [];
        const typesEn = Array.isArray(d.typesEn) ? d.typesEn : [];

        // タイプバッジ（複数タイプを“加算”して並べる）
        let typeHtml = '';
        for (let j = 0; j < Math.max(typesJa.length, typesEn.length); j++) {
          const ja = typesJa[j] || '';
          const en = (typesEn[j] || '').toString().toLowerCase();
          if (!ja) continue;
          typeHtml += `
            <div class="badge">
              <span class="icon icon-type-${en}"></span>${ja}
            </div>`;
        }

        // 技リスト（こうかばつぐんのみが入っている想定）
        const buildMoveDL = (label, moves) => {
          if (!Array.isArray(moves) || moves.length === 0) return '';
          const items = moves.map(m => {
            const typeEn = (m.typeEn || '').toString().toLowerCase();
            return `
              <dd class="pokemon-recommend-list-item-atack-name">
                <span class="icon icon-type-${typeEn}"></span>${m.nameJa || m.nameEn || '-'}</span>
              </dd>`;
          }).join('');
          return `
            <dl class="pokemon-recommend-list-item-atack">
              <dt class="pokemon-recommend-list-item-atack-label">${label}</dt>
              ${items}
            </dl>`;
        };

        // ゲージ画像（暫定）
        const gaugeImg = (function(){
          const bars = Number(d.gaugeBars || 0);
          const src = (bars >= 3) ? 'img/gauge_3.png'
                  : (bars === 2) ? 'img/gauge_2.png'
                  : (bars === 1) ? 'img/gauge_1.png'
                  : 'img/gauge_0.png';
          return `<img class="pokemon-recommend-gauge" src="${src}" alt="effect gauge" decoding="async" loading="lazy">`;
        })();

        html += `
          <li class="pokemon-recommend-list-item js_toggle-wrapper">
            <div class="pokemon-recommend-list-item-header js_pokemon-recommend-list-item-header">
              <div class="pokemon-info-wrapper">
                <div class="pokemon-info-img">
                  <img src="${img}" decoding="async" loading="lazy" alt="${d.nameJa || '-'}">
                </div>
                <div class="pokemon-info-name">${d.nameJa || '-'}</div>
                <div class="pokemon-info-type">${typeHtml}</div>
                <div class="pokemon-info-gauge">${gaugeImg}</div>
              </div>
              <a href="" class="js_toggle-trigger"></a>
            </div>
            <div class="js_toggle-content">
              <dl class="pokemon-recommend-info-score">
                <dt class="pokemon-recommend-info-score-label">種族値(GO)</dt>
                <dd class="pokemon-recommend-info-score-value">
                  <ul class="pokemon-recommend-info-score-list">
                    <li class="pokemon-recommend-info-score-list-item">
                      こうげき <span class="num">${d.goStats?.attack ?? '-'}</span>
                    </li>
                    <li class="pokemon-recommend-info-score-list-item">
                      ぼうぎょ <span class="num">${d.goStats?.defense ?? '-'}</span>
                    </li>
                    <li class="pokemon-recommend-info-score-list-item">
                      HP <span class="num">${d.goStats?.stamina ?? '-'}</span>
                    </li>
                  </ul>
                </dd>
              </dl>
              <div class="pokemon-recommend-list-item-atack-wrapper">
                ${buildMoveDL('ノーマル',  d.moves?.normal  || [])}
                ${buildMoveDL('スペシャル', d.moves?.special || [])}
              </div>
            </div>
          </li>`;
      }

      // ループの外で一気に反映
      $w.html(html);
      console.log('[renderRecommendations] html length =', html.length);
    },

    // ===== 内部ユーティリティ =====
    _findDefenseRow: function(defJa, defenseChart){
      const chart = Array.isArray(defenseChart) ? defenseChart : (window.__TYPE_DEFENSE_TABLE__ || []);
      const defEn = pokemonUtil.translateTypes.toEnType(defJa);
      if (!defEn) return null;
      const key = defEn.toLowerCase();
      return chart.find(r => (r.type || '').toLowerCase() === key) || null;
    },

    _normalizeMultiplier: function(e){
      // e.value / e.mult / e.multiplier のどれでもOKにする
      if (pokemonUtil && typeof pokemonUtil.normalizeMultiplier === 'function') {
        return pokemonUtil.normalizeMultiplier(e);
      }
      // フォールバック（-2..1 or 0/0.5/1/1.6/2.56系にも耐える）
      if (e == null) return 1.0;
      if (e.value != null) {
        // value: -2,-1,0,1 を GO係数にマップする最低限のフォールバック
        const map = { '-2': 0.390625, '-1': 0.625, '0': 1.0, '1': 1.6 };
        const v = String(e.value);
        return map[v] ?? 1.0;
      }
      if (e.mult != null) {
        const x = Number(String(e.mult).replace(/[^\d.]/g, ''));
        return Number.isFinite(x) && x > 0 ? x : 1.0;
      }
      if (e.multiplier != null) {
        const y = Number(e.multiplier);
        return Number.isFinite(y) && y > 0 ? y : 1.0;
      }
      return 1.0;
    },

    _multFor: function(typeEn, defenderTypesJa, defenseChart){
      // 可能なら pokemonUtil.multFor を使用（単一の正準ルート）
      if (pokemonUtil && typeof pokemonUtil.multFor === 'function') {
        return pokemonUtil.multFor(String(typeEn).toLowerCase(), defenderTypesJa, defenseChart);
      }
      // フォールバック（ローカル実装）
      const chart = Array.isArray(defenseChart) ? defenseChart : (window.__TYPE_DEFENSE_TABLE__ || []);
      const atk = String(typeEn || '').toLowerCase();
      if (!atk) return 1.0;

      let mult = 1.0, EPS = 1e-9;
      defenderTypesJa.forEach(defJa => {
        const row = typeChecker.recommend._findDefenseRow(defJa, chart);
        if (!row || !Array.isArray(row.effect)) return;
        const ef = row.effect.find(e => (e.type || '').toLowerCase() === atk);
        if (!ef) return;
        const m = typeChecker.recommend._normalizeMultiplier(ef);
        mult *= (Number.isFinite(m) && m > EPS) ? m : 1.0;
      });
      return mult;
    },

    _getMetaForPokemon: function(p){
      // window.__POKEMON_GO_META__ から p の no / pokemonId / speciesId で拾う想定
      const META = window.__POKEMON_GO_META__ || [];
      const no = p.no ?? p.id ?? p.dex ?? p.pokedex_id ?? null;
      const sp = (p.speciesId || p.pokemonId || p.pokemon_id || '').toString().toUpperCase();
      if (no != null) {
        const hit = META.find(x => Number(x.no) === Number(no));
        if (hit) return hit;
      }
      if (sp) {
        const hit = META.find(x => String(x.pokemonId).toUpperCase() === sp);
        if (hit) return hit;
      }
      return null;
    },

    _getMovesForPokemon: function(id, meta){
      // meta.moves か moves_master_localized から名前解決して {normal:[], special:[]} で返す
      const mm = window.__MOVES_MASTER_LOCALIZED__ || [];
      const resolve = (moveId) => {
        const m = mm.find(x => x.id === moveId) || {};
        return {
          id: moveId,
          nameJa: m.nameJa || m.name || '',
          nameEn: m.nameEn || '',
          typeEn: (m.type || m.pokemonType || '').toString().toLowerCase(),
          power:  m.power ?? m.powerPvP ?? null,
          energy: m.energyDelta ?? m.energy ?? null,
          turns:  m.turns ?? null
        };
      };

      // meta が無いときは空で返す（呼び出し側で除外される）
      const fast    = (meta?.moves?.quick     || meta?.fastMoves     || []).map(resolve);
      const charged = (meta?.moves?.cinematic || meta?.chargedMoves  || []).map(resolve);
      return { normal: fast, special: charged };
    },

    _pickGoStats: function(meta, p){
      // GOがなければ本家から近似（fallback）
      if (meta && meta.stats) {
        return {
          stamina: meta.stats.stamina ?? meta.stats.hp ?? null,
          attack:  meta.stats.attack  ?? meta.stats.atk ?? null,
          defense: meta.stats.defence ?? meta.stats.defense ?? meta.stats.def ?? null
        };
      }
      const s = p?.stats || p?.baseStats || {};
      return {
        stamina: s.hp ?? null,
        attack:  (s.attack ?? s.atk ?? null),
        defense: (s.defence ?? s.defense ?? s.def ?? null)
      };
    },

    // === ヘルパー: 並び替え用スコア ===
    // ・基本は「(技威力 × 倍率) の最大値 × 攻撃種族値」
    // ・威力が無ければ倍率のみ、攻撃種族値が無ければ 1 を掛ける
    calcScore : function(poke, defenderTypesJa, defenseChart){
      const atk = (poke.goStats && poke.goStats.attack) || (poke.baseStats && poke.baseStats.atk) || 1;
      const movesAll = [
        ...((poke.moves && Array.isArray(poke.moves.normal))  ? poke.moves.normal  : []),
        ...((poke.moves && Array.isArray(poke.moves.special)) ? poke.moves.special : [])
      ];
      let best = 0;
      movesAll.forEach(m => {
        const tEn  = m.typeEn || m.type || '';
        const pow  = Number(m.power ?? m.powerPvP ?? 0);
        const mult = typeChecker.recommend.getMultiplierVsDefenders(tEn, defenderTypesJa, defenseChart);
        const s = (pow > 0 ? pow : 1) * mult;   // 威力が無いデータは倍率のみ評価
        if (s > best) best = s;
      });
      return best * atk;
    },

  },
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
