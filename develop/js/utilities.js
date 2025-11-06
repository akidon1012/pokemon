const pokemonCard = {
  build: function(poke) {
    const name  = poke?.name  || '';
    const img   = poke?.image || 'https://placehold.jp/300x300.png';
    const types = Array.isArray(poke?.types) ? poke.types : [];

    const typeBadges = types.map(function(t) {
      const en = translate.JtoE(t);
      return `<span class="icon icon-type-${en}"></span>`;
    }).join('');

    return `
<div class="pokemon-info-wrapper">
  <div class="pokemon-info-img">
    <img src="${img}" decoding="async" loading="lazy" alt="${name}">
  </div>
  <div class="pokemon-info-type">
    ${typeBadges}
  </div>
  <div class="pokemon-info-name">${name}</div>
</div>`;
  },

  render: function(poke, area) {
    const $area = (area instanceof jQuery) ? area : $(area);
    if (!$area.length) return;
    $area.empty().append(this.build(poke));
  },
}
const pokemonUtil = {
  getImageUrlByNo : function(no) {
    // 数値か文字列かに関係なく安全に扱う
    const id = parseInt(no, 10);
    if (!id || isNaN(id)) {
      console.warn('Invalid Pokémon ID:', no);
      return 'https://placehold.jp/300x300.png';
    }

    // 正しい画像URL
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  },

  // 今後の拡張例：
  getFallbackImageUrl : function(no) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${no}.png`;
  },

  getDisplayName : function(poke) {
    return poke.form ? `${poke.name}（${poke.form}）` : poke.name;
  }
}