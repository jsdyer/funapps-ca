(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const entrance = byId('entrance');
  const room = byId('room');
  const gameRegion = byId('game');
  const nameInput = byId('player-name');
  const codeInput = byId('join-code');
  const entryForm = byId('entry-form');
  const createButton = byId('create-room');
  const joinButton = byId('join-room');
  const entryError = byId('entry-error');
  const connection = byId('connection');
  const feedback = byId('room-feedback');
  const gameStatus = byId('game-status');
  const inviteFallback = byId('invite-fallback');
  const chatLog = byId('chat-log');
  const chatInput = byId('chat-text');
  const chatBody = byId('chat-body');
  const chatToggle = byId('hide-chat');
  const chatSend = byId('send-chat');
  const conversationPrompt = byId('conversation-prompt');
  const dealPrompt = byId('deal-prompt');
  const playersList = byId('players');
  const leaveButton = byId('leave-room');
  const storageKey = 'funapps-room-seat-v1';
  const roomCode = /^[A-HJ-NP-Z2-9]{6}$/;
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const missingService = 'Multiplayer is unavailable on this host. You can still play the solo games.';
  const requests = new Set();
  const invitedCode = (new URL(location.href).searchParams.get('room') || '').trim().toUpperCase();

  let seat = null;
  let snapshot = null;
  let stream = null;
  let reconnectTimer = null;
  let retryDelay = 600;
  let connected = false;
  let joining = false;
  let pendingKick = null;
  let gameRenderKey = '';
  let playersRenderKey = '';
  let recentAction = null;

  function node(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function button(label, className, onClick, disabled = false) {
    const item = node('button', className, label);
    item.type = 'button';
    item.disabled = disabled;
    item.addEventListener('click', onClick);
    return item;
  }

  function setConnection(text, online = false) {
    if (connection.textContent !== text) connection.textContent = text;
    connection.toggleAttribute('data-connected', online);
  }

  function setFeedback(text, error = false) {
    feedback.textContent = text;
    feedback.toggleAttribute('data-error', error);
  }

  function roomPath(code, action = '') {
    return '/api/rooms/' + encodeURIComponent(code) + action;
  }

  function inviteUrl() {
    const url = new URL('./', location.href);
    url.searchParams.set('room', seat.code);
    return url.href;
  }

  class RequestError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
    }
  }

  async function requestJson(path, body, auth, { timeout = 10000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const options = { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } };
      if (body !== undefined) {
        options.method = 'POST';
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      }
      if (auth) options.headers.Authorization = 'Bearer ' + auth;
      const response = await fetch(path, options);
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new RequestError(missingService, response.status);
      }
      const data = await response.json();
      if (!response.ok) throw new RequestError(data.error || 'The room could not complete that request.', response.status);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function saveSeat(value) {
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
      else sessionStorage.removeItem(storageKey);
    } catch {
      // This browser may block storage. The current connection can still play.
    }
  }

  function readSeat() {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey));
      if (value && roomCode.test(value.code) && typeof value.playerId === 'string' && typeof value.token === 'string') return value;
    } catch {
      // Ignore invalid or unavailable session data.
    }
    return null;
  }

  function stopConnection() {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    stream?.abort();
    stream = null;
    connected = false;
  }

  function enterRoom(value, focus = true) {
    stopConnection();
    seat = value;
    snapshot = null;
    recentAction = null;
    pendingKick = null;
    retryDelay = 600;
    saveSeat(value);
    entryError.textContent = '';
    setFeedback('');
    setConnection('Connecting to room…');
    byId('room-code').textContent = 'Room ' + value.code;
    chatLog.replaceChildren();
    byId('chat-empty').hidden = false;
    chatInput.value = '';
    inviteFallback.hidden = true;
    gameRenderKey = '';
    playersRenderKey = '';
    gameStatus.textContent = '';
    playersList.replaceChildren();
    gameRegion.replaceChildren(node('p', 'room-note', 'Waiting for the room…'));
    entrance.hidden = true;
    room.hidden = false;
    updateActionControls();
    if (focus) byId('room-title').focus();
    void openStream(value);
  }

  function returnToEntrance(message = '') {
    const previousCode = seat?.code || '';
    stopConnection();
    saveSeat(null);
    seat = null;
    snapshot = null;
    recentAction = null;
    pendingKick = null;
    room.hidden = true;
    entrance.hidden = false;
    entryError.textContent = message;
    codeInput.value = previousCode;
    setConnection('Ready to join or create a room.', true);
    nameInput.focus();
  }

  function scheduleReconnect(current) {
    if (seat !== current) return;
    connected = false;
    setConnection('Connection interrupted. Reconnecting to this room…');
    updateActionControls();
    renderPlayers();
    renderGame();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void openStream(current);
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 12000);
  }

  async function openStream(current) {
    const controller = new AbortController();
    stream = controller;
    const startTimeout = setTimeout(() => controller.abort(), 12000);
    let idleTimeout;
    function renewWatchdog() {
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => controller.abort(), 45000);
    }
    try {
      const response = await fetch(roomPath(current.code, '/events'), {
        headers: { Authorization: 'Bearer ' + current.token, Accept: 'text/event-stream' },
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(startTimeout);
      if (seat !== current) return;
      if (response.status === 401 || response.status === 404) {
        returnToEntrance('Your seat in that room has ended. Ask for a fresh invite or start another room.');
        return;
      }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
        throw new RequestError(missingService, response.status);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      renewWatchdog();
      while (seat === current) {
        const { value, done } = await reader.read();
        if (done || seat !== current) break;
        renewWatchdog();
        buffer += decoder.decode(value, { stream: true });
        let separator = /\r?\n\r?\n/.exec(buffer);
        while (separator) {
          const event = buffer.slice(0, separator.index);
          buffer = buffer.slice(separator.index + separator[0].length);
          const lines = event.split(/\r?\n/);
          if (lines.includes('event: seat-replaced')) {
            returnToEntrance('This seat is active in another tab. Join again to use a different seat here.');
            return;
          }
          const data = lines
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).replace(/^ /, ''));
          if (data.length) acceptSnapshot(JSON.parse(data.join('\n')), current);
          separator = /\r?\n\r?\n/.exec(buffer);
        }
        if (buffer.length > 131072) throw new Error('Incomplete room update.');
      }
    } catch {
      // EOF, service interruption, or invalid stream data will reconnect to a fresh snapshot.
    } finally {
      clearTimeout(startTimeout);
      clearTimeout(idleTimeout);
      controller.abort();
      if (stream === controller) {
        stream = null;
        scheduleReconnect(current);
      }
    }
  }

  function acceptSnapshot(update, current) {
    if (seat !== current || update.code !== current.code) return;
    if (snapshot && update.version < snapshot.version) return;
    connected = true;
    retryDelay = 600;
    snapshot = update;
    setConnection('Connected to room', true);
    updateActionControls();
    renderPlayers();
    renderChat();
    renderGame();
  }

  function updateActionControls() {
    chatInput.disabled = !connected;
    chatSend.disabled = !connected || requests.has('chat');
    leaveButton.disabled = requests.has('leave');
    dealPrompt.hidden = !snapshot || snapshot.hostId !== seat?.playerId;
    dealPrompt.disabled = !connected || requests.has('prompt');
    const prompt = snapshot?.prompt || 'The host can draw a question for the room.';
    if (conversationPrompt.textContent !== prompt) conversationPrompt.textContent = prompt;
    dealPrompt.textContent = snapshot?.prompt ? 'Deal another prompt' : 'Deal a prompt';
  }

  function playerName(id) {
    return snapshot.players.find(player => player.id === id)?.name || 'Former player';
  }

  async function action(body, key) {
    const current = seat;
    if (!current || requests.has(key) || (!connected && key !== 'leave')) return false;
    requests.add(key);
    updateActionControls();
    setFeedback('');
    try {
      await requestJson(roomPath(current.code, '/actions'), body, current.token);
      if (seat !== current) return false;
      return true;
    } catch (error) {
      if (seat !== current) return false;
      if (error.status === 401 || error.status === 404) {
        returnToEntrance('Your seat in that room has ended.');
      } else if (key !== 'leave') {
        setFeedback(error instanceof RequestError ? error.message : 'The connection dropped while sending. Check the room before trying again.', true);
      }
      return false;
    } finally {
      requests.delete(key);
      updateActionControls();
    }
  }

  async function gameAction(body, game) {
    if (recentAction || !connected) return;
    const current = seat;
    const gameBefore = JSON.stringify(snapshot.game);
    const pending = { before: gameBefore };
    recentAction = pending;
    renderGame();
    const outgoing = { ...body };
    if (game) outgoing.matchId = game.matchId;
    if (game?.kind === 'quiz' && body.type !== 'end') outgoing.round = game.round;
    const sent = await action(outgoing, 'game');
    if (seat !== current || recentAction !== pending) return;
    if (!sent) {
      recentAction = null;
      renderGame();
      return;
    }
    // Game controls stay locked until the authoritative update arrives.
    setTimeout(() => {
      if (seat === current && recentAction === pending) {
        recentAction = null;
        renderGame();
      }
    }, 4000);
  }

  function renderPlayers() {
    if (!snapshot) return;
    const key = JSON.stringify([snapshot.players, snapshot.hostId, snapshot.locked, connected, pendingKick]);
    if (key === playersRenderKey) return;
    playersRenderKey = key;
    const focusKey = playersList.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
    const ownId = seat.playerId;
    const isHost = snapshot.hostId === ownId;
    const list = snapshot.players.map(player => {
      const item = node('li');
      const tags = [];
      if (player.id === ownId) tags.push('You');
      if (player.id === snapshot.hostId) tags.push('Host');
      tags.push(player.connected ? 'Online' : 'Reconnecting');
      item.append(node('strong', '', player.name), node('span', 'player-state', tags.join(' · ')));
      if (isHost && player.id !== ownId) {
        const confirm = pendingKick === player.id;
        const kick = button(confirm ? 'Confirm removal' : 'Remove', 'room-link', async () => {
          if (!confirm) {
            pendingKick = player.id;
            renderPlayers();
            return;
          }
          pendingKick = null;
          renderPlayers();
          await action({ type: 'kick', playerId: player.id }, 'moderation');
        }, !connected);
        kick.dataset.focusKey = 'remove-' + player.id;
        kick.setAttribute('aria-label', (confirm ? 'Confirm removal of ' : 'Remove ') + player.name);
        item.append(kick);
        if (confirm) {
          item.append(button('Cancel', 'room-link', () => {
            pendingKick = null;
            renderPlayers();
          }));
        }
      }
      return item;
    });
    if (isHost) {
      const item = node('li');
      const lock = button(snapshot.locked ? 'Unlock room' : 'Lock room', 'room-link', () => {
        void action({ type: 'lock', locked: !snapshot.locked }, 'moderation');
      }, !connected);
      lock.dataset.focusKey = 'lock';
      item.append(node('span', 'player-state', snapshot.locked ? 'New joins paused' : 'Open to invites'), lock);
      list.push(item);
    } else if (snapshot.locked) {
      list.push(node('li', 'player-state', 'New joins paused by the host.'));
    }
    playersList.replaceChildren(...list);
    restoreFocus(playersList, focusKey);
  }

  function renderChat() {
    const nearBottom = chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 28;
    const ids = new Set(snapshot.messages.map(message => String(message.id)));
    for (const item of [...chatLog.children]) {
      if (!ids.has(item.dataset.messageId)) item.remove();
    }
    const shown = new Set([...chatLog.children].map(item => item.dataset.messageId));
    for (const message of snapshot.messages) {
      const id = String(message.id);
      if (shown.has(id)) continue;
      const item = node('li');
      item.dataset.messageId = id;
      item.append(node('strong', '', message.name));
      const timestamp = new Date(message.at);
      if (Number.isFinite(timestamp.getTime())) {
        const time = node('time', '', timeFormat.format(timestamp));
        time.dateTime = timestamp.toISOString();
        item.append(time);
      }
      item.append(node('p', '', message.text));
      chatLog.append(item);
    }
    byId('chat-empty').hidden = snapshot.messages.length > 0;
    if (nearBottom) chatLog.scrollTop = chatLog.scrollHeight;
  }

  function restoreFocus(region, focusKey, fallback) {
    if (!focusKey) return;
    const control = [...region.querySelectorAll('[data-focus-key]')].find(item => item.dataset.focusKey === focusKey && !item.disabled);
    if (control) control.focus({ preventScroll: true });
    else if (fallback) fallback.focus({ preventScroll: true });
  }

  function gameButton(label, body, game, style = 'primary', disabled = false) {
    const item = button(label, 'room-button ' + style, () => void gameAction(body, game), disabled || !connected || Boolean(recentAction));
    item.dataset.focusKey = [body.type, body.choice, body.cell].join('-');
    return item;
  }

  function gameHeading(label) {
    const title = node('h2', '', label);
    title.tabIndex = -1;
    gameRegion.append(title);
    return title;
  }

  function announceGame(message) {
    if (gameStatus.textContent !== message) gameStatus.textContent = message;
  }

  function onlineCount() {
    return snapshot.players.filter(player => player.connected).length;
  }

  function showGameMenu() {
    const title = gameHeading('Around the table');
    const online = onlineCount();
    const isHost = snapshot.hostId === seat.playerId;
    const message = isHost
      ? 'Pick a game when at least two players are connected. Anyone can use room chat while you wait.'
      : 'The host will pick the next game. You can still use room chat.';
    gameRegion.append(node('p', 'room-note', message));
    announceGame('In the room lobby. ' + online + ' players online.');
    const options = [
      { id: 'quiz', title: '🍁 Maple Quiz', description: 'Canadian trivia. Everyone answers each question before the reveal.', ready: online >= 2 },
      { id: 'campfire', title: '🔥 Campfire Four', description: 'Two players connect four pieces in a line. The rest of the room can watch.', ready: online >= 2 }
    ];
    for (const option of options) {
      const choice = button('', 'game-choice', () => void gameAction({ type: 'start', game: option.id }), !isHost || !option.ready || !connected || Boolean(recentAction));
      choice.dataset.focusKey = 'start-' + option.id;
      choice.append(node('strong', '', option.title), node('span', '', option.description));
      gameRegion.append(choice);
    }
    return title;
  }

  function showQuiz(game, isHost) {
    const title = gameHeading('🍁 Maple Quiz');
    const participating = game.playerIds.includes(seat.playerId);
    const controls = node('div', 'game-control-row');
    if (game.phase !== 'finished') {
      gameRegion.append(node('p', 'room-note', 'Question ' + game.round + ' of ' + game.totalRounds));
      gameRegion.append(node('h3', '', game.prompt));
      const choices = node('ol', 'game-options');
      game.choices.forEach((choice, index) => {
        const item = node('li');
        const option = gameButton(choice, { type: 'answer', choice: index }, game, 'secondary', !participating || game.hasAnswered || game.phase !== 'question');
        if (index === game.correctChoice) {
          option.classList.add('is-correct');
          option.textContent += ' ✓ Correct';
        }
        if (index === game.yourChoice) {
          option.classList.add('is-picked');
          option.textContent += ' · Your answer';
        }
        item.append(option);
        choices.append(item);
      });
      gameRegion.append(choices);
      if (game.phase === 'question') {
        const ownState = !participating ? 'Spectating. ' : game.hasAnswered ? 'Answer locked in. ' : '';
        gameRegion.append(node('p', 'room-note', ownState + game.answeredCount + ' of ' + game.playerIds.length + ' players answered.'));
        announceGame('Question ' + game.round + '. ' + game.prompt + ' ' + ownState + game.answeredCount + ' players answered.');
        if (isHost) controls.append(gameButton('Reveal answers', { type: 'reveal' }, game, 'secondary'));
      } else {
        if (game.explanation) gameRegion.append(node('p', '', game.explanation));
        announceGame('Answer revealed. ' + game.choices[game.correctChoice] + '. ' + (game.explanation || ''));
        if (isHost) {
          const label = game.round === game.totalRounds ? 'Show final scores' : 'Next question';
          controls.append(gameButton(label, { type: 'next' }, game));
        }
      }
    } else {
      gameRegion.append(node('p', 'game-result', 'Quiz complete.'));
      announceGame('Quiz complete. Final scores are available.');
      if (isHost) controls.append(gameButton('Play another quiz', { type: 'start', game: 'quiz' }, null, 'primary', onlineCount() < 2));
    }
    if (game.phase !== 'question') {
      const scores = node('ul', 'game-scores');
      scores.setAttribute('aria-label', 'Quiz scores');
      for (const score of [...game.scores].sort((a, b) => b.score - a.score)) {
        const line = node('li');
        line.append(node('span', '', playerName(score.id)), node('span', '', score.score + (score.score === 1 ? ' point' : ' points')));
        scores.append(line);
      }
      gameRegion.append(scores);
    }
    if (isHost) controls.append(gameButton(game.phase === 'finished' ? 'Back to room games' : 'End game', { type: 'end' }, game, 'secondary'));
    if (controls.children.length) gameRegion.append(controls);
    return title;
  }

  function showCampfire(game, isHost) {
    const title = gameHeading('🔥 Campfire Four');
    const yourTurn = game.turn === seat.playerId;
    const participating = game.playerIds.includes(seat.playerId);
    const online = game.playerIds.every(id => snapshot.players.some(player => player.id === id && player.connected));
    let message;
    if (game.phase === 'finished') {
      message = game.winner
        ? playerName(game.winner) + ' wins' + (game.result === 'forfeit' ? ' by forfeit.' : ' with four in a row!')
        : 'The board is full. This round is a draw.';
    } else if (!online) {
      message = 'Waiting for a player to reconnect.';
    } else if (yourTurn) {
      message = 'Your turn. Pick an empty square.';
    } else {
      message = playerName(game.turn) + '’s turn.' + (participating ? '' : ' You’re watching this round.');
    }
    const tokens = ['●', '◆'];
    const names = game.playerIds.map((id, index) => tokens[index] + ' ' + playerName(id));
    gameRegion.append(node('p', 'room-note', names.join('  ·  ')));
    gameRegion.append(node('p', game.phase === 'finished' ? 'game-result' : '', message));
    announceGame(message);
    const board = node('div', 'campfire-board');
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', 'Campfire Four board');
    game.board.forEach((playerId, index) => {
      const token = game.playerIds.indexOf(playerId);
      const row = Math.floor(index / game.size) + 1;
      const column = (index % game.size) + 1;
      const cell = gameButton(tokens[token] || '', { type: 'move', cell: index }, game, 'secondary', Boolean(playerId) || !yourTurn || !online || game.phase !== 'playing');
      cell.className = 'campfire-cell';
      cell.setAttribute('aria-label', 'Row ' + row + ', column ' + column + ': ' + (playerId ? playerName(playerId) : 'empty'));
      if (token === 1) cell.classList.add('token-two');
      if (game.winningLine.includes(index)) cell.classList.add('winning-cell');
      board.append(cell);
    });
    gameRegion.append(board);
    if (isHost) {
      const controls = node('div', 'game-control-row');
      if (game.phase === 'finished') controls.append(gameButton('Play another match', { type: 'start', game: 'campfire' }, null, 'primary', onlineCount() < 2));
      controls.append(gameButton(game.phase === 'finished' ? 'Back to room games' : 'End game', { type: 'end' }, game, 'secondary'));
      gameRegion.append(controls);
    }
    return title;
  }

  function renderGame() {
    if (!snapshot) return;
    const game = snapshot.game;
    const stateKey = JSON.stringify(game);
    if (recentAction && recentAction.before !== stateKey) recentAction = null;
    const key = JSON.stringify([stateKey, snapshot.players, snapshot.hostId, connected, Boolean(recentAction)]);
    if (key === gameRenderKey) return;
    gameRenderKey = key;
    const focused = document.activeElement;
    const wasFocused = gameRegion.contains(focused);
    const focusKey = wasFocused ? focused.dataset.focusKey : null;
    gameRegion.replaceChildren();
    const isHost = snapshot.hostId === seat.playerId;
    let title;
    if (game?.kind === 'quiz') title = showQuiz(game, isHost);
    else if (game?.kind === 'campfire') title = showCampfire(game, isHost);
    else title = showGameMenu();
    restoreFocus(gameRegion, focusKey, title);
    if (wasFocused && !focusKey) title.focus({ preventScroll: true });
  }

  entryForm.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    if (event.target === codeInput || (event.target === nameInput && roomCode.test(codeInput.value.trim().toUpperCase()))) {
      event.preventDefault();
      if (!joining) entryForm.requestSubmit(joinButton);
    }
  });

  entryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (joining) return;
    const join = event.submitter === joinButton;
    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();
    if (!name) {
      entryError.textContent = 'Enter a display name.';
      nameInput.focus();
      return;
    }
    if (join && !roomCode.test(code)) {
      entryError.textContent = 'Enter the six-character room code from your invite.';
      codeInput.focus();
      return;
    }
    joining = true;
    createButton.disabled = true;
    joinButton.disabled = true;
    entryError.textContent = '';
    try {
      const path = join ? roomPath(code, '/join') : '/api/rooms';
      const value = await requestJson(path, { name });
      if (!roomCode.test(value.code) || !value.playerId || !value.token) throw new Error('Invalid room response.');
      enterRoom(value);
    } catch (error) {
      entryError.textContent = error instanceof RequestError ? error.message : 'Could not reach multiplayer. Check your connection and try again.';
    } finally {
      joining = false;
      createButton.disabled = false;
      joinButton.disabled = false;
    }
  });

  byId('copy-invite').addEventListener('click', async () => {
    if (!seat) return;
    const current = seat;
    const value = inviteUrl();
    try {
      await navigator.clipboard.writeText(value);
      if (seat === current) setFeedback('Invite link copied.');
    } catch {
      if (seat !== current) return;
      inviteFallback.hidden = false;
      const field = byId('invite-url');
      field.value = value;
      field.focus();
      field.select();
      setFeedback('Copy the selected invite link.');
    }
  });

  leaveButton.addEventListener('click', async () => {
    const current = seat;
    await action({ type: 'leave' }, 'leave');
    if (seat === current) returnToEntrance();
  });

  chatToggle.addEventListener('click', () => {
    const hide = !chatBody.hidden;
    chatBody.hidden = hide;
    chatToggle.setAttribute('aria-expanded', String(!hide));
    chatToggle.textContent = hide ? 'Show chat' : 'Hide chat';
  });

  dealPrompt.addEventListener('click', () => {
    void action({ type: 'prompt' }, 'prompt');
  });

  byId('chat-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    const original = chatInput.value;
    const sent = await action({ type: 'chat', text }, 'chat');
    if (sent && chatInput.value === original) chatInput.value = '';
    if (sent && document.activeElement === document.body) chatInput.focus();
  });

  window.addEventListener('online', () => {
    if (!seat || connected || !reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    void openStream(seat);
  });

  if (roomCode.test(invitedCode)) {
    codeInput.value = invitedCode;
    joinButton.textContent = 'Join room';
  }
  const remembered = readSeat();
  if (remembered && (!roomCode.test(invitedCode) || invitedCode === remembered.code)) {
    enterRoom(remembered, false);
  } else {
    void requestJson('/api/health', undefined, undefined, { timeout: 4000 })
      .then(data => {
        if (!seat) setConnection(data.ok ? 'Ready to join or create a room.' : missingService, Boolean(data.ok));
      })
      .catch(() => {
        if (!seat) setConnection(missingService);
      });
  }
})();
