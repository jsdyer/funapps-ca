(() => {
  'use strict';
  const grid = document.getElementById('game-grid');
  const dialog = document.getElementById('game-dialog');
  const container = document.getElementById('game-container');
  const title = document.getElementById('dialog-title');
  let lastTrigger;
  if (!window.FunGames || !Array.isArray(window.FunGames.list)) {
    grid.textContent = 'The games could not load. Please refresh and try again.';
    return;
  }
  const games = window.FunGames.list;
  function openGame(game, trigger) {
    lastTrigger = trigger || document.activeElement;
    title.textContent = game.title;
    container.replaceChildren();
    window.FunGames.mount(game.id, container);
    dialog.showModal();
    document.getElementById('close-dialog').focus();
  }
  grid.replaceChildren();
  games.forEach((game, index) => {
    const card = document.createElement('article');
    card.className = 'game-card';
    const art = document.createElement('div'); art.className = 'card-art'; art.setAttribute('aria-hidden','true');
    const number = document.createElement('span'); number.className = 'card-number'; number.textContent = String(index + 1).padStart(2, '0') + ' / PLAY';
    const icon = document.createElement('span'); icon.className = 'card-symbol'; icon.textContent = game.icon || '✳';
    art.append(number, icon);
    const body = document.createElement('div'); body.className = 'card-body';
    const tag = document.createElement('span'); tag.className = 'game-tag'; tag.textContent = game.tag;
    const heading = document.createElement('h3'); heading.textContent = game.title;
    const desc = document.createElement('p'); desc.textContent = game.description;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'play-button'; button.setAttribute('aria-label', `Play ${game.title}`); button.innerHTML = 'LET’S PLAY <span aria-hidden="true">↗</span>';
    button.addEventListener('click', () => openGame(game, button));
    body.append(tag, heading, desc, button); card.append(art, body); grid.append(card);
  });
  document.getElementById('surprise').addEventListener('click', event => { if (games.length) openGame(games[Math.floor(Math.random() * games.length)], event.currentTarget); });
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { window.FunGames.unmount(container); if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus(); });
})();
