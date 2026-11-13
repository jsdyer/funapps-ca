(() => {
  'use strict';
  const grid = document.getElementById('game-grid');
  const dialog = document.getElementById('game-dialog');
  const container = document.getElementById('game-container');
  const title = document.getElementById('dialog-title');
  const filterNote = document.getElementById('filter-note');
  let lastTrigger;
  if (!window.FunGames || !Array.isArray(window.FunGames.list)) {
    grid.textContent = 'The activities could not load. Please refresh and try again.';
    return;
  }
  const games = window.FunGames.list;
  const storageKey = 'funapps-favorites-v1';
  let favorites = new Set();
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) favorites = new Set(saved.filter(x => typeof x === 'string'));
  } catch (_) { storageAvailable = false; }
  let selectedFilter = 'all';
  function saveFavorites() {
    try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); }
    catch (_) { storageAvailable = false; }
  }
  function openGame(game, trigger) {
    lastTrigger = trigger || document.activeElement;
    title.textContent = game.title;
    window.FunGames.mount(game.id, container);
    dialog.showModal();
    document.getElementById('close-dialog').focus();
  }
  function isExploration(game) { return game.category === 'explore' || ['roadtrip', 'aurora'].includes(game.id); }
  function matches(game) {
    if (selectedFilter === 'favorites') return favorites.has(game.id);
    if (selectedFilter === 'explore') return isExploration(game);
    if (selectedFilter === 'puzzles') return !isExploration(game);
    return true;
  }
  function render() {
    const visibleGames = games.filter(matches);
    grid.replaceChildren();
    filterNote.textContent = `${visibleGames.length} ${visibleGames.length === 1 ? 'activity' : 'activities'} · ${storageAvailable ? 'Saved picks stay in this browser' : 'Saved picks last for this visit'}`;
    if (!visibleGames.length) {
      const empty = document.createElement('p'); empty.className = 'empty-filter';
      empty.textContent = selectedFilter === 'favorites' ? 'Nothing saved yet. Tap the heart on an activity to keep it handy here.' : 'No activities in this collection yet.';
      grid.append(empty); return;
    }
    visibleGames.forEach(game => {
      const card = document.createElement('article'); card.className = 'game-card';
      const art = document.createElement('div'); art.className = 'card-art';
      const icon = document.createElement('span'); icon.className = 'card-symbol'; icon.setAttribute('aria-hidden','true'); icon.textContent = game.icon || '✳';
      const favorite = document.createElement('button'); favorite.type = 'button'; favorite.className = 'card-favorite';
      const active = favorites.has(game.id); favorite.setAttribute('aria-pressed', String(active)); favorite.setAttribute('aria-label', `Save ${game.title}`); favorite.textContent = active ? '♥' : '♡';
      favorite.addEventListener('click', () => {
        if (favorites.has(game.id)) favorites.delete(game.id); else favorites.add(game.id);
        saveFavorites();
        if (selectedFilter === 'favorites') {
          render(); document.querySelector('[data-filter="favorites"]').focus();
        } else {
          const saved = favorites.has(game.id); favorite.setAttribute('aria-pressed', String(saved)); favorite.textContent = saved ? '♥' : '♡';
          filterNote.textContent = `${saved ? 'Saved' : 'Removed'} ${game.title} · ${storageAvailable ? 'Saved picks stay in this browser' : 'Saved picks last for this visit'}`;
        }
      });
      art.append(icon, favorite);
      const body = document.createElement('div'); body.className = 'card-body';
      const tag = document.createElement('span'); tag.className = 'game-tag'; tag.textContent = game.tag;
      const heading = document.createElement('h3'); heading.textContent = game.title;
      const desc = document.createElement('p'); desc.textContent = game.description;
      const button = document.createElement('button');
      const explore = isExploration(game);
      button.type = 'button';
      button.className = 'play-button';
      button.setAttribute('aria-label', `${explore ? 'Open' : 'Play'} ${game.title}`);
      button.innerHTML = explore ? 'OPEN <span aria-hidden="true">↗</span>' : 'LET’S PLAY <span aria-hidden="true">↗</span>';
      button.addEventListener('click', () => openGame(game, button));
      body.append(tag, heading, desc, button); card.append(art, body); grid.append(card);
    });
  }
  document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
    selectedFilter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(control => { const active = control === button; control.classList.toggle('active', active); control.setAttribute('aria-pressed', String(active)); });
    render();
  }));
  render();
  document.getElementById('surprise').addEventListener('click', event => { const pool = games.filter(matches); if (pool.length) openGame(pool[Math.floor(Math.random() * pool.length)], event.currentTarget); else filterNote.textContent = 'Save an activity first, or choose another collection.'; });
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { window.FunGames.unmount(container); if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus(); });
})();
