'use strict';

const QUIZ_ROUNDS = 5;
const BOARD_SIZE = 5;
const LINE_LENGTH = 4;
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

// The first option is the answer. Each game shuffles the questions and choices.
const QUESTIONS = [
  ['What is the capital of Nunavut?', ['Iqaluit', 'Rankin Inlet', 'Yellowknife', 'Whitehorse'], 'Iqaluit is on Baffin Island.'],
  ['Which province is home to the Cabot Trail?', ['Nova Scotia', 'British Columbia', 'New Brunswick', 'Quebec'], 'The Cabot Trail loops through northern Cape Breton Island.'],
  ['What traditionally goes on poutine along with fries and gravy?', ['Cheese curds', 'Maple sugar', 'Pickled beets', 'Bread crumbs'], 'Fresh cheese curds are the classic topping.'],
  ['What animal appears on the standard Canadian one-dollar coin?', ['Common loon', 'Canada goose', 'Beaver', 'Caribou'], 'The loon gives the coin its nickname, the loonie.'],
  ['Which city is the capital of British Columbia?', ['Victoria', 'Vancouver', 'Kelowna', 'Prince George'], 'Victoria is on the southern tip of Vancouver Island.'],
  ['What do curlers use to sweep the ice?', ['Brooms', 'Paddles', 'Rakes', 'Shovels'], 'Sweeping can change how far the stone slides and how much it curls.'],
  ['Which province’s capital is Charlottetown?', ['Prince Edward Island', 'New Brunswick', 'Nova Scotia', 'Newfoundland and Labrador'], 'Charlottetown is the provincial capital and sits on a harbour.'],
  ['Which lake is one of the five Great Lakes?', ['Lake Erie', 'Lake Winnipeg', 'Great Slave Lake', 'Lake Athabasca'], 'Lake Erie is one of the four Great Lakes that border both Canada and the United States.'],
  ['What is the name of the Canadian national anthem?', ['O Canada', 'The Maple Leaf Forever', 'Song for Canada', 'Canada the Beautiful'], 'The lyrics exist in both English and French.'],
  ['Which Canadian territory has Whitehorse as its capital?', ['Yukon', 'Nunavut', 'Northwest Territories', 'Labrador'], 'Whitehorse is on the Yukon River.'],
  ['Which national park is in Newfoundland and Labrador?', ['Gros Morne', 'Banff', 'Point Pelee', 'Kejimkujik'], 'Gros Morne is on the west coast of the island of Newfoundland.'],
  ['What animal is on the standard Canadian five-cent coin?', ['Beaver', 'Polar bear', 'Common loon', 'Moose'], 'The polar bear appears on the standard two-dollar coin.'],
  ['What is a toque?', ['A knit cap', 'A sled', 'A canoe paddle', 'A kind of pie'], 'Toque is a Canadian word for a close-fitting knit winter hat.'],
  ['Which river flows past both Montréal and Québec City?', ['St. Lawrence River', 'Fraser River', 'Ottawa River', 'Saskatchewan River'], 'The St. Lawrence connects the Great Lakes to the Atlantic Ocean.'],
  ['Which province is home to both Regina and Saskatoon?', ['Saskatchewan', 'Alberta', 'Manitoba', 'Ontario'], 'Regina is the provincial capital.'],
  ['Which of these sports is played on ice?', ['Ringette', 'Lacrosse', 'Volleyball', 'Cricket'], 'Ringette players use straight sticks to pass a rubber ring.'],
  ['Which province is home to the city that gives Nanaimo bars their name?', ['British Columbia', 'Ontario', 'Manitoba', 'New Brunswick'], 'Nanaimo is on the east coast of Vancouver Island.'],
  ['What is the capital of the Northwest Territories?', ['Yellowknife', 'Hay River', 'Inuvik', 'Dawson City'], 'Yellowknife is on the north shore of Great Slave Lake.'],
  ['Which ocean borders Canada on the west?', ['Pacific', 'Atlantic', 'Indian', 'Southern'], 'The Pacific touches the coast of British Columbia.'],
  ['Which city is on the shores of Lake Ontario?', ['Toronto', 'Ottawa', 'Montréal', 'Calgary'], 'Toronto sits on the northwestern shore of Lake Ontario.'],
  ['Which Canadian province is officially bilingual?', ['New Brunswick', 'Nova Scotia', 'Ontario', 'Manitoba'], 'English and French have equal status as New Brunswick’s official languages.'],
  ['What kind of event is a major part of the Calgary Stampede?', ['Rodeo', 'Sailing regatta', 'Dog-sled race', 'Figure skating'], 'The Stampede is associated with rodeo and Western heritage.'],
  ['What do Québec sugar shacks traditionally make in spring?', ['Maple syrup', 'Ice wine', 'Apple butter', 'Wildflower honey'], 'Maple sap is boiled to concentrate the sugars into syrup.'],
  ['What shape is the central emblem on Canada’s flag?', ['A maple leaf', 'A beaver', 'A crown', 'A star'], 'The stylized red maple leaf has eleven points.']
];

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function winningLine(board, index, player) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  for (const [down, across] of DIRECTIONS) {
    const line = [index];
    for (const direction of [-1, 1]) {
      for (let step = 1; step < LINE_LENGTH; step++) {
        const nextRow = row + direction * step * down;
        const nextColumn = column + direction * step * across;
        if (nextRow < 0 || nextRow >= BOARD_SIZE || nextColumn < 0 || nextColumn >= BOARD_SIZE) break;
        const next = nextRow * BOARD_SIZE + nextColumn;
        if (board[next] !== player) break;
        if (direction < 0) line.unshift(next);
        else line.push(next);
      }
    }
    if (line.length >= LINE_LENGTH) return line;
  }
  return [];
}

