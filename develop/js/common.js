var getType = {
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
    var checkType = $(getType.checkbox);
    checkType.on('click', function() {
      var _this = $(this);
      getType.check(data, _this);
    });
  },
  check : function(data, btn) {
    var typeName = getType.typeName;
    var typeArry = [];
    for (i=0; i<typeName.length; i++ ) {
      typeArry[typeName[i]] = Number($('[name="effect-' + typeName[i] + '"]').val());
    }
    var effect = $(getType.effect);
    var effect5 = $(getType.effect5);
    var effect4 = $(getType.effect4);
    var effect3 = $(getType.effect3);
    var effect2 = $(getType.effect2);
    var effect1 = $(getType.effect1);
    var checkType = $(getType.checkbox);
    var cnt = 0;
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
      var type = btn.val();
      for (i=0; i<data.length; i++) {
        if ( data[i].type == type ) {
          for ( j=0; j<data[i].effect.length; j++ ) {
            var typeName = data[i].effect[j].type;
            var typeNameJa = data[i].effect[j].typeJa;
            var num = Number(data[i].effect[j].value);
            var sum = Number($('[name="effect-' + typeName + '"]').val());
            var result = 0;
            if ( btn.prop('checked') == true ) {
              result = sum + num;
            } else {
              result = sum - num;
            }
            $('[name="effect-' + typeName + '"]').val(result);
            var resultHtml = '<li><a href="javascript:void(0);" data-type="' + typeName + '"><span class="icon icon-type-' + typeName + '"></span>' + typeNameJa + '</a></li>\n';
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
    }
  },
  clear : function() {
    var effect = $(getType.effect);
    var resultData = $(getType.resultData).find('input[type="hidden"]');
    resultData.each(function() {
      $(this).val('0');
    });
    effect.empty();
  },
  error : function() {
    var msg = $(getType.errMsg);
    msg.fadeIn(300);
    setTimeout(function() {
      msg.fadeOut(1000);
    }, 1000);
  }
}
var searchPokemon = {
  wrapper : '.js_pokekon-search',
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
    var wrapper = $(searchPokemon.wrapper);
    var textbox = wrapper.find(searchPokemon.textbox);
    var pokemonList = wrapper.find(searchPokemon.pokemonList);
    var checkbox = $(getType.checkbox);
    var resetBtn = $(searchPokemon.resetBtn);
    textbox.on('click', function() {
      wrapper.toggleClass(searchPokemon.isActiveClassName);
    });
    $(document).on('click', function(e) {
      if(!$(e.target).closest(searchPokemon.wrapper).length) {
        wrapper.removeClass(searchPokemon.isActiveClassName);
      }
    });
    wrapper.on('blur', function() {
      wrapper.removeClass(searchPokemon.isActiveClassName);
    });
    textbox.on('input change', function() {
      pokemonList.empty();
      if ( $(this).val().length == 0 ) {
        getType.clear();
        checkbox.each(function() {
          $(this).prop('checked', false);
        });
        for ( i=0; i<data.length; i++ ) {
          var pokemonName = data[i].name;
          if ( data[i].form != '' ) {
            pokemonName += '（' + data[i].form + '）';
          }
          var types = data[i].types;
          pokemonList.append('<li><a href="javascript:void(0);" data-types="' + types + '">' + pokemonName + '</a></li>')
        }
      } else {
        for ( i=0; i<data.length; i++ ) {
          var pokemonName = data[i].name;
          var types = data[i].types;
          var inputText = translate.katakana($(this).val());
          if ( pokemonName.indexOf(inputText) > -1 ) {
            pokemonList.append('<li><a href="javascript:void(0);" data-types="' + types + '">' + pokemonName + '</a></li>')
          }
        }
      }
    });
    $(document).on('click', 'a', function() {
      if ( $(this).parents().hasClass('pokemon-search-list') ) {
        if ( $(this).data('types') ) {
          var types = $(this).data('types');
          console.log(types);
          var typeArry = types.split(',');
          searchPokemon.select(typeArry);
          textbox.val($(this).text());
          pokemonList.html('<li><a href="javascript:void(0);" data-types="' + types + '">' + $(this).text() + '</a></li>');
        } else {
          getType.clear();
          checkbox.each(function() {
            $(this).prop('checked', false);
          });
        }
        wrapper.removeClass(searchPokemon.isActiveClassName);
      }
    });
    resetBtn.on('click', function() {
      pokemonList.empty();
      searchPokemon.clear(data);
      getType.clear();
      checkbox.each(function() {
        $(this).prop('checked', false);
      });
    });
  },
  select : function(arry) {
    var typeList = $(searchPokemon.typeList);
    var typeListItem = typeList.find('li');
    var checkbox = typeListItem.find(getType.checkbox);
    getType.clear();
    checkbox.each(function() {
      $(this).prop('checked', false);
    });
    if ( arry.length > 0 ) {
      var Jname = arry[0];
      for ( i=0; i<typeListItem.length; i++ ) {
        var btn = typeListItem.eq(i).find(getType.checkbox);
        var Evalue = btn.val();
        var Jvalue = translate.EtoJ(Evalue);
        if ( Jvalue == Jname ) {
          btn.click();
        }
      }
    }
    if ( arry.length == 2 ) {
      var Jname2 = arry[1];
      for ( i=0; i<typeListItem.length; i++ ) {
        var btn = typeListItem.eq(i).find(getType.checkbox);
        var Evalue = btn.val();
        var Jvalue = translate.EtoJ(Evalue);
        if ( Jvalue == Jname2 ) {
          btn.click();
        }
      }
    }
  },
  clear : function(data) {
    var wrapper = $(searchPokemon.wrapper);
    var textbox = wrapper.find(searchPokemon.textbox);
    var pokemonList = wrapper.find(searchPokemon.pokemonList);
    for ( i=0; i<data.length; i++ ) {
      var pokemonName = data[i].name;
      if ( data[i].form != '' ) {
        pokemonName += '（' + data[i].form + '）';
      }
      var types = data[i].types;
      if ( pokemonName ) {
        pokemonList.append('<li><a href="javascript:void(0);" data-types="' + types + '">' + pokemonName + '</a></li>')
      }
    }
    textbox.val('');
  }
}
var translate = {
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
    var Jvalue;
    Jvalue += str.replace(/normal/g, 'ノーマル');
    Jvalue += str.replace(/fire/g, 'ほのお');
    Jvalue += str.replace(/water/g, 'みず');
    Jvalue += str.replace(/grass/g, 'くさ');
    Jvalue += str.replace(/electric/g, 'でんき');
    Jvalue += str.replace(/ice/g, 'こおり');
    Jvalue += str.replace(/fighting/g, 'かくとう');
    Jvalue += str.replace(/poison/g, 'どく');
    Jvalue += str.replace(/ground/g, 'じめん');
    Jvalue += str.replace(/flying/g, 'ひこう');
    Jvalue += str.replace(/psychic/g, 'エスパー');
    Jvalue += str.replace(/bug/g, 'むし');
    Jvalue += str.replace(/rock/g, 'いわ');
    Jvalue += str.replace(/ghost/g, 'ゴースト');
    Jvalue += str.replace(/dragon/g, 'ドラゴン');
    Jvalue += str.replace(/dark/g, 'あく');
    Jvalue += str.replace(/steel/g, 'はがね');
    Jvalue += str.replace(/fairy/g, 'フェアリー');
    // if ( str == 'normal' ) {
    //   Jname = 'ノーマル';
    // } else if ( str == 'fire' ) {
    //   Jname = 'ほのお';
    // } else if ( str == 'water' ) {
    //   Jname = 'みず';
    // } else if ( str == 'grass' ) {
    //   Jname = 'くさ';
    // } else if ( str == 'electric' ) {
    //   Jname = 'でんき';
    // } else if ( str == 'ice' ) {
    //   Jname = 'こおり';
    // } else if ( str == 'fighting' ) {
    //   Jname = 'かくとう';
    // } else if ( str == 'poison' ) {
    //   Jname = 'どく';
    // } else if ( str == 'ground' ) {
    //   Jname = 'じめん';
    // } else if ( str == 'flying' ) {
    //   Jname = 'ひこう';
    // } else if ( str == 'psychic' ) {
    //   Jname = 'エスパー';
    // } else if ( str == 'bug' ) {
    //   Jname = 'むし';
    // } else if ( str == 'rock' ) {
    //   Jname = 'いわ';
    // } else if ( str == 'ghost' ) {
    //   Jname = 'ゴースト';
    // } else if ( str == 'dragon' ) {
    //   Jname = 'ドラゴン';
    // } else if ( str == 'dark' ) {
    //   Jname = 'あく';
    // } else if ( str == 'steel' ) {
    //   Jname = 'はがね';
    // } else if ( str == 'fairy' ) {
    //   Jname = 'フェアリー';
    // }

    // var Earry = translate.typeName;
    // var Jarry = translate.typeNameJa;
    // for ( i=0; i<Earry.length; i++ ) {
    //   if ( str == Earry[i] ) {
    //     Jname = Jarry[i];
    //   }
    // }
    return Jvalue;
  },
  JtoE : function(str) {
    var Evalue;
    Evalue += str.replace(/ノーマル/g, 'normal');
    Evalue += str.replace(/ほのお/g, 'fire');
    Evalue += str.replace(/みず/g, 'water');
    Evalue += str.replace(/くさ/g, 'grass');
    Evalue += str.replace(/でんき/g, 'electric');
    Evalue += str.replace(/こおり/g, 'ice');
    Evalue += str.replace(/かくとう/g, 'fighting');
    Evalue += str.replace(/どく/g, 'poison');
    Evalue += str.replace(/じめん/g, 'ground');
    Evalue += str.replace(/ひこう/g, 'flying');
    Evalue += str.replace(/エスパー/g, 'psychic');
    Evalue += str.replace(/むし/g, 'bug');
    Evalue += str.replace(/いわ/g, 'rock');
    Evalue += str.replace(/ゴースト/g, 'ghost');
    Evalue += str.replace(/ドラゴン/g, 'dragon');
    Evalue += str.replace(/あく/g, 'dark');
    Evalue += str.replace(/はがね/g, 'steel');
    Evalue += str.replace(/フェアリー/g, 'fairy');
    // var Ename;
    // var Earry = translate.typeName;
    // var Jarry = translate.typeNameJa;
    // for ( i=0; i<Jarry.length; i++ ) {
    //   if ( str == Jarry[i] ) {
    //     Ename = Earry[i];
    //   }
    // }
    return Evalue;
  },
  katakana : function(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
      const chr = match.charCodeAt(0) + 0x60;
      return String.fromCharCode(chr);
    });
  }
}
var applicable = {
  ini : function(data) {
    var effect = $(getType.effect);
    console.log(effect.find('a').length);
    effect.on('click', 'a', function() {
      var type = $(this).data('type');
      applicable.list(data, type);
    });
    
    for ( i=0; i<data.length; i++ ) {
      var isMegaEvolution = data[i].isMegaEvolution;
      var evolutions = data[i].evolutions;
      var hp = data[i].stats.hp;
      var attack = data[i].stats.attack;
      var defence = data[i].stats.defence;
      var spAttack = data[i].stats.spAttack;
      var spDefence = data[i].stats.spDefence;
      var totalAttack = attack + spAttack;
      var totalDefence = defence + spDefence;
      var total = hp + totalAttack + totalDefence;
      if (( isMegaEvolution != true ) && ( evolutions.length == 0 )) {
        if ( total > 420 ) {
          // console.log(data[i].name + ':' + totalAttack + ',' + totalDefence);
        }
      }
    }
  },
  list : function(type, data) {

  }
}
$(function() {
  $.getJSON("../data/type.json", function(data) {
    getType.ini(data);
  });
  $.getJSON("../data/pokemon_data.json", function(data) {
    searchPokemon.ini(data);
    applicable.ini(data);
  });
});
