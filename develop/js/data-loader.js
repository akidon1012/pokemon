// グローバル初期化（未定義回避）
window.__POKEMON_DATA__ = [];
window.__TYPE_DEFENSE_TABLE__ = [];

// それぞれの JSON を取得してグローバルに格納
const p1 = $.getJSON('../../data/pokemon_list.json')
  .done(function(d){
    // 生成した JSON が配列ならそのまま、オブジェクトなら候補キーを拾う
    window.__POKEMON_DATA__ = Array.isArray(d) ? d : (d.list || d.data || []);
  })
  .fail(function(_, __, err){ console.warn('pokemon_list.json load failed:', err); });

const p2 = $.getJSON('../../data/type_defense.json')
  .done(function(d){
    window.__TYPE_DEFENSE_TABLE__ = Array.isArray(d) ? d : (d.table || d.data || []);
  })
  .fail(function(_, __, err){ console.warn('type_defense.json load failed:', err); });

// 両方読み込み完了してから初期化を知らせる
$.when(p1, p2).done(function(){
  $(document).trigger('pokemon:data-ready');
});