function startGame(kind, playerIds, random = Math.random) {
  if (kind !== 'quiz' && kind !== 'campfire') throw new Error('Choose an available game.');
  if (!Array.isArray(playerIds) || playerIds.some(id => typeof id !== 'string' || !id) || new Set(playerIds).size !== playerIds.length) {
    throw new Error('The game needs distinct players.');
  }
  if (kind === 'campfire') {
    if (playerIds.length !== 2) throw new Error('Campfire Four needs two players.');
    return {
      kind,
      phase: 'playing',
      playerIds: [...playerIds],
      board: Array(BOARD_SIZE ** 2).fill(null),
      turn: playerIds[0],
      winner: null,
      winningLine: [],
      result: null
    };
  }
  if (playerIds.length < 2 || playerIds.length > 8) throw new Error('Canada Quiz needs 2 to 8 players.');
  const deck = shuffled(QUESTIONS, random).slice(0, QUIZ_ROUNDS).map(([prompt, options, explanation]) => {
    const choices = shuffled(options, random);
    return { prompt, choices, explanation, correctChoice: choices.indexOf(options[0]) };
  });
  return {
    kind,
    phase: 'question',
    playerIds: [...playerIds],
    deck,
    round: 1,
    scores: new Map(playerIds.map(id => [id, 0])),
    answers: new Map()
  };
}

function revealQuiz(game) {
  const question = game.deck[game.round - 1];
  for (const [id, choice] of game.answers) {
    if (choice === question.correctChoice) game.scores.set(id, game.scores.get(id) + 1);
  }
  game.phase = 'reveal';
}

