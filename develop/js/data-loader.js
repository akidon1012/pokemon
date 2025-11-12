// data-loader.js

// グローバル初期化（未定義回避）
window.__POKEMON_DATA__            = window.__POKEMON_DATA__            || [];
window.__TYPE_DEFENSE_TABLE__      = window.__TYPE_DEFENSE_TABLE__      || [];
window.__POKEMON_GO_META__         = window.__POKEMON_GO_META__         || [];
window.__MOVES_MASTER_LOCALIZED__  = window.__MOVES_MASTER_LOCALIZED__  || [];

// それぞれの JSON を取得してグローバルに格納
const p1 = $.getJSON('../../data/pokemon_list.json')
  .done(function(d){
    // 生成した JSON が配列ならそのまま、オブジェクトなら候補キーを拾う
    window.__POKEMON_DATA__ = Array.isArray(d) ? d : (d.list || d.data || []);
  })
  .fail(function(_, __, err){
    console.warn('pokemon_list.json load failed:', err);
  });

const p2 = $.getJSON('../../data/type_defense.json')
  .done(function(d){
    window.__TYPE_DEFENSE_TABLE__ = Array.isArray(d) ? d : (d.table || d.data || []);
  })
  .fail(function(_, __, err){
    console.warn('type_defense.json load failed:', err);
  });

// ★ 追加：GOメタデータ（覚える技IDなど）
const p3 = $.getJSON('../../data/pokemon_go_meta.json')
  .done(function(d){
    window.__POKEMON_GO_META__ = Array.isArray(d) ? d : (d.list || d.data || []);
  })
  .fail(function(_, __, err){
    console.warn('pokemon_go_meta.json load failed:', err);
  });

// ★ 追加：ローカライズ済み技マスタ
const p4 = $.getJSON('../../data/moves_master_localized.json')
  .done(function(d){
    window.__MOVES_MASTER_LOCALIZED__ = Array.isArray(d) ? d : (d.list || d.data || []);

    // 技インデックス初期化（utilities.js 内の pokemonUtil を想定）
    if (window.pokemonUtil && typeof pokemonUtil.initMoves === 'function') {
      pokemonUtil.initMoves(window.__MOVES_MASTER_LOCALIZED__);
    }
  })
  .fail(function(_, __, err){
    console.warn('moves_master_localized.json load failed:', err);
  });

// すべて読み込み完了してから初期化を知らせる
$.when(p1, p2, p3, p4).done(function(){
  $(document).trigger('pokemon:data-ready');
  console.log('lotad', pokemonUtil.getPokemonData('lotad'));
});
