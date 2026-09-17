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
}
const filter = {
  wrapper : '.js_filter',
  trigger : '.js_filter-trigger',
  overlay : '.js_filter-overlay',
  isOpenedClassName : 'is_opened',
  isFilterOpenedClassName : 'is_filter-opened',

  ini : function() {
    $(document).off('click.filterTrigger').on('click.filterTrigger', filter.trigger, function(e) {
      e.preventDefault();
      const $btn = $(this);
      if (!$btn.closest(filter.wrapper).length) {
        filter.open();
        return;
      }
      if ($(filter.wrapper).hasClass(filter.isOpenedClassName)) {
        filter.close();
      } else {
        filter.open();
      }
    });
    $(filter.overlay).off('click.filterOverlay').on('click.filterOverlay', function() {
      filter.close();
    });
  },

  open : function() {
    $(filter.wrapper).addClass(filter.isOpenedClassName);
    $('body').addClass(filter.isFilterOpenedClassName);
  },

  close : function() {
    const $sheet = $(filter.wrapper);
    $sheet.removeClass(filter.isOpenedClassName);
    $('body').removeClass(filter.isFilterOpenedClassName);
    $sheet.scrollTop(0);
  },
}


const matchup = {
  MULT : { dbl: 1.6, half: 0.625, zero: 0.39 }, // 単タイプ時の係数
  EPS : 0.01,

  bucket : function(mult) {
    if (Math.abs(mult - (matchup.MULT.dbl * matchup.MULT.dbl)) < matchup.EPS) return 'x2win';     // 2.56
    if (Math.abs(mult - matchup.MULT.dbl) < matchup.EPS)               return 'x1win';     // 1.6
    if (Math.abs(mult - 1.0) < matchup.EPS)                    return 'even';      // 1.0
    if (Math.abs(mult - matchup.MULT.half) < matchup.EPS)              return 'x1lose';    // 0.625
    if (Math.abs(mult - matchup.MULT.zero) < matchup.EPS)              return 'x2lose';    // 0.39
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
    emptyClassName : 'is_empty',
    syncEmptyClass : function() {
      const empty = $(matchup.getType.checkbox).filter(':checked').length === 0;
      $('body').toggleClass(matchup.getType.emptyClassName, empty);
    },
    ini : function(typeData) {
      $(document).off('change.pokemonType');
      $(document).on(
        'change.pokemonType',
        matchup.getType.checkbox,
        function() {
          const _this = $(this);
          matchup.getType.check(typeData, _this);
          if (typeof matchup.searchPokemon.openList === 'function') {
            matchup.searchPokemon.openList();
          }

        }
      );
      matchup.getType.syncEmptyClass();
    },
    check : function(typeData, btn) {
      const effectWrap = $(matchup.getType.effect);
      const effect5    = $(matchup.getType.effect5);   // こうかばつぐん×2（2.56）
      const effect4    = $(matchup.getType.effect4);   // こうかばつぐん（1.6）
      const effect3    = $(matchup.getType.effect3);   // こうかふつう（1.0）
      const effect2    = $(matchup.getType.effect2);   // こうかいまひとつ（0.625）
      const effect1    = $(matchup.getType.effect1);   // こうかいまひとつ×2（0.39）

      const TABLE = Array.isArray(typeData)
        ? typeData
        : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

      // 現在選択中の“受ける側タイプ”（0〜2）※ value は英名 'fire' など
      const checked = $(matchup.getType.checkbox)
        .filter(':checked')
        .map(function(){ return $(this).val(); })
        .get();

      // 0個 → 全クリア（相性表示・リスト・おすすめ）
      if (checked.length === 0) {
        matchup.getType.clear(); // ★ ここでおすすめリストも空にしている想定
        matchup.getType.syncEmptyClass();
        return;
      }

      // 3個以上はガード
      if (checked.length > 2) {
        matchup.getType.error();
        btn.prop('checked', false);
        return;
      }

      // --- 相性表の描画 --------------------
      effectWrap.empty();
      effect1.empty(); effect2.empty(); effect3.empty(); effect4.empty(); effect5.empty();

      const attackTypes = matchup.getType.typeName.slice();   // ['normal','fire',...]
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
          <li data-type="${t}">
            <span class="icon-type icon-type-${t}"></span>${ja} 
          </li>
          `;

        switch (matchup.bucket(mult)) {
          case 'x2win':  effect5.append(html); break; // 2.56
          case 'x1win':  effect4.append(html); break; // 1.6
          case 'x1lose': effect2.append(html); break; // 0.625
          case 'x2lose': effect1.append(html); break; // 0.39
          default:       effect3.append(html); break; // 1.0
        }
      });

      // --- ポケモン一覧のフィルタ（今まで通り） --------------------
      matchup.searchPokemon.clear(window.__pokemonListData || []);
      const searchWrapper = $(matchup.searchPokemon.wrapper);
      const pokemonList   = searchWrapper.find(matchup.searchPokemon.pokemonList);
      if ($('.js_list-html').length) {
        pokemonList.html($('.js_list-html').html());
      }
      const selectedJa = (typeof matchup.searchPokemon.getSelectedTypesJa === 'function')
        ? matchup.searchPokemon.getSelectedTypesJa()
        : [];

      // リストの絞り込みだけ rAF で（ここは元の挙動をキープ）
      requestAnimationFrame(() => {
        matchup.getType._filterListByTypesJa(selectedJa);
      });

      // --- ★ 対策おすすめリストの更新（ここだけでやる） --------------------
      try {
        const defenderTypesJa = checked
          .map(function(en){ return pokemonUtil.translate.EtoJ(en); })
          .filter(Boolean);


        const POK_NOW =
          (pokemonUtil?.data?.get('POKEMON_DATA')) || window.__POKEMON_DATA__ || [];

        const DEF_NOW = Array.isArray(TABLE)
          ? TABLE
          : ((pokemonUtil?.data?.get('TYPE_DEFENSE')) || window.__TYPE_DEFENSE_TABLE__ || []);

        const recList = matchup.recommend.recommendCounters({
          defenderTypesJa: defenderTypesJa,
          pokemonDataset : POK_NOW,
          defenseChart   : DEF_NOW,
          limit          : 20
        }) || [];

        // ★ 実際に描画させる
        matchup.recommend.renderRecommendations(recList);
      } catch (err) {
        console.error('[getType.check] recommend error:', err);
      }
      matchup.getType.syncEmptyClass();
    },

    clear : function() {
      const effect = $(matchup.getType.effect);
      effect.empty();
    },
    error : function() {
      const msg = $(matchup.getType.errMsg);
      msg.fadeIn(300);
      setTimeout(function() {
        msg.fadeOut(1000);
      }, 1000);
    },
    // タイプフィルタ（AND / OR対応版）
    _filterListByTypesJa : function(selected){
      const mode = matchup.searchPokemon.getAndOrMode(); // ← AND / OR読み取り
      const list = $(matchup.searchPokemon.pokemonList).find('li');

      // タイプ未選択 → 全表示
      if (!selected || !selected.length){
        list.show();
        return;
      }

      list.each(function(){
        const types = ($(this).find('a').data('types-ja') || '').split(',');

        let ok = false;

        if (mode === 'and'){
          // 🔹 AND：選んだタイプすべてを持つ個体のみ表示
          ok = selected.every(t => types.includes(t));
        } else {
          // 🔹 OR：どれか1つでも合えば表示
          ok = selected.some(t => types.includes(t));
        }

        $(this).toggle(ok);
      });
    },
  },
  searchPokemon : {
    wrapper : '.js_pokemon-search',
    pokemonList : '.js_pokemon-search-list',
    typeList : '.js_pokemon-type-list',
    textbox : '.js_pokemon-search-input',
    checkbox : '[name="pokemon-type"]',
    recommendList : ('.js_pokemon-info-list'),
    isActiveClassName : 'is_active',
    resetBtn : '.js_reset',
    clearBtn : '.js_search-clear',
    selectedArea : '.js_pokemon-search-result',      // 追加：選択結果の描画先
    radioAndOr : 'input[name="and_or"]',
    cacheData : [],                                  // 追加：iniで受け取ったデータを保持（リセット再構築用）
    _dataset : [],                                   // 追加：検索用データセット（no+form 重複排除済み）
    typeName : [
      'normal','fire','water','grass','electric','ice','fighting','poison','ground',
      'flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
    ],
    typeNameJa : [
      'ノーマル','ほのお','みず','くさ','でんき','こおり','かくとう','どく','じめん',
      'ひこう','エスパー','むし','いわ','ゴースト','ドラゴン','あく','はがね','フェアリー'
    ],

    ini : function(data) {
      const srcArray =
        Array.isArray(data) ? data
        : (data && Array.isArray(data.list)) ? data.list
        : [];

      // attachGoStats は「1件ずつ」処理する関数なので map で回す
      const srcWithGo = (pokemonUtil.attachGoStats)
        ? srcArray.map(function(p) {
            return pokemonUtil.attachGoStats(p);
          })
        : srcArray;

      // ★ 検索用データセットを no + '|' + form で重複排除して構築
      const filtered = matchup.searchPokemon.buildDataset(srcWithGo);
      this.cacheData = filtered;
      this._dataset  = filtered;

      // ポケモン一覧の再構築は filtered を元に 1 回だけ行う
      matchup.searchPokemon.clear(filtered);

      const wrapper     = $(matchup.searchPokemon.wrapper);
      const textbox     = wrapper.find(matchup.searchPokemon.textbox);
      const pokemonList = wrapper.find(matchup.searchPokemon.pokemonList);
      const checkbox    = $(matchup.getType.checkbox);
      const resetBtn    = $(matchup.searchPokemon.resetBtn);
      const clearBtn    = $(matchup.searchPokemon.clearBtn);

      // ====== リスト開閉ヘルパ ======
      let blurTimer = null;

      function openList() {
        if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
        // wrapper.addClass(matchup.searchPokemon.isActiveClassName);

        // リストが空なら復元
        if (pokemonList.find('li').length === 0 && $('.js_list-html').length) {
          pokemonList.html($('.js_list-html').html());
          pokemonList.find('li').show();
        }
      }

      function closeList() {
        if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
        wrapper.removeClass(matchup.searchPokemon.isActiveClassName);
      }

      // 他の処理からも呼べるように公開
      matchup.searchPokemon.openList  = openList;
      matchup.searchPokemon.closeList = closeList;

      // 初回キャッシュ作成
      if ($('.js_list-html').length === 0) {
        $('body').append('<ul class="js_list-html" style="display:none;"></ul>\n');
        $('.js_list-html').html(pokemonList.html());
      }

      // ====== フォーカス・ブラー制御 ======
      const activeClass = matchup.searchPokemon.isActiveClassName;
      let justFocused = false; // フォーカス直後かどうか判定するフラグ

      textbox.off('focus click')
        // フォーカス時：必ず開く（キーボード操作にも対応）
        .on('focus', function() {
          if (blurTimer) {
            clearTimeout(blurTimer);
            blurTimer = null;
          }

          // フォーカス直後の「1回目の click」は無視したいのでフラグを立てる
          justFocused = true;
          setTimeout(function() {
            justFocused = false;
          }, 0);

          // 一覧を開く
          wrapper.addClass(activeClass);

          // リストが空なら復元
          if (pokemonList.find('li').length === 0 && $('.js_list-html').length) {
            pokemonList.html($('.js_list-html').html());
            pokemonList.find('li').show();
          }
        })
        // クリック時：トグル。ただし「フォーカス直後の1クリック目」は無視
        .on('click', function() {
          if (blurTimer) {
            clearTimeout(blurTimer);
            blurTimer = null;
          }

          // 最初のクリック（focus 直後）は無視して、2回目からトグルに使う
          if (justFocused) return;

          if (wrapper.hasClass(activeClass)) {
            // 開いている → 閉じる
            wrapper.removeClass(activeClass);
          } else {
            // 閉じている → 開く
            wrapper.addClass(activeClass);

            // リストが空なら復元
            if (pokemonList.find('li').length === 0 && $('.js_list-html').length) {
              pokemonList.html($('.js_list-html').html());
              pokemonList.find('li').show();
            }
          }
        });

      textbox.off('blur').on('blur', function() {
        blurTimer = setTimeout(function() {
          wrapper.removeClass(activeClass);
          blurTimer = null;
        }, 120);
      });

      // ====== 入力で絞り込み ======
      let composing = false;
      textbox.on('compositionstart', function(){ composing = true; });
      textbox.on('compositionend',  function(){ composing = false; textbox.trigger('keyup'); });

      textbox.off('keyup change').on('keyup change', function() {
        if (composing) return;

        if (textbox.is(':focus')) {
          openList(); // ← ここで直接クラス付与する代わりに openList() 呼び出し
        }

        const keywordRaw = $(this).val();
        const keyword = pokemonUtil.translate.katakana(String(keywordRaw).trim());

        // 毎回全件復元してからフィルタ
        if ($('.js_list-html').length) {
          pokemonList.html($('.js_list-html').html());
        }

        if (keyword === '') {
          pokemonList.find('li').show();
          if (matchup.getType?.clear) matchup.getType.clear();
          checkbox.each(function(){ $(this).prop('checked', false); });
          clearBtn.hide();

          // 入力が空になったら選択カードも削除
          matchup.searchPokemon.clearSelected();
          matchup.getType.syncEmptyClass();
          return;
        }

        pokemonList.find('li').each(function() {
          const text = $(this).text();
          $(this).toggle(text.indexOf(keyword) > -1);
        });
        clearBtn.show();
      });

      // ====== 枠外タップで一覧を閉じる ======
      $(document)
        .off('pointerdown.pokemonSearchOutside')
        .on('pointerdown.pokemonSearchOutside', function(e) {
          const $target  = $(e.target);
          const $wrapper = $(matchup.searchPokemon.wrapper);
          if (!$wrapper.length) return;

          // ラッパー内をタップしたときは何もしない
          if ($target.closest(matchup.searchPokemon.wrapper).length) {
            return;
          }

          // ラッパー外をタップしたら一覧を閉じる
          closeList();
        });

      // ====== リスト選択（pointer 系） ======
      (function() {
        let startX = 0;
        let startY = 0;
        let moved  = false;
        let isTouchPointer = false;
        let activeEl = null;
        const MOVE_THRESHOLD = 6; // px：これより動いたら「スクロール」とみなす

        $(document)
          .off('.pokemonList')
          .on('pointerdown.pokemonList', '.js_pokemon-search-list a', function(e) {
            const ev = e.originalEvent || e;
            const pointerType = ev.pointerType || '';

            const isTouchLike =
              pointerType === 'touch' ||
              pointerType === 'pen';

            // マウス操作は従来どおり「押した瞬間に選択」でOK
            if (!isTouchLike) {
              return matchup.searchPokemon.handlePick.call(this, e);
            }

            // タッチ操作の場合は「タップ or スクロール」を判定
            isTouchPointer = true;
            activeEl = this;
            startX = ev.clientX;
            startY = ev.clientY;
            moved  = false;
          })
          .on('pointermove.pokemonList', function(e) {
            if (!isTouchPointer) return;
            const ev = e.originalEvent || e;

            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
              moved = true; // ある程度動いたらスクロール扱い
            }
          })
          .on('pointerup.pokemonList pointercancel.pokemonList', function(e) {
            if (!isTouchPointer) return;

            if (!moved && activeEl) {
              // ほとんど動かなかった → タップとして扱う
              matchup.searchPokemon.handlePick.call(activeEl, e);
            }

            // リセット
            isTouchPointer = false;
            activeEl = null;
          });
      })();

      $(document).on('change', matchup.searchPokemon.radioAndOr, function(){
        const sel = matchup.searchPokemon.getSelectedTypesJa();
        matchup.getType._filterListByTypesJa(sel);
      });

      // ====== リセット ======
      resetBtn.off('click').on('click', matchup.searchPokemon.handleReset);
    },

    clearSelected : function(){
      $(this.selectedArea).empty();
      $(matchup.searchPokemon.recommendList).empty();
    },

    // ========== リスト項目 → pokeオブジェクトの正規化 ==========
    normalizeFromAnchor : function($a){
      // 表示名・タイプ
      const nameJa   = $a.text();
      const typesStr = $a.data('types-ja') ?? $a.attr('data-types-ja');
      const typesJa  = String(typesStr || '').split(',').filter(Boolean);

      // 図鑑No
      const rawNo = ($a.data('no') != null) ? $a.data('no') : $a.attr('data-no');
      const no    = matchup.searchPokemon.normalizeId(rawNo);

      // ★ フォーム情報などを全部拾う
      const pid      = $a.attr('data-pid')      || null; // KYOGRE_TEMP_EVOLUTION_PRIMAL など
      const basePid  = $a.attr('data-basepid')  || null;
      const formKind = $a.attr('data-formkind') || null; // 'base' | 'mega' | 'primal' | 'region'
      const region   = $a.attr('data-region')   || null;
      const tempId   = $a.attr('data-tempid')   || $a.attr('data-tempevoid') || null;
      const form     = $a.attr('data-form')     || null;

      // フォーム識別用の内部オブジェクト
      const pd = {
        no,
        id: no,
        pokemonId: pid,
        basePokemonId: basePid,
        tempId,
        formId: tempId,
        form,
        formKind,
        region,
        nameJa,
        name: nameJa,
        typesJa,
        typesEn: Array.isArray(typesJa)
          ? typesJa.map(t => pokemonUtil.translateTypes?.toEnType?.(t) || '')
          : []
      };

      return {
        id    : no,
        no    : no,
        name  : nameJa,
        types : typesJa,
        form  : form,
        pokemonId     : pid,
        basePokemonId : basePid,
        region        : region,
        _raw  : pd   // 必要なら後で使えるように生データも持たせる
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
    handlePick : function(e) {
      e.preventDefault();
      const $a = $(this);

      // 1) 一覧の <a> から基本情報（pokemonId, form など）取得
      const lite = matchup.searchPokemon.normalizeFromAnchor($a) || {};

      const pickedNo   = lite.no != null ? lite.no : lite.id;
      const pickedForm = (lite.form != null ? lite.form : (lite._raw && lite._raw.form)) || '';

      // 2) getPokemonData に投げるためのクエリオブジェクトを組み立て
      //    → _raw をベースに、no / id / form などをトップレベルに出しておく
      const baseRaw = lite._raw || {};
      const query = Object.assign(
        {},
        baseRaw,
        {
          no   : pickedNo,
          id   : pickedNo,
          form : pickedForm,
          // 念のため pokemonId / basePokemonId / region も表に出す
          pokemonId     : lite.pokemonId     || baseRaw.pokemonId     || null,
          basePokemonId : lite.basePokemonId || baseRaw.basePokemonId || null,
          region        : lite.region        || baseRaw.region        || null,
          // 表示名／タイプも渡しておく（getPokemonData側で使わなくても害はない）
          nameJa : lite.name || baseRaw.nameJa || baseRaw.name || '',
          name   : lite.name || baseRaw.name   || baseRaw.nameJa || '',
          typesJa: lite.types || baseRaw.typesJa || baseRaw.types || []
        }
      );

      // 3) pokemonUtil.getPokemonData で GO メタ＋技入りのフルデータ取得
      let pd = null;
      if (typeof pokemonUtil.getPokemonData === 'function') {
        let pdArr = pokemonUtil.getPokemonData(query);
        pd = Array.isArray(pdArr) ? pdArr[0] : pdArr;
      }

      if (!pd) {
        console.warn('[handlePick] pokemonUtil.getPokemonData returned empty', query);
        return;
      }

      // 4) GO ステータスを付与（あれば）
      if (typeof pokemonUtil.attachGoStats === 'function') {
        pd = pokemonUtil.attachGoStats(pd) || pd;
      }

      // 5) 画面表示用に merge
      const poke = Object.assign({}, pd, lite);


      // 6) 1匹カード描画（種族値＋わざが利用できるはず）
      const $resultArea = $('.js_pokemon-search-result');
      pokemonCard.render(poke, $resultArea);

      // 7) タイプ選択チェックボックス反映（元の処理を維持）
      const typesJaSrc = poke.typesJa || poke.types;
      const typesJa = Array.isArray(typesJaSrc) ? typesJaSrc : [];

      if (typesJa.length) {
        if (typeof matchup.searchPokemon.select === 'function') {
          matchup.searchPokemon.select(typesJa);
        }
      } else {
        if (matchup.getType && typeof matchup.getType.clear === 'function') {
          matchup.getType.clear();
        }
        if (matchup.getType && matchup.getType.checkbox) {
          $(matchup.getType.checkbox).each(function () {
            $(this).prop('checked', false);
          });
        }
        matchup.getType.syncEmptyClass();
      }

      // 8) 検索テキストボックス更新（表示名は getDisplayNameJa 優先＋trim）
      const displayNameRaw = (typeof pokemonUtil.getDisplayNameJa === 'function')
        ? pokemonUtil.getDisplayNameJa(poke)
        : (poke.nameJa || poke.name || '');
      const displayName = String(displayNameRaw).trim();

      const $input = $(matchup.searchPokemon.textbox);
      if ($input.length) {
        $input.val(displayName);
      }
    },

    handleReset : function(){
      const wrapper       = $(matchup.searchPokemon.wrapper);
      const pokemonList   = wrapper.find(matchup.searchPokemon.pokemonList);
      const checkbox      = $(matchup.getType.checkbox);
      const clearBtn      = $(matchup.searchPokemon.clearBtn);
      const data          = matchup.searchPokemon.cacheData;

      pokemonList.empty();
      matchup.searchPokemon.clear(data);          // リスト再構築
      if (matchup.getType?.clear) matchup.getType.clear();
      checkbox.each(function(){ $(this).prop('checked', false); });
      wrapper.find(matchup.searchPokemon.textbox).val('');
      if (typeof matchup.searchPokemon.closeList === 'function') {
        matchup.searchPokemon.closeList();
      }
      matchup.getType._filterListByTypesJa([]);
      clearBtn.hide();

      // 選択カードをクリア
      matchup.searchPokemon.clearSelected();
      matchup.getType.syncEmptyClass();
    },

    classifyForm : function(p) {
      const formRaw = String(p.form || '');
      const f       = formRaw.toUpperCase();

      // 図鑑Noベースのキー
      const no = (p.no != null) ? p.no
                : (p.dex != null) ? p.dex
                : (p.pokedex_id != null) ? p.pokedex_id
                : null;
      // no がなければ pokemonId などで代用
      const speciesKey = (no != null) ? String(no)
                        : (p.speciesId || p.pokemonId || p.id || '').toString();

      // メガ / ゲンシ判定
      const isMega =
        p.isMegaEvolution === true ||
        /TEMP_EVOLUTION_MEGA/.test(f) ||
        /_MEGA(_[A-Z]+)?$/.test(f);

      const isPrimal = /PRIMAL/.test(f);

      // リージョンフォーム判定
      let region = null;
      if (/ALOLA|ALOLAN/.test(f)) {
        region = 'alola';
      } else if (/HISUI|HISUIAN/.test(f)) {
        region = 'hisui';
      } else if (/GALAR|GALARIAN/.test(f)) {
        region = 'galar';
      } else if (/PALDEA|PALDEAN/.test(f)) {
        region = 'paldea';
      }

      // 通常フォーム（空 or *_NORMAL or pokemonId と同名）
      const isBase =
        !formRaw ||
        /_NORMAL$/.test(f) ||
        f === String(p.pokemonId || '').toUpperCase();

      if (isMega) {
        // メガはフォームごとに別扱い
        return { kind: 'mega',   key: speciesKey + '|mega|'   + f, region: null };
      }
      if (isPrimal) {
        // ゲンシもフォームごと
        return { kind: 'primal', key: speciesKey + '|primal|' + f, region: null };
      }
      if (region) {
        // リージョンは地方ごとに1件
        return { kind: 'region', key: speciesKey + '|region|' + region, region: region };
      }
      if (isBase) {
        // 通常フォームは図鑑Noごとに1件
        return { kind: 'base',   key: speciesKey + '|base',   region: null };
      }

      // それ以外（コスチュームなど）は除外対象
      return { kind: 'other', key: speciesKey + '|other|' + f, region: null };
    },

    // ======== 新規：no + '|' + form で検索用データセット構築 ========
    // ======== no + '|' + form で検索用データセット構築 ========
    buildDataset : function(data) {
      const all  = Array.isArray(data) ? data : [];
      const seen = Object.create(null);
      const out  = [];

      all.forEach(function(pd) {
        if (!pd) return;

        const no = Number(pd.no || pd.id || 0);
        if (!no) return;

        const form = (pd.form || '').toString(); // 通常フォームは '' のまま

        // ★ ザシアン／ザマゼンタは「通常フォーム」を検索候補から除外
        //   → 英雄（れきせん）／けんのおう だけを出したい想定
        const pid = (pd.pokemonId || '').toString().toUpperCase();
        if (!form && (pid === 'ZACIAN' || pid === 'ZAMAZENTA')) {
          return;
        }

        const key  = no + '|' + form;

        if (seen[key]) return;
        seen[key] = true;

        out.push(pd);
      });

      return out;
    },

    select : function(arry) {
      const typeList = $(matchup.searchPokemon.typeList);
      const typeListItem = typeList.find('li');
      const checkbox = typeListItem.find(matchup.getType.checkbox);
      matchup.getType.clear();
      checkbox.each(function() {
        $(this).prop('checked', false);
      });
      if ( arry.length > 0 ) {
        const Jname = arry[0];
        for ( let i=0; i<typeListItem.length; i++ ) {
          const btn = typeListItem.eq(i).find(matchup.getType.checkbox);
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
          const btn = typeListItem.eq(i).find(matchup.getType.checkbox);
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
      const sel = matchup.getType.checkbox; // 例: 'input[name="pokemon-type"]'
      const nodes = document.querySelectorAll(sel + ':checked');
      const arr = Array.prototype.map.call(nodes, el => {
        const v = el.value || '';
        const jaFromEn = pokemonUtil.translateTypes.toJaType(v);
        return jaFromEn || v;
      });
      return arr;
    },

    getAndOrMode : function() {
      const v = $('input[name="and_or"]:checked').val();
      return (v === 'or') ? 'or' : 'and'; // ← デフォルトはAND
    },

    clear : function(list) {
      const pokemonList = $(matchup.searchPokemon.pokemonList);
      pokemonList.empty();

      (list || []).forEach(function(p) {
        const $li = $('<li class="pokemon-search-list-item">');
        const $a  = $('<a href="javascript:void(0);"></a>');

        // ★ 表示名は必ず getDisplayNameJa 経由
        const label = (pokemonUtil.getDisplayNameJa)
          ? pokemonUtil.getDisplayNameJa(p)
          : (p.labelJa || p.nameJa || p.name || '');

        const typesJa = Array.isArray(p.typesJa) ? p.typesJa : [];
        const iconsHtml = matchup.searchPokemon.buildTypeIcons(typesJa);

        $a.html(`
          <div class="pokemon-search-list-item-name">${label}</div>
          <div class="pokemon-search-list-item-type">
            ${iconsHtml}
          </div>
        `);

        $a.attr('data-no', p.no);
        if (Array.isArray(p.typesJa)) {
          $a.attr('data-types-ja', p.typesJa.join(','));
        }

        // フォーム識別に必要な情報も埋めておく
        if (p.pokemonId) {
          $a.attr('data-pid', p.pokemonId);
        }
        if (p.basePokemonId) {
          $a.attr('data-basepid', p.basePokemonId);
        }
        if (p.formKind) {
          $a.attr('data-formkind', p.formKind); // 'base' | 'mega' | 'primal' | 'region'
        }
        if (p.region) {
          $a.attr('data-region', p.region);     // 'alola' など
        }
        if (p.form) {
          $a.attr('data-form', p.form);         // '_MEGA_X' など
        }
        if (p.tempEvoId) {
          $a.attr('data-tempevoid', p.tempEvoId);
        }

        $li.append($a);
        pokemonList.append($li);
      });
    },

    buildTypeIcons : function(typesJaInput) {
      const typesJa = Array.isArray(typesJaInput) ? typesJaInput : [];
      if (!typesJa.length) return '';

      return typesJa.map(function(ja) {
        const en = (pokemonUtil.translateTypes?.toEnType?.(ja) || '').toLowerCase();
        if (!en) return '';
        return `<span class="icon-type icon-type-${en}"></span>`;
      }).join('');
    },

  },

  recommend : {
    buildDisplayPokemon: function(raw) {
      if (!raw) return null;

      // 元オブジェクトを壊さないようにコピー
      var p = Object.assign({}, raw);

      // ====== 名前まわり整形 ======
      var nameJa =
        p.labelJa ||
        p.nameJa ||
        p.name   ||
        p.nameEn ||
        '';

      // ====== タイプ（日本語） ======
      var typesJa = Array.isArray(p.typesJa)
        ? p.typesJa.slice()
        : [];

      // typesJa が無くて typesEn だけある場合は変換
      if (!typesJa.length && Array.isArray(p.typesEn) && pokemonUtil.translateTypes?.toJaType) {
        typesJa = p.typesEn
          .map(function(en) { return pokemonUtil.translateTypes.toJaType(en) || ''; })
          .filter(Boolean);
      }

      // ====== フォーム情報を補完（classifyForm を再利用） ======
      if (!p.formKind && matchup.searchPokemon && typeof matchup.searchPokemon.classifyForm === 'function') {
        var c = matchup.searchPokemon.classifyForm(p);
        p.formKind = p.formKind || c.kind;
        p.region   = p.region   || c.region;
      }

      // ★ リージョン表記を付与（アローラだけまず対応）
      if (p.region === 'ALOLA' && nameJa.indexOf('アローラ') === -1) {
        nameJa += '（アローラ）';
      }

      // ====== pokemonCard に渡す形へ正規化 ======
      return {
        id    : p.no || p.id || null,
        name  : nameJa,
        types : typesJa,
        _raw  : p   // デバッグや拡張用に元データも残しておく
      };
    },

    // =========================

    recommendCounters : function(options) {
      const defenderTypesJa = options?.defenderTypesJa || [];
      const pokemonDataset  = options?.pokemonDataset  || [];
      const defenseChart    = options?.defenseChart    ||
        (pokemonUtil?.data?.get('TYPE_DEFENSE') || window.__TYPE_DEFENSE_TABLE__ || []);
      const limit           = Number(options?.limit || 20);


      if (!defenderTypesJa.length || !Array.isArray(defenseChart)) {
        return [];
      }

      // ==== 攻撃 → ボス こうかばつぐん判定用（こちらのわざがボスへ） ====
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

      // ==== ステップ1: ボス → こちら（被ダメ倍率）計算用 ====

      // ボス側タイプ（英語）
      const bossTypesEn = defenderTypesJa
        .map(function(t){ return pokemonUtil.translate.JtoE(t); })
        .map(function(t){ return (t || '').toString().toLowerCase(); })
        .filter(Boolean);

      const calcBossDamage = function(defTypesEn) {
        if (!Array.isArray(defTypesEn) || !defTypesEn.length) return 1.0;
        if (!bossTypesEn.length) return 1.0;

        let total = 1.0;

        defTypesEn.forEach(function(defEnRaw){
          const defEn = (defEnRaw || '').toString().toLowerCase();
          if (!defEn) return;

          const row = defenseChart.find(function(r){
            return (r.type || '').toString().toLowerCase() === defEn;
          });
          if (!row || !Array.isArray(row.effect)) return;

          bossTypesEn.forEach(function(atkEn){
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
        });

        if (!Number.isFinite(total) || total <= 0) total = 1.0;
        return total;
      };

      // ==== ヘルパー：種族値（攻撃寄り）を 1 本のスコアにまとめる ====
      const baseTotalFromPd = function (pd) {
        if (!pd) return 0;

        // GO ステータス優先、なければ通常の baseStats
        const s = pd.goStats || pd.baseStats || {};
        const hp  = Number(s.stamina || s.hp      || 0);
        const atk = Number(s.attack  || 0);
        const def = Number(s.defense || s.defence || 0);

        // 攻撃を少し重めに見る
        const total = (atk * 1.5) + def + hp;

        if (!Number.isFinite(total) || total <= 0) return 0;
        return total;
      };

      // ---- 表示名のリージョン重複「（ヒスイ）（ヒスイ）」を1個に揃える ----
      const normalizeDisplayNameJa = function(label) {
        let s = String(label || '');

        // ① 同一括弧の重複を潰す
        s = s.replace(/(（[^）]+）)\1$/u, '$1');

        // ② 「ベース名（ベース名＋何か）」になっている場合、括弧内からベース名を引く
        // 例:
        //   キュレム（ブラックキュレム） → キュレム（ブラック）
        //   キュレム（ホワイトキュレム） → キュレム（ホワイト）
        s = s.replace(/^(.+?)（(.+?)\1）$/u, function(_, base, inner) {
          const trimmed = inner.replace(base, '').trim();
          return trimmed ? `${base}（${trimmed}）` : `${base}`;
        });

        return s;
      };

      // ==== メイン処理 ====

      const results = [];
      const eps = 1e-3;
      const isSE = function(mult) { return mult >= (1.6 - eps); }; // こうかばつぐんのみ

      const arr = Array.isArray(pokemonDataset) ? pokemonDataset : [pokemonDataset];

      arr.forEach(function(p) {
        const pdArr = pokemonUtil.getPokemonData(p);
        let pd      = Array.isArray(pdArr) ? pdArr[0] : pdArr;
        if (!pd || !pd.id) return;

        // GOステータスを上書き（あれば）
        if (pokemonUtil.attachGoStats) {
          pd = pokemonUtil.attachGoStats(pd) || pd;
        }

        const normalMoves  = (pd.moves && pd.moves.normal)  || [];
        const specialMoves = (pd.moves && pd.moves.special) || [];

        // ★ フォームからタイプ上書き（ガラル/アローラ等）
        const formKey      = pd.form || (pd._raw && pd._raw.form) || '';
        const formLabel    = FORM_LABEL_MAP[formKey] || '';
        const formOverride = TYPE_OVERRIDE_BY_FORM && TYPE_OVERRIDE_BY_FORM[formKey]
          ? TYPE_OVERRIDE_BY_FORM[formKey]
          : null;

        // ★ 攻撃側タイプ（STAB判定用）
        const attackerTypesEnBase = formOverride
          ? formOverride.typesEn
          : (pd.typesEn || []);

        const attackerTypesEn = (attackerTypesEnBase || [])
          .map(function(t){ return (t || '').toString().toLowerCase(); })
          .filter(Boolean);

        const seNormal  = [];
        const seSpecial = [];
        let bestMoveScore = 0;

        const getGaugeFactor = function(m) {
          if (!m) return 1.0;
          const energy = (typeof m.energy === 'number') ? m.energy : null;
          if (energy == null || energy >= 0) return 1.0;

          const abs = Math.abs(energy);

          if (abs >= 75) return 1.0;   // 1ゲージ
          if (abs >= 45) return 1.05;  // 2ゲージ
          return 1.15;                 // 3ゲージ
        };

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

          // ここではゲージ補正は入れず、純粋な火力だけを見る
          const moveScore = power * mult * stab;

          const move = $.extend({}, m, {
            mult      : mult,
            stab      : stab,
            moveScore : moveScore,
            category  : category
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

        // 技一覧は威力順にソート（降順）
        seNormal.sort(function(a, b) {
          return (b.moveScore || 0) - (a.moveScore || 0);
        });
        seSpecial.sort(function(a, b) {
          return (b.moveScore || 0) - (a.moveScore || 0);
        });

        // ===== ポケモン側の総合スコア =====
        const atkStat = Number(pd.goStats?.attack  ?? pd.baseStats?.attack  ?? 0);
        const defStat = Number(pd.goStats?.defense ?? pd.goStats?.defence ?? pd.baseStats?.defence ?? 0);
        const staStat = Number(pd.goStats?.stamina ?? pd.baseStats?.hp      ?? 0);

        // ★ 種族値の影響を大きくする
        //    ・攻撃 > 耐久 で評価
        //    ・平均的なアタッカーで statWeight ≒ 1.0
        //    ・トップクラスアタッカーで 1.5〜2.0 程度
        const OFF_REF  = 180; // 攻撃基準値
        const BULK_REF = 320; // (防御+HP) 基準値

        const atkFactor  = Math.max(0.5, Math.min(2.0, atkStat / OFF_REF));
        const bulkFactor = Math.max(0.5, Math.min(1.8, (defStat + staStat) / BULK_REF));

        // 攻撃7 : 耐久3 の比率で合成（攻撃寄りに振る）
        const statWeight = (atkFactor * 0.7) + (bulkFactor * 0.3);

        // ★ ボスからの被ダメ倍率を計算（弱点を持つ場合だけ軽くペナルティ）
        const defTypesEnForThisMon = Array.isArray(pd.typesEn)
          ? pd.typesEn.map(function(t){ return (t || '').toString().toLowerCase(); })
          : [];

        let bossDamageMult = calcBossDamage(defTypesEnForThisMon);
        if (!Number.isFinite(bossDamageMult) || bossDamageMult <= 0) {
          bossDamageMult = 1.0;
        }

        const DEF_POW   = 0.25;           // ← さらに緩めて、火力＆種族値優先に
        const adjMult   = Math.max(1.0, bossDamageMult);
        const defPenalty = Math.pow(adjMult, DEF_POW);

        // ★ 最終モンスコア：技火力 × 種族値ウェイト ÷ 防御ペナルティ
        const monScore = (bestMoveScore * statWeight) / (defPenalty || 1);

        // 表示用タイプ（日本語）は、上書きがあればそちら優先
        const typesJa = formOverride && Array.isArray(formOverride.typesJa) && formOverride.typesJa.length
          ? formOverride.typesJa.slice()
          : (Array.isArray(pd.typesJa) ? pd.typesJa.slice() : []);

        // ★ 表示名は「ビルド元の p ＋ pd」をマージして getDisplayNameJa に渡す
        //   pokemon_list 側の formLabelJa も含めて、検索側と同じルールで整形したい
        const baseForName = Object.assign({}, p, pd);

        const rawDisplayNameJa = (pokemonUtil && typeof pokemonUtil.getDisplayNameJa === 'function')
          ? pokemonUtil.getDisplayNameJa(baseForName)   // ★ baseForName を渡す
          : (baseForName.nameJa || baseForName.name || baseForName.nameJaLocalized || baseForName.nameEn || '');

        // 「クレベース（ヒスイ）（ヒスイ）」→「クレベース（ヒスイ）」のような二重括弧だけ潰す
        const displayNameJa = normalizeDisplayNameJa(rawDisplayNameJa);

        const rawNameJa =
          baseForName.nameJa ||
          baseForName.name ||
          baseForName.nameJaLocalized ||
          baseForName.nameEn ||
          '';

        // ★ ここ追加：図鑑No（種族単位のID）を決めておく
        const speciesNo = Number(
          pd.no ??
          pd.dex ??
          pd.pokedex_id ??
          pd.id ??
          0
        );
          
        results.push({
          id:        pd.id,
          no:        speciesNo,   // ★ 追加：重複判定用の図鑑No
          nameJa:    displayNameJa,
          rawNameJa: rawNameJa,
          nameEn:    pd.nameEn,
          typesJa:   pd.typesJa || [],
          typesEn:   pd.typesEn || [],

          form:       pd.form || '',
          pokemonId:  pd.pokemonId || '',
          templateId: pd.templateId || '',

          moves: {
            normal:  seNormal,
            special: seSpecial
          },
          goStats:      pd.goStats || {},
          baseTotal:    pd.baseTotal || 0,
          score:        monScore,
          maxMoveScore: bestMoveScore
        });
      });

      const finalList = results.slice();

      // スコア順に並べる
      finalList.sort(function(a, b){
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;

        // ① 総合スコア
        if (scoreB !== scoreA) return scoreB - scoreA;

        // ② 最大技火力
        const maxA = a.maxMoveScore || 0;
        const maxB = b.maxMoveScore || 0;
        if (maxB !== maxA) return maxB - maxA;

        // ③ 攻撃種族値
        const atkA = a.goStats?.attack || 0;
        const atkB = b.goStats?.attack || 0;
        if (atkB !== atkA) return atkB - atkA;

        // ④ 合計種族値
        return (b.baseTotal || 0) - (a.baseTotal || 0);
      });

      // ===== ここから下を「重複排除したほう」を使うように修正 =====

      const uniqueList = [];
      const seen = new Map(); // key: no|form|atk|def|sta|typesEn

      finalList.forEach(function(r) {
        const no   = r.no || r.id || 0;
        const atk  = r.goStats?.attack  || 0;
        const def  = r.goStats?.defense || 0;
        const sta  = r.goStats?.stamina || 0;
        const tEn  = Array.isArray(r.typesEn) ? r.typesEn.join('/') : '';

        // ★ 追加：フォームをキーに含める
        const formKey =
          r.form ||
          r.templateId ||
          r.pokemonId || '';   // どれか入っていれば十分

        const key  = [no, formKey, atk, def, sta, tEn].join('|');

        if (!seen.has(key)) {
          seen.set(key, uniqueList.length);
          uniqueList.push(r);
          return;
        }

        // ここから下の「prevHasForm / currHasForm」のロジックは、
        // そのまま残しておいて大丈夫です（実質ほぼ発火しなくなる）
        const idx   = seen.get(key);
        const prev  = uniqueList[idx];
        const prevHasForm = !!(prev.form || prev.templateId || (prev.pokemonId && String(prev.pokemonId).includes('_')));
        const currHasForm = !!(r.form   || r.templateId   || (r.pokemonId && String(r.pokemonId).includes('_')));

        if (prevHasForm && !currHasForm) return;

        if (currHasForm && !prevHasForm) {
          uniqueList[idx] = r;
          return;
        }
      });

      const sliced = uniqueList.slice(0, limit);

      // --------------------------------------------------
      // 以下は「★レーティング＋ゲージ」の処理（既存ロジック）
      // --------------------------------------------------

      // …この下（getGaugeFactorForRating 以降）はそのままでOK …

      // --------------------------------------------------
      // 以下は「★レーティング＋ゲージ」の処理（既存ロジック）
      // --------------------------------------------------

      const getGaugeFactorForRating = function(m) {
        if (!m) return 1.0;
        const energy = (typeof m.energy === 'number') ? m.energy : null;
        if (energy == null || energy >= 0) return 1.0;

        const abs = Math.abs(energy);
        if (abs >= 75) return 0.9;
        if (abs >= 45) return 1.0;
        return 1.2;
      };

      const SCORE_MIN = 50;
      const SCORE_MAX = 400;

      const clampScore = function (s) {
        const v = Number(s || 0);
        if (!Number.isFinite(v) || v <= 0) return SCORE_MIN;
        if (v < SCORE_MIN) return SCORE_MIN;
        if (v > SCORE_MAX) return SCORE_MAX;
        return v;
      };

      const toBaseRating = function (score) {
        const v = clampScore(score);
        const norm = (v - SCORE_MIN) / (SCORE_MAX - SCORE_MIN); // 0〜1
        let bucket = Math.round(norm * 4) + 1;                  // 1〜5
        if (bucket < 1) bucket = 1;
        if (bucket > 5) bucket = 5;
        return bucket;
      };

      const gaugeOffset = function (mv) {
        const energy = (typeof mv.energy === 'number') ? mv.energy : null;
        if (energy == null || energy >= 0) return 0;

        const abs = Math.abs(energy);

        if (abs >= 75) return -2; // 1ゲージ
        if (abs >= 45) return 0;  // 2ゲージ
        return +1;                // 3ゲージ
      };

      const resolveGaugeIdFromEnergy = function (mv) {
        if (mv.__gaugeSvgId) return mv.__gaugeSvgId;
        const energy = mv.energy;
        if (energy == null || energy >= 0) return '';

        const abs = Math.abs(energy);
        if (abs >= 75) return 'gauge1';
        if (abs >= 45) return 'gauge2';
        return 'gauge3';
      };

      // 各ポケモンのスペシャル技に評価を付与
      sliced.forEach(function (r) {
        const specials = (r.moves && Array.isArray(r.moves.special))
          ? r.moves.special
          : [];

        const atkStat = (r.goStats?.attack || r.baseStats?.attack || 0);
        const statFactorForRating = 0.6 + (atkStat / 500);

        let bestScore = -Infinity;
        let bestIndex = -1;

        specials.forEach(function (mv, idx) {
          const baseScoreRaw = Number(mv.moveScore || 0);
          if (!Number.isFinite(baseScoreRaw) || baseScoreRaw <= 0) return;

          const baseScore = baseScoreRaw * statFactorForRating;

          let rating = toBaseRating(baseScore);

          rating += gaugeOffset(mv);

          const isSE    = mv.mult != null && mv.mult >= 1.6;
          const hasStab = mv.stab != null && mv.stab > 1.0;

          if (isSE && hasStab) {
            rating += 1.5;
          } else if (isSE) {
            rating += 0.5;
          } else if (hasStab) {
            rating += 0.3;
          }

          if (isSE) {
            if (hasStab && rating < 3) {
              rating = 3;
            } else if (!hasStab && rating < 2) {
              rating = 2;
            }
          }

          rating = Math.round(rating);
          if (rating < 1) rating = 1;
          if (rating > 5) rating = 5;

          mv.__globalRating = rating;
          mv.__gaugeSvgId   = resolveGaugeIdFromEnergy(mv);

          if (baseScore > bestScore) {
            bestScore = baseScore;
            bestIndex = idx;
          }
        });

        if (bestIndex >= 0 && specials[bestIndex]) {
          specials[bestIndex].__isStrongest = true;
        }
      });

      return sliced;
    },
    
    // =========================
    // おすすめ一覧描画
    // =========================
    renderRecommendations : function (list) {
      try {
        const arr = Array.isArray(list) ? list.slice() : [];
        const $w  = $('.js_pokemon-info-list');


        if (!$w.length) return;

        $w.empty();

        if (!arr.length) {
          $w.append('<p class="pokemon-info-empty">おすすめのポケモンが見つかりません。</p>');
          return;
        }

        const h = [];

        arr.forEach(function (r, idx) {
          const html = pokemonCard.buildInfoItemHtml(r, {
            opened   : false, // 一覧は閉じた状態から
            showStars: true
          });
          h.push(html);
        });

        const htmlAll = h.join('');

        $w.html(htmlAll);

      } catch (err) {
        console.error('[renderRecommendations] error:', err);
      }
    },
  },
}

const toggleEffects = {
  wrapper : '.js_pokemon-type-effect',
  summery : '.js_pokemon-summery-wrapper',
  table : '.js_pokemon-table-wrapper',
  trigger : '.js_toggle-trigger',
  isOpenedClassName : 'is_opened',
  ini : function () {
    const wrapper = $(toggleEffects.wrapper);
    wrapper.each(function() {
      const _this = $(this);
      const summery = _this.find(toggleEffects.summery);
      const table = _this.find(toggleEffects.table);
      const trigger = _this.find(toggleEffects.trigger);
      trigger.on('click', function() {
        if ( _this.hasClass(toggleEffects.isOpenedClassName) ) {
          table.slideUp();
          summery.slideDown();
          _this.removeClass(toggleEffects.isOpenedClassName);
        } else {
          table.slideDown();
          summery.slideUp();
          _this.addClass(toggleEffects.isOpenedClassName);
        }
      });
    })
  }
}

$(function() {
  toggle.ini();
  filter.ini();
  toggleEffects.ini();
  pokemonUtil.data.onReady(state => {
    matchup.searchPokemon.ini(state.POKEMON_DATA);
    matchup.getType.ini();                 // 内部で TYPE_DEFENSE を参照するだけ
  });
});

$(window).on('load', function() {
  window.setTimeout(function() {
    filter.open();
  }, 50);
});