function applyQuizAction(game, playerId, action, isHost) {
  if (!['answer', 'reveal', 'next'].includes(action?.type)) throw new Error('That action is not available in Canada Quiz.');
  if (game.phase === 'finished') throw new Error('This quiz has ended.');
  if (action.round !== game.round) throw new Error('The quiz has moved to a different question.');
  if (action.type === 'answer') {
    if (game.phase !== 'question') throw new Error('This question has already been revealed.');
    if (!game.scores.has(playerId)) throw new Error('You can join the next game.');
    if (game.answers.has(playerId)) throw new Error('You have already answered this question.');
    const question = game.deck[game.round - 1];
    if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice >= question.choices.length) {
      throw new Error('Choose one of the answers.');
    }
    game.answers.set(playerId, action.choice);
    if (game.answers.size === game.playerIds.length) revealQuiz(game);
    return;
  }
  if (!isHost) throw new Error('Only the host can advance the quiz.');
  if (action.type === 'reveal') {
    if (game.phase !== 'question') throw new Error('The answer is already visible.');
    revealQuiz(game);
    return;
  }
  if (game.phase !== 'reveal') throw new Error('Reveal this answer first.');
  game.answers.clear();
  if (game.round === game.deck.length) {
    game.phase = 'finished';
  } else {
    game.round++;
    game.phase = 'question';
  }
}

function applyCampfireMove(game, playerId, action) {
  if (action?.type !== 'move') throw new Error('Choose an open square to play Campfire Four.');
  if (game.phase !== 'playing') throw new Error('This match has ended.');
  if (!game.playerIds.includes(playerId)) throw new Error('You can join the next match.');
  if (game.turn !== playerId) throw new Error('It is the other player’s turn.');
  const cell = action.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell >= game.board.length) throw new Error('Choose a square on the board.');
  if (game.board[cell] !== null) throw new Error('That square is already taken.');
  game.board[cell] = playerId;
  const line = winningLine(game.board, cell, playerId);
  if (line.length) {
    game.phase = 'finished';
    game.result = 'win';
    game.winner = playerId;
    game.winningLine = line;
    game.turn = null;
  } else if (game.board.every(square => square !== null)) {
    game.phase = 'finished';
    game.result = 'draw';
    game.turn = null;
  } else {
    game.turn = game.playerIds.find(id => id !== playerId);
  }
}

function applyGameAction(game, playerId, action, isHost) {
  if (!game) throw new Error('Start a game first.');
  if (game.kind === 'quiz') applyQuizAction(game, playerId, action, isHost);
  else applyCampfireMove(game, playerId, action);
}

function viewGame(game, viewerId) {
  if (!game) return null;
  const shared = { kind: game.kind, phase: game.phase, playerIds: [...game.playerIds] };
  if (game.kind === 'campfire') {
    return {
      ...shared,
      size: BOARD_SIZE,
      board: [...game.board],
      turn: game.turn,
      winner: game.winner,
      winningLine: [...game.winningLine],
      result: game.result
    };
  }
  const question = game.deck[game.round - 1];
  const revealed = game.phase === 'reveal';
  const finished = game.phase === 'finished';
  return {
    ...shared,
    round: game.round,
    totalRounds: game.deck.length,
    prompt: finished ? '' : question.prompt,
    choices: finished ? [] : [...question.choices],
    answeredCount: game.answers.size,
    hasAnswered: game.answers.has(viewerId),
    scores: game.playerIds.map(id => ({ id, score: game.scores.get(id) })),
    correctChoice: revealed ? question.correctChoice : null,
    explanation: revealed ? question.explanation : null,
    yourChoice: revealed ? game.answers.get(viewerId) ?? null : null
  };
}

function playerLeft(game, playerId) {
  if (!game || !game.playerIds.includes(playerId)) return;
  if (game.kind === 'campfire') {
    if (game.phase === 'playing') {
      game.phase = 'finished';
      game.result = 'forfeit';
      game.winner = game.playerIds.find(id => id !== playerId);
      game.turn = null;
    }
    return;
  }
  game.playerIds = game.playerIds.filter(id => id !== playerId);
  game.scores.delete(playerId);
  game.answers.delete(playerId);
  if (game.playerIds.length === 0) game.phase = 'finished';
  if (game.phase === 'question' && game.answers.size === game.playerIds.length) revealQuiz(game);
}

module.exports = { startGame, applyGameAction, viewGame, playerLeft };
