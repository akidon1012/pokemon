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
  }
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
    const checkType = $(getType.checkbox);
    checkType.on('click', function() {
      const _this = $(this);
      getType.check(data, _this);
    });
  },
  check : function(data, btn) {
    const typeName = getType.typeName;
    let typeArry = [];
    for (let i=0; i<typeName.length; i++ ) {
      typeArry[typeName[i]] = Number($('[name="effect-' + typeName[i] + '"]').val());
    }
    const effect = $(getType.effect);
    const effect5 = $(getType.effect5);
    const effect4 = $(getType.effect4);
    const effect3 = $(getType.effect3);
    const effect2 = $(getType.effect2);
    const effect1 = $(getType.effect1);
    const checkType = $(getType.checkbox);
    let cnt = 0;
    checkType.each(function() {
      if ( $(this).prop('checked') == true ) {
        cnt ++;
      }
    });
    if ( cnt == 0 ) {
      getType.clear();
    } else if ( cnt > 2 ) {
      getType.error();
      btn.prop('checked', false);
    } else {
      effect.empty();
      const type = btn.val();
      for ( let i=0; i<data.length; i++) {
        if ( data[i].type == type ) {
          for ( let j=0; j<data[i].effect.length; j++ ) {
            const typeName = data[i].effect[j].type;
            const typeNameJa = data[i].effect[j].typeJa;
            const num = Number(data[i].effect[j].value);
            const sum = Number($('[name="effect-' + typeName + '"]').val());
            let result = 0;
            if ( btn.prop('checked') == true ) {
              result = sum + num;
            } else {
              result = sum - num;
            }
            $('[name="effect-' + typeName + '"]').val(result);
            const resultHtml = '<li><a href="javascript:void(0);" data-type="' + typeName + '"><span class="icon icon-type-' + typeName + '"></span>' + typeNameJa + '</a></li>\n';
            if ( result > 1 ) {
              effect5.append(resultHtml);
            } else if ( result == 1 ) {
              effect4.append(resultHtml);
              } else if ( result == 0 ) {
              effect3.append(resultHtml);
            } else if ( result == -1 ) {
              effect2.append(resultHtml);
            } else {
              effect1.append(resultHtml);
            }
          }
        }
      }
      searchPokemon.clear(data);
      const searchWrapper = $(searchPokemon.wrapper);
      const pokemonList = searchWrapper.find(searchPokemon.pokemonList);
      pokemonList.html($('.js_list-html').html());
    }
  },
  clear : function() {
    const effect = $(getType.effect);
    const resultData = $(getType.resultData).find('input[type="hidden"]');
    resultData.each(function() {
      $(this).val('0');
    });
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
  pokemonList : '.js_pokemon-list',
  typeList : '.js_pokemon-type-list',
  textbox : '.js_pokemon-search-input',
  checkbox : '[name="pokemon-type"]',
  isActiveClassName : 'is_active',
  resetBtn : '.js_reset',
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
  ini : function(data) {
    searchPokemon.clear(data);

    const wrapper     = $(searchPokemon.wrapper);
    const textbox     = wrapper.find(searchPokemon.textbox);
    const pokemonList = wrapper.find(searchPokemon.pokemonList);
    const checkbox    = $(getType.checkbox);
    const resetBtn    = $(searchPokemon.resetBtn);

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
        getType.clear();
        checkbox.each(function(){ $(this).prop('checked', false); });
        return;
      }

      pokemonList.find('li').each(function() {
        const text = $(this).text();
        $(this).toggle(text.indexOf(keyword) > -1);
      });
    });

    // ====== リスト選択（mousedownでblurより先に処理） ======
    $(document)
      .off('pointerdown.pokemonList mousedown.pokemonList')
      .on('pointerdown.pokemonList mousedown.pokemonList', '.js_pokemon-list a', function(e) {
        e.preventDefault();
        const $a = $(this);
        const typesStr = $a.data('types');
        const textbox     = $(searchPokemon.wrapper).find(searchPokemon.textbox);

        if (typesStr) {
          const typeArry = String(typesStr).split(',');
          searchPokemon.select(typeArry);
        } else {
          getType.clear();
          $(getType.checkbox).each(function(){ $(this).prop('checked', false); });
        }

        textbox.val($a.text());
        textbox.trigger('keyup'); // 絞り込み再実行
        $(searchPokemon.wrapper).removeClass(searchPokemon.isActiveClassName);
        textbox.blur();
      });

    // ====== リセット ======
    resetBtn.off('click').on('click', function() {
      pokemonList.empty();
      searchPokemon.clear(data);
      getType.clear();
      checkbox.each(function(){ $(this).prop('checked', false); });
      textbox.trigger('focus');
    });
  },
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
  clear : function(data) {
    const wrapper = $(searchPokemon.wrapper);
    const textbox = wrapper.find(searchPokemon.textbox);
    const pokemonList = wrapper.find(searchPokemon.pokemonList);
    for ( let i=0; i<data.length; i++ ) {
      let pokemonName = data[i].name;
      if ( data[i].form != '' ) {
        pokemonName += '（' + data[i].form + '）';
      }
      const types = data[i].types;
      if ( pokemonName ) {
        pokemonList.append('<li><a href="javascript:void(0);" data-types="' + types + '">' + pokemonName + '</a></li>')
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
  $.getJSON("../../data/type.json", function(data) {
    getType.ini(data);
  });
  $.getJSON("../../data/pokemon_list.json", function(data) {
    searchPokemon.ini(data);
    applicable.ini(data);
  });
});
