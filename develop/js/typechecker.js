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
      const checkType = $(getType.checkbox);
      if ($(getType.checkbox + ':checked').length > 0) {
        $('.js_pokemon-search').addClass(tabs.isActiveClassName);
      } else {
        $('.js_pokemon-search').removeClass(tabs.isActiveClassName);
      }
    }
  }
}
const TYPE_MULT = {
  main : { '-2': 0.0,    '-1': 2.0,   '0': 1.0,  '1': 0.5  },
  go   : { '-2': 0.390625, '-1': 1.6, '0': 1.0,  '1': 0.625 }
};
const MULT = { dbl: 1.6, half: 0.625, zero: 0.39 }; // 単タイプ時の係数
const EPS = 0.01;
const bucket = function(mult) {
  if (Math.abs(mult - (MULT.dbl * MULT.dbl)) < EPS) return 'x2win';     // 2.56
  if (Math.abs(mult - MULT.dbl) < EPS)               return 'x1win';     // 1.6
  if (Math.abs(mult - 1.0) < EPS)                    return 'even';      // 1.0
  if (Math.abs(mult - MULT.half) < EPS)              return 'x1lose';    // 0.625
  if (Math.abs(mult - MULT.zero) < EPS)              return 'x2lose';    // 0.39
  // 端数（複合タイプの 1.6×0.625=1.0 以外 etc.）は近い方へ寄せる
  if (mult > 1.3)  return 'x1win';
  if (mult < 0.5)  return 'x2lose';
  if (mult < 0.9)  return 'x1lose';
  return 'even';
}
const getType = {
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
  ini : function(data) {
    getType._chart = getType.buildTypeChart(data); // ←保持
    getType._mode  = 'go'; // 'main' に切替も可（UIトグルは後で）
    const checkType = $(getType.checkbox);
    $(document).off('change.pokemonType');
    $(document).on('change.pokemonType', getType.checkbox, function(e) {
      const _this = $(this);
      console.log('[pokemon-type change]', _this.val(), _this.prop('checked')); // デバッグ
      getType.check(data, _this);
    });
  },
  buildTypeChart : function(list) {
    const chart = {};
    for (const row of list) {
      const atk = row.type;
      chart[atk] = chart[atk] || {};
      for (const ef of row.effect) {
        chart[atk][ef.type] = ef.value; // -2..1
      }
    }
    return chart;
  },
  effectivenessMultiplier : function(attackType, defenderTypes, chart, mode) {
    const map = TYPE_MULT[mode || 'go'];
    let m = 1.0;
    for (const def of defenderTypes) {
      const v = String(chart?.[attackType]?.[def] ?? 0);
      m *= (map[v] ?? 1.0);
    }
    return m;
  },
  bucketByMultiplier : function(m, mode) {
    if ((mode || 'go') === 'go') {
      if (m >= 2.56) return 5;                    // 二重ばつぐん
      if (m >= 1.6)  return 4;                    // ばつぐん
      if (m > 0.99 && m < 1.01) return 3;         // 等倍
      if (m <= 0.390625 + 1e-6) return 1;         // 強耐性(こうかなし相当)
      return 2;                                   // いまひとつ
    } else {
      if (m >= 4.0) return 5;
      if (m >= 2.0) return 4;
      if (m === 1.0) return 3;
      if (m === 0.0) return 1;
      return 2;
    }
  },
  bestOfTwo : function(attackTypes, defenderTypes, chart, mode) {
    let best = 0;
    for (const atk of attackTypes) {
      const m = effectivenessMultiplier(atk, defenderTypes, chart, mode);
      if (m > best) best = m;
    }
    return best || 1.0;
  },
  check : function(typeData, btn) {
    const effectWrap = $(getType.effect);
    const effect5    = $(getType.effect5);   // こうかばつぐん×2（2.56）
    const effect4    = $(getType.effect4);   // こうかばつぐん（1.6）
    const effect3    = $(getType.effect3);   // こうかふつう（1.0）
    const effect2    = $(getType.effect2);   // こうかいまひとつ（0.625）
    const effect1    = $(getType.effect1);   // こうかいまひとつ×2（0.39）

    const TABLE = Array.isArray(typeData)
      ? typeData
      : (Array.isArray(window.__TYPE_DEFENSE_TABLE__) ? window.__TYPE_DEFENSE_TABLE__ : []);

    // 現在選択中の“受ける側タイプ”（0〜2）※ value は英名 'fire' など
    const checked = $(getType.checkbox)
      .filter(':checked')
      .map(function(){ return $(this).val(); })
      .get();

    // 0個 → クリア
    if (checked.length === 0) {
      getType.clear();
      return;
    }
    // 3個以上はガード
    if (checked.length > 2) {
      getType.error();
      btn.prop('checked', false);
      return;
    }

    // 描画リセット
    effectWrap.empty();
    effect1.empty(); effect2.empty(); effect3.empty(); effect4.empty(); effect5.empty();

    // 全攻撃タイプを 1.0 で初期化
    const attackTypes = getType.typeName.slice();   // ['normal','fire',...]
    const multMap = {};
    attackTypes.forEach(function(t){ multMap[t] = 1.0; });

    // 防御タイプごとに、防御相性テーブルから倍率を乗算
    checked.forEach(function(defTypeEn){
      // row.type が EN、row.typeJa が JA のどちらでも拾えるように
      const defJa = translate.EtoJ(defTypeEn);
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
      const ja   = translate.EtoJ(t);

      const html =
        '<li><a href="javascript:void(0);" data-type="' + t + '">' +
          '<span class="icon icon-type-' + t + '"></span>' + ja + ' ×' + mult +
        '</a></li>\n';

      // bucket() は既存のグローバル想定（NaNはもう来ない）
      switch (bucket(mult)) {
        case 'x2win':  effect5.append(html); break; // 2.56
        case 'x1win':  effect4.append(html); break; // 1.6
        case 'x1lose': effect2.append(html); break; // 0.625
        case 'x2lose': effect1.append(html); break; // 0.39
        default:       effect3.append(html); break; // 1.0
      }
    });

    // 検索リストは従来どおり再構築
    searchPokemon.clear(window.__pokemonListData || []);
    const searchWrapper = $(searchPokemon.wrapper);
    const pokemonList   = searchWrapper.find(searchPokemon.pokemonList);
    if ($('.js_list-html').length) {
      pokemonList.html($('.js_list-html').html());
    }
    // 選択されたタイプに応じてリスト絞り込み
    if (typeof searchPokemon.filterListByTypes === 'function' &&
        typeof searchPokemon.getSelectedTypesJa === 'function') {
      searchPokemon.filterListByTypes( searchPokemon.getSelectedTypesJa() );
    }
  },
  clear : function() {
    const effect = $(getType.effect);
    const resultData = $(getType.resultData).find('input[type="hidden"]');
    resultData.each(function() { $(this).val('1'); });
    effect.empty();
  },
  error : function() {
    const msg = $(getType.errMsg);
    msg.fadeIn(300);
    setTimeout(function() {
      msg.fadeOut(1000);
    }, 1000);
  }
}
const searchPokemon = {
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
    var id = searchPokemon.normalizeId(noOrId);
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
    const typesStr = $a.data('types') ?? $a.attr('data-types'); // 'みず,くさ'
    const typesJa  = String(typesStr || '').split(',').filter(Boolean);

    // data-no は .data() → .attr() の順で安全取得
    const rawNo    = ($a.data('no') != null) ? $a.data('no') : $a.attr('data-no');
    const id       = searchPokemon.normalizeId(rawNo);
    return {
      id    : id,
      name  : nameJa,
      types : typesJa,
      image : searchPokemon.resolveImage(id, null)
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
    const typesStr = $a.data('types'); // 'みず,くさ'
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
      searchPokemon.select(typesJa);
    } else {
      getType.clear();
      $(getType.checkbox).each(function(){ $(this).prop('checked', false); });
    }

    // テキストボックス更新
    const textbox = $(searchPokemon.wrapper).find(searchPokemon.textbox);
    textbox.val(nameJa);
    textbox.trigger('keyup'); // 再フィルタ
    $(searchPokemon.wrapper).removeClass(searchPokemon.isActiveClassName);
    textbox.blur();
  },

  handleReset : function(){
    const wrapper     = $(searchPokemon.wrapper);
    const pokemonList = wrapper.find(searchPokemon.pokemonList);
    const checkbox    = $(getType.checkbox);
    const clearBtn    = $(searchPokemon.clearBtn);
    const data        = searchPokemon.cacheData;

    pokemonList.empty();
    searchPokemon.clear(data);          // リスト再構築
    if (window.getType?.clear) getType.clear();
    checkbox.each(function(){ $(this).prop('checked', false); });
    wrapper.find(searchPokemon.textbox).val('').trigger('focus');
    searchPokemon.filterListByTypes([]); // 全件表示
    clearBtn.hide();

    // ★ 追加：選択カードをクリア
    searchPokemon.clearSelected();
  },

  // ========== 既存：初期化 ==========
  ini : function(data) {
    // データ保持（リセットで再構築に使用）
    this.cacheData = Array.isArray(data) ? data : [];

    searchPokemon.clear(data);

    const wrapper     = $(searchPokemon.wrapper);
    const textbox     = wrapper.find(searchPokemon.textbox);
    const pokemonList = wrapper.find(searchPokemon.pokemonList);
    const checkbox    = $(getType.checkbox);
    const resetBtn    = $(searchPokemon.resetBtn);
    const clearBtn    = $(searchPokemon.clearBtn);

    // 初回キャッシュ作成
    if ($('.js_list-html').length === 0) {
      $('body').append('<ul class="js_list-html" style="display:none;"></ul>\n');
      $('.js_list-html').html(pokemonList.html());
    }

    // ====== フォーカス・ブラー制御 ======
    let blurTimer = null;
    textbox.off('focus click').on('focus click', function() {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      wrapper.addClass(searchPokemon.isActiveClassName);
      // リストが空なら復元
      if (pokemonList.find('li').length === 0 && $('.js_list-html').length) {
        pokemonList.html($('.js_list-html').html());
        pokemonList.find('li').show();
      }
    });
    textbox.off('blur').on('blur', function() {
      blurTimer = setTimeout(function() {
        wrapper.removeClass(searchPokemon.isActiveClassName);
        blurTimer = null;
      }, 120);
    });

    // ====== 入力で絞り込み ======
    let composing = false;
    textbox.on('compositionstart', function(){ composing = true; });
    textbox.on('compositionend',  function(){ composing = false; textbox.trigger('keyup'); });

    textbox.off('keyup change').on('keyup change', function() {
      if (composing) return;
      if (textbox.is(':focus')) wrapper.addClass(searchPokemon.isActiveClassName);

      const keywordRaw = $(this).val();
      const keyword = translate.katakana(String(keywordRaw).trim());

      // 毎回全件復元してからフィルタ
      if ($('.js_list-html').length) {
        pokemonList.html($('.js_list-html').html());
      }

      if (keyword === '') {
        pokemonList.find('li').show();
        if (window.getType?.clear) getType.clear();
        checkbox.each(function(){ $(this).prop('checked', false); });
        clearBtn.hide();

        // ★ 追加：入力が空になったら選択カードも削除
        searchPokemon.clearSelected();
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
      .on('pointerdown.pokemonList mousedown.pokemonList', '.js_pokemon-search-list a', searchPokemon.handlePick);

    // ====== リセット ======
    resetBtn.off('click').on('click', searchPokemon.handleReset);
  },

  // 既存：型で選択（そのまま）
  select : function(arry) {
    const typeList = $(searchPokemon.typeList);
    const typeListItem = typeList.find('li');
    const checkbox = typeListItem.find(getType.checkbox);
    getType.clear();
    checkbox.each(function() {
      $(this).prop('checked', false);
    });
    if ( arry.length > 0 ) {
      const Jname = arry[0];
      for ( let i=0; i<typeListItem.length; i++ ) {
        const btn = typeListItem.eq(i).find(getType.checkbox);
        const Evalue = btn.val();
        const Jvalue = translate.EtoJ(Evalue);
        if ( Jvalue == Jname ) {
          btn.click();
        }
      }
    }
    if ( arry.length == 2 ) {
      const Jname2 = arry[1];
      for ( let i=0; i<typeListItem.length; i++ ) {
        const btn = typeListItem.eq(i).find(getType.checkbox);
        const Evalue = btn.val();
        const Jvalue = translate.EtoJ(Evalue);
        if ( Jvalue == Jname2 ) {
          btn.click();
        }
      }
    }
  },

  // 追加：選択中タイプ（日本語）を配列で取得
  getSelectedTypesJa : function() {
    const checked = $(getType.checkbox).filter(':checked'); // valueは英語
    const ja = [];
    checked.each(function() {
      const en = $(this).val();
      ja.push( translate.EtoJ(en) ); // 日本語に変換（例: fire -> ほのお）
    });
    return ja;
  },

  // 追加：タイプで .js_pokemon-list を絞り込み（AND）
  filterListByTypes : function(selectedJa) {
    const wrapper     = $(searchPokemon.wrapper);
    const pokemonList = wrapper.find(searchPokemon.pokemonList);

    // キャッシュから毎回全件復元してから絞る
    if ($('.js_list-html').length) {
      pokemonList.html($('.js_list-html').html());
    }

    if (!selectedJa || selectedJa.length === 0) {
      // タイプ未選択なら全件表示
      pokemonList.find('li').show();
      return;
    }

    // data-types は「くさ,どく」のような日本語配列文字列
    pokemonList.find('li').each(function() {
      const typesStr = String($(this).find('a').data('types') || '');
      const typesJa = typesStr.split(','); // 日本語のまま
      // AND 条件：選択されたすべてのタイプを含むか
      const hit = selectedJa.every(t => typesJa.includes(t));
      $(this).toggle(hit);
    });
  },

  clear : function(data) {
    const wrapper = $(searchPokemon.wrapper);
    const textbox = wrapper.find(searchPokemon.textbox);
    const pokemonList = wrapper.find(searchPokemon.pokemonList);
    for ( let i=0; i<data.length; i++ ) {
      let pokemonName = data[i].name;
      if ( data[i].form != '' ) {
        pokemonName += '（' + data[i].form + '）';
      }
      const no = data[i].no;
      const types = data[i].types;
      if ( pokemonName ) {
        pokemonList.append(`<li><a href="javascript:void(0);" data-no="${no}" data-types="${types.join(',')}">${pokemonName}</a></li>`);
      }
    }
    textbox.val('');
  }
}

const applicable = {
  ini : function(data) {
    const effect = $(getType.effect);
    effect.off('click');
    effect.on('click', 'a', function() {
      const type = $(this).data('type');
      applicable.list(data, type);
    });
  },
  list : function(data, type) {
    for ( let i=0; i<data.length; i++ ) {
      const isMegaEvolution = data[i].isMegaEvolution;
      const evolutions = data[i].evolutions;
      const hp = data[i].stats.hp;
      const attack = data[i].stats.attack;
      const defence = data[i].stats.defence;
      const spAttack = data[i].stats.spAttack;
      const spDefence = data[i].stats.spDefence;
      const totalAttack = attack + spAttack;
      const totalDefence = defence + spDefence;
      const total = hp + totalAttack + totalDefence;
      const types = data[i].types;
      let flag = 0;
      for ( let j=0; j<types.length; j++ ) {
        if ( translate.JtoE(types[j]) == type ) {
          flag = 1;
        }
      }
      if (( flag == 1 ) && ( isMegaEvolution != true ) && ( evolutions.length == 0 )) {
        if ( total > 420 ) {
          console.log(data[i].name + ':' + totalAttack + ',' + totalDefence);
        }
      }
    }
  }
}
const translate = {
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
}

$(function() {
  tabs.ini();

  $.getJSON('../../data/type_defense.json', function(data) {
    window.__TYPE_DEFENSE_TABLE__ = Array.isArray(data) ? data : (data && data.table) || [];
    getType.ini(data);
  });

  $.getJSON('../../data/pokemon_list.json', function(data) {
    window.__POKEMON_DATA__ = Array.isArray(data) ? data : (data && data.list) || [];
    searchPokemon.ini(data);
    applicable.ini(data);
  });
});

