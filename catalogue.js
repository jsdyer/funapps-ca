(() => {
  'use strict';
  const grid = document.querySelector('#arcade-grid');
  const controls = document.querySelector('.catalogue-controls');
  const search = document.querySelector('#arcade-search');
  const category = document.querySelector('#arcade-category');
  const count = document.querySelector('#arcade-count');
  const empty = document.querySelector('#arcade-empty');
  const reset = document.querySelector('#arcade-reset');
  if (!grid || !controls || !search || !category || !count || !empty) return;
  const cards = [...grid.querySelectorAll('.arcade-card')];
  [...new Set(cards.map(card => card.dataset.category))].sort().forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    category.append(option);
  });
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function update() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const text = normalize(card.dataset.search || '');
      const matches = (category.value === 'all' || card.dataset.category === category.value)
        && terms.every(term => text.includes(term));
      card.hidden = !matches;
      if (matches) visible++;
    }
    count.textContent = `${visible} ${visible === 1 ? 'game' : 'games'}${visible === cards.length ? ' to explore' : ` of ${cards.length}`}`;
    empty.hidden = visible !== 0;
    if (reset) reset.disabled = !search.value && category.value === 'all';
  }
  search.addEventListener('input', update);
  category.addEventListener('change', update);
  reset?.addEventListener('click', () => {
    search.value = '';
    category.value = 'all';
    update();
    search.focus();
  });
  controls.hidden = false;
  update();
})();
