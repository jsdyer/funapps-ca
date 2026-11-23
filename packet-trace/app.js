(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const engine = window.PacketTraceEngine;
  const feedback = byId('feedback');
  if (!engine) {
    feedback.textContent = 'The simulation could not load. Refresh to try again.';
    return;
  }

  const missionSelect = byId('mission-select');
  const nodeList = byId('node-list');
  const terminal = byId('command-output');
  const commandInput = byId('command-input');
  const actionButtons = {
    scan: byId('scan-node'),
    isolate: byId('isolate-node'),
    rotate: byId('rotate-node'),
    restore: byId('restore-node')
  };
  const cameraControls = {
    'view-left': scene => scene.rotate(-.23, 0),
    'view-right': scene => scene.rotate(.23, 0),
    'view-up': scene => scene.rotate(0, .15),
    'view-down': scene => scene.rotate(0, -.15),
    'view-in': scene => scene.zoom(1.2),
    'view-out': scene => scene.zoom(1 / 1.2),
    'view-reset': scene => scene.reset()
  };
  const NODE_STATES = { online: 'Online', isolated: 'Isolated', contained: 'Remediated · offline' };
  const STATE_LABELS = { active: 'Investigating', won: 'Resolved', lost: 'Unresolved' };
  const COMMAND_HELP = [
    'nodes · list device IDs and their status',
    'inspect [node] · review available evidence without spending a turn',
    'links [node] · list the connections on that device',
    'scan / isolate / rotate / restore [node] · take an action',
    'wait · advance one turn',
    'brief · show the mission objective',
    'status · show the turn and availability',
    'report · show your assessment',
    'clear · clear this console'
  ].join('\n');

  let state;
  let selectedId;
  let scene;
  let transcript = [];
  let history = [];
  let historyIndex = 0;
  const nodeButtons = new Map();

  function listItem(text) {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }

  function nodeById(id) {
    return state.nodes.find(node => node.id === id);
  }

  function appendOutput(text) {
    transcript.push(text);
    if (transcript.length > 30) transcript.shift();
    terminal.textContent = transcript.join('\n\n');
    terminal.scrollTop = terminal.scrollHeight;
  }

  function selectNode(id) {
    if (!nodeById(id)) return false;
    selectedId = id;
    renderInspector();
    renderNodeList();
    updateScene();
    return true;
  }

  function makeNodeButtons() {
    nodeButtons.clear();
    nodeList.replaceChildren();
    for (const node of state.nodes) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      const label = document.createElement('span');
      const status = document.createElement('span');
      button.type = 'button';
      button.className = 'node-button';
      label.textContent = node.label;
      status.className = 'node-state';
      button.append(label, status);
      button.addEventListener('click', () => selectNode(node.id));
      li.append(button);
      nodeList.append(li);
      nodeButtons.set(node.id, { button, status });
    }
  }

  function renderNodeList() {
    for (const node of state.nodes) {
      const { button, status } = nodeButtons.get(node.id);
      const isSelected = node.id === selectedId;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      button.dataset.status = node.status;
      button.dataset.alert = String(Boolean(node.alert));
      const statusText = node.alert ? 'Evidence flagged' : NODE_STATES[node.status];
      if (status.textContent !== statusText) status.textContent = statusText;
    }
  }

  function renderInspector() {
    const node = nodeById(selectedId);
    const evidence = engine.inspect(state, selectedId);
    byId('node-title').textContent = node.label;
    byId('node-description').textContent = [node.role, NODE_STATES[node.status], evidence.description].filter(Boolean).join(' · ');
    byId('node-lines').replaceChildren(...evidence.lines.map(listItem));
    const active = state.status === 'active';
    actionButtons.scan.disabled = !active || node.scanned;
    actionButtons.isolate.disabled = !active || node.status !== 'online';
    actionButtons.rotate.disabled = !active || node.status !== 'isolated' || !node.scanned || !node.alert;
    actionButtons.restore.disabled = !active || node.status === 'online' || !node.scanned || node.alert;
    byId('action-advice').textContent = !active ? 'Start another mission or restart to play again.'
      : !node.scanned ? 'Scan to read the logs and confirm whether this device needs attention.'
      : node.status === 'contained' ? 'Remediation is complete. Restore this device to reconnect it.'
      : node.alert && node.status === 'online' ? 'Compromise confirmed. Isolate this device before rotating its credentials.'
      : node.alert ? 'This device is isolated. Rotate its credentials to remediate the compromise.'
      : node.status === 'isolated' ? 'No compromise was found. Restore this device to reconnect it.'
      : 'No compromise found. Continue investigating the other devices.';
  }

  function updateScene() {
    scene?.update({ nodes: state.nodes, links: state.links, selectedId });
  }

  function renderEvents() {
    const items = state.events.slice(-12).reverse().map(event => {
      const item = listItem(event.text);
      const time = document.createElement('span');
      time.className = 'event-turn';
      time.textContent = 'T' + String(event.turn).padStart(2, '0');
      item.dataset.kind = event.kind;
      item.prepend(time);
      return item;
    });
    byId('event-list').replaceChildren(...items);
  }

  function renderReport() {
    const target = byId('report');
    target.hidden = state.status === 'active';
    if (target.hidden) return;
    const report = engine.report(state);
    byId('report-grade').textContent = report.grade;
    byId('report-score').textContent = String(report.score);
    byId('report-summary').textContent = report.summary;
    byId('report-details').replaceChildren(...report.details.map(listItem));
  }

  function render() {
    byId('turn-stat').textContent = state.turn + ' / ' + state.limit;
    byId('availability-stat').textContent = state.availability + '%';
    byId('status-stat').textContent = STATE_LABELS[state.status];
    byId('wait-turn').disabled = state.status !== 'active';
    renderNodeList();
    renderInspector();
    renderEvents();
    renderReport();
    updateScene();
  }

  function startMission(id) {
    state = engine.start(id);
    selectedId = state.nodes[0].id;
    byId('mission-title').textContent = state.mission.title;
    byId('mission-briefing').textContent = state.mission.briefing;
    byId('mission-objective').textContent = state.mission.objective;
    byId('mission-difficulty').textContent = state.mission.difficulty;
    feedback.textContent = '';
    delete feedback.dataset.result;
    transcript = [];
    history = [];
    historyIndex = 0;
    commandInput.value = '';
    appendOutput('Mission loaded. Type help for commands.');
    makeNodeButtons();
    scene?.reset();
    render();
  }

  function runAction(action, id = selectedId) {
    const wasActive = state.status === 'active';
    const focusedAction = Object.values(actionButtons).find(button => button === document.activeElement);
    const result = action === 'wait' ? engine.advance(state) : engine.act(state, action, id);
    render();
    feedback.textContent = result.text;
    feedback.dataset.result = result.ok ? 'ok' : 'error';
    if (state.status !== 'active' && result.ok) {
      feedback.textContent += ' ' + engine.report(state).summary;
      if (wasActive) byId('report').focus();
    } else if (focusedAction?.disabled) {
      const node = nodeById(selectedId);
      const next = !node.scanned ? actionButtons.scan
        : node.status === 'contained' || (node.status === 'isolated' && !node.alert) ? actionButtons.restore
        : node.alert ? (node.status === 'online' ? actionButtons.isolate : actionButtons.rotate)
        : byId('action-advice');
      next.focus();
    }
    return result.text;
  }

  function commandResponse(command, args) {
    const id = args.join(' ') || selectedId;
    switch (command) {
      case 'help':
        return COMMAND_HELP;
      case 'nodes':
        return state.nodes.map(node => node.id + ' · ' + node.label + ' · ' + NODE_STATES[node.status]).join('\n');
      case 'status':
        return 'Turn ' + state.turn + '/' + state.limit + ' · Availability ' + state.availability + '% · ' + STATE_LABELS[state.status];
      case 'brief':
        return state.mission.briefing + '\n' + state.mission.objective;
      case 'report': {
        const result = engine.report(state);
        return [result.summary, ...result.details].join('\n');
      }
      case 'wait':
        return runAction('wait');
      case 'inspect': {
        if (!selectNode(id)) return 'Unknown node. Use nodes to list IDs.';
        const evidence = engine.inspect(state, id);
        return [evidence.description, ...evidence.lines].join('\n');
      }
      case 'links': {
        if (!nodeById(id)) return 'Unknown node. Use nodes to list IDs.';
        const links = state.links.filter(link => link.from === id || link.to === id);
        return links.map(link => link.from + ' → ' + link.to + ' · ' + link.label).join('\n') || 'No links.';
      }
      case 'scan':
      case 'isolate':
      case 'rotate':
      case 'restore':
        if (!selectNode(id)) return 'Unknown node. Use nodes to list IDs.';
        return runAction(command, id);
      default:
        return 'Unknown command. Type help for available commands.';
    }
  }

  byId('command-form').addEventListener('submit', event => {
    event.preventDefault();
    const line = commandInput.value.trim();
    if (!line) return;
    commandInput.value = '';
    if (history.at(-1) !== line) {
      history.push(line);
      if (history.length > 30) history.shift();
    }
    historyIndex = history.length;
    const [command, ...args] = line.toLowerCase().split(/\s+/);
    if (command === 'clear') {
      transcript = [];
      terminal.textContent = '';
      return;
    }
    appendOutput('> ' + line + '\n' + commandResponse(command, args));
  });

  commandInput.addEventListener('keydown', event => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const next = historyIndex + (event.key === 'ArrowUp' ? -1 : 1);
    historyIndex = Math.max(0, Math.min(history.length, next));
    commandInput.value = history[historyIndex] || '';
  });

  try {
    scene = window.PacketTraceScene?.mount(byId('topology'), { onSelect: selectNode });
  } catch {
    scene = null;
  }
  if (!scene) {
    byId('topology').hidden = true;
    byId('scene-note').hidden = false;
    byId('scene-note').textContent = 'The 3D map is unavailable. Use the device list to play the full mission.';
  }
  for (const [id, move] of Object.entries(cameraControls)) {
    const button = byId(id);
    button.disabled = !scene;
    button.addEventListener('click', () => { if (scene) move(scene); });
  }

  missionSelect.replaceChildren();
  for (const mission of engine.missions) {
    const option = document.createElement('option');
    option.value = mission.id;
    option.textContent = mission.title + ' · ' + mission.difficulty;
    missionSelect.append(option);
  }
  missionSelect.addEventListener('change', () => startMission(missionSelect.value));
  byId('restart-mission').addEventListener('click', () => startMission(missionSelect.value));
  for (const [action, button] of Object.entries(actionButtons)) {
    button.addEventListener('click', () => {
      const id = selectedId;
      appendOutput('> ' + action + ' ' + id + '\n' + runAction(action, id));
    });
  }
  byId('wait-turn').addEventListener('click', () => appendOutput('> wait\n' + runAction('wait')));

  window.addEventListener('pagehide', event => { if (!event.persisted) scene?.destroy(); });
  startMission(missionSelect.value);
})();
