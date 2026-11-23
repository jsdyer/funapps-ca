/* Fun Apps: small games that run entirely in your browser. */
(() => {
  'use strict';

  const shuffle = (items) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, action, className = 'fg-button') => {
    const b = el('button', className, text);
    b.type = 'button';
    b.addEventListener('click', action);
    return b;
  };
  const heading = (root, eyebrow, title, description) => {
    const header = el('div', 'fg-heading');
    header.append(el('p', 'fg-eyebrow', eyebrow), el('h2', 'fg-title', title), el('p', 'fg-intro', description));
    root.append(header);
  };
  const status = () => {
    const node = el('p', 'fg-status');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    return node;
  };

  const questions = [
    { q: 'Which province is home to the Bay of Fundy’s famous tides?', a: ['New Brunswick', 'Saskatchewan', 'Ontario', 'Alberta'], note: 'The Bay of Fundy also borders Nova Scotia.' },
    { q: 'What is the capital of Nunavut?', a: ['Iqaluit', 'Whitehorse', 'Yellowknife', 'Inuvik'] },
    { q: 'Which of these is a classic Montréal bagel feature?', a: ['Boiled in honey-sweetened water', 'Made only with rye flour', 'Always served with gravy', 'Baked without a hole'] },
    { q: 'Which ocean borders Canada on the west?', a: ['Pacific', 'Atlantic', 'Arctic', 'Indian'] },
    { q: 'What do the letters in CBC stand for?', a: ['Canadian Broadcasting Corporation', 'Canadian Books Council', 'Canada Bicycle Club', 'Coast Broadcasting Company'] },
    { q: 'Which province is known for its red-sand beaches?', a: ['Prince Edward Island', 'Manitoba', 'Alberta', 'Ontario'] },
    { q: 'Poutine traditionally combines fries, gravy and what?', a: ['Cheese curds', 'Maple butter', 'Pickles', 'Smoked salmon'] },
    { q: 'Which of these national parks is in Alberta?', a: ['Banff', 'Gros Morne', 'Pacific Rim', 'Cape Breton Highlands'] },
    { q: 'What is the capital of British Columbia?', a: ['Victoria', 'Vancouver', 'Kelowna', 'Nanaimo'] },
    { q: 'The loon appears on which Canadian coin?', a: ['One dollar', 'Five cents', 'Ten cents', 'Two dollars'] },
    { q: 'What is a “double-double” in a coffee order?', a: ['Two creams and two sugars', 'Two shots and two cups', 'Two coffees, both black', 'Twice as much foam'] },
    { q: 'Which territory has Whitehorse as its capital?', a: ['Yukon', 'Nunavut', 'Northwest Territories', 'Labrador'] },
    { q: 'Which sport is played with a stone, a sheet of ice and brooms?', a: ['Curling', 'Lacrosse', 'Ringette', 'Baseball'] },
    { q: 'Which Canadian province is officially bilingual?', a: ['New Brunswick', 'Nova Scotia', 'Ontario', 'Prince Edward Island'] },
    { q: 'What is the name of the ferry-friendly island province across the Northumberland Strait?', a: ['Prince Edward Island', 'Newfoundland', 'Vancouver Island', 'Cape Breton Island'] }
  ];
  function trivia(root) {
    let deck = shuffle(questions).slice(0, 8), index = 0, score = 0;
    heading(root, 'A LITTLE BIT OF EVERYTHING', 'The Canada Quiz', 'Eight questions, no timer. See what you know and learn a little along the way.');
    const area = el('div', 'fg-panel'); root.append(area);
    function draw(focus = false) {
      area.replaceChildren();
      if (index === deck.length) {
        const result = el('h3', 'fg-question', `${score} out of ${deck.length}`);
        result.tabIndex = -1;
        area.append(el('p', 'fg-eyebrow', 'THAT’S A WRAP'), result, el('p', 'fg-copy', 'Nice work! There’s always another corner of Canada to discover.'), button('Play again', () => { deck = shuffle(questions).slice(0, 8); index = 0; score = 0; draw(true); }));
        if (focus) result.focus();
        return;
      }
      const item = deck[index];
      const question = el('h3', 'fg-question', item.q);
      question.tabIndex = -1;
      area.append(el('p', 'fg-counter', `Question ${index + 1} of ${deck.length} · ${score} correct`), question);
      const choices = el('div', 'fg-choices');
      const feedback = status();
      const next = button(index === deck.length - 1 ? 'See results' : 'Next question', () => { index++; draw(true); });
      next.hidden = true;
      shuffle(item.a).forEach(answer => {
        const b = button(answer, () => {
          choices.querySelectorAll('button').forEach(choice => { choice.disabled = true; if (choice.textContent === item.a[0]) choice.classList.add('is-correct'); });
          if (answer === item.a[0]) { score++; feedback.textContent = `You got it!${item.note ? ' ' + item.note : ''}`; }
          else { b.classList.add('is-wrong'); feedback.textContent = `Good try! The answer is ${item.a[0]}.${item.note ? ' ' + item.note : ''}`; }
          next.hidden = false;
          next.focus();
        }, 'fg-choice');
        choices.append(b);
      });
      area.append(choices, feedback, next);
      if (focus) question.focus();
    }
    draw();
  }

  const words = [
    { word: 'TOQUE', hint: 'A warm winter hat.' },
    { word: 'POUTINE', hint: 'Fries, gravy and cheese curds.' },
    { word: 'LOONIE', hint: 'A golden one-dollar coin.' },
    { word: 'CANOE', hint: 'A paddle-powered classic.' },
    { word: 'BEAVER', hint: 'A busy builder with a flat tail.' },
    { word: 'MAPLE', hint: 'A leaf on the flag; also makes sweet syrup.' },
    { word: 'MOOSE', hint: 'A very large member of the deer family.' },
    { word: 'HOCKEY', hint: 'Pucks, sticks and ice.' },
    { word: 'KAYAK', hint: 'A small paddled boat with Inuit origins.' },
    { word: 'FLANNEL', hint: 'A cozy fabric for a chilly day.' },
    { word: 'NANAIMO', hint: 'A BC city and the name of a layered dessert bar.' },
    { word: 'BUTTERTART', hint: 'A sweet Canadian pastry. Two words, no space needed.' }
  ];
  function wordGame(root) {
    let deck = shuffle(words), round = 0, solved = 0;
    heading(root, 'A LITTLE WORDPLAY', 'The Great Unscramble', 'Unscramble a familiar Canadian word. Take your time; hints are on the house.');
    const area = el('div', 'fg-panel'); root.append(area);
    function draw() {
      const item = deck[round % deck.length];
      let scrambled = shuffle([...item.word]).join('');
      for (let i = 0; i < 8 && scrambled === item.word; i++) scrambled = shuffle([...item.word]).join('');
      area.replaceChildren();
      const progress = el('p', 'fg-counter', `${solved} solved · Word ${round + 1}`);
      const letters = el('p', 'fg-letters', scrambled.split('').join(' '));
      letters.setAttribute('aria-label', `Scrambled letters: ${scrambled.split('').join(', ')}`);
      const hint = el('p', 'fg-hint', `Hint: ${item.hint}`);
      const form = el('form', 'fg-form');
      const label = el('label', 'fg-label', 'Your answer');
      const input = el('input', 'fg-input');
      input.type = 'text'; input.autocomplete = 'off'; input.autocapitalize = 'characters'; input.spellcheck = false; input.maxLength = 30;
      label.append(input);
      const submit = el('button', 'fg-button', 'Check answer'); submit.type = 'submit';
      form.append(label, submit);
      const feedback = status();
      const next = button('Next word', () => { round++; draw(); area.querySelector('input').focus(); }, 'fg-button fg-button-secondary');
      const reveal = button('Reveal answer', () => { feedback.textContent = `The answer is ${item.word}. Try another when you’re ready.`; input.disabled = true; submit.disabled = true; reveal.disabled = true; next.focus(); }, 'fg-link');
      form.addEventListener('submit', event => {
        event.preventDefault();
        const guess = input.value.normalize('NFD').replace(/[\u0300-\u036f\s-]/g, '').toUpperCase();
        if (!guess) { feedback.textContent = 'Type a guess first.'; return; }
        if (guess === item.word) { solved++; progress.textContent = `${solved} solved · Word ${round + 1}`; feedback.textContent = 'You got it! Ready for another?'; input.disabled = true; submit.disabled = true; reveal.disabled = true; next.focus(); }
        else feedback.textContent = 'Not quite. Try again, or reveal the answer.';
      });
      area.append(progress, letters, hint, form, feedback, el('div', 'fg-actions'));
      area.lastChild.append(next, reveal);
    }
    draw();
  }

  const pairs = [
    ['🍁', 'maple leaf'], ['🛶', 'canoe'], ['🦫', 'beaver'], ['🏔️', 'mountain'], ['☕', 'coffee'], ['🧦', 'cozy socks'], ['🫐', 'blueberries'], ['🦉', 'owl'], ['🌲', 'evergreen tree'], ['🍂', 'fall leaf']
  ];
  function memory(root) {
    heading(root, 'A LITTLE BRAIN BREAK', 'Cabin Match', 'Find the matching pairs. No clock, just a cozy little brain break.');
    const info = el('p', 'fg-counter'); const board = el('div', 'fg-memory');
    board.setAttribute('aria-label', 'Memory card board');
    const feedback = status();
    const restart = button('Shuffle & start again', () => { start(); board.firstElementChild.focus(); }, 'fg-button fg-button-secondary');
    root.append(info, board, feedback, restart);
    let cards, first, locked, moves, matches, timer;
    function start() {
      clearTimeout(timer); first = null; locked = false; moves = 0; matches = 0;
      cards = shuffle(shuffle(pairs).slice(0, 6).flatMap(([emoji, name], pair) => [{ emoji, name, pair }, { emoji, name, pair }]));
      board.replaceChildren(); feedback.textContent = '';
      info.textContent = '0 pairs found · 0 moves';
      cards.forEach((card, index) => {
        const b = button('?', () => flip(index), 'fg-card');
        b.setAttribute('aria-label', `Card ${index + 1}, face down`);
        board.append(b);
      });
    }
    function flip(index) {
      const card = cards[index], b = board.children[index];
      if (locked || card.matched || card === first) return;
      b.textContent = card.emoji; b.classList.add('is-open');
      b.setAttribute('aria-label', `Card ${index + 1}, ${card.name}`);
      if (!first) { first = card; return; }
      moves++;
      if (card.pair === first.pair) {
        card.matched = true; first.matched = true; matches++;
        [...board.children].forEach((cell, i) => { if (cards[i].matched) { cell.classList.add('is-matched'); cell.disabled = true; cell.setAttribute('aria-label', `Card ${i + 1}, ${cards[i].name}, matched`); } });
        first = null;
        feedback.textContent = matches === 6 ? `All pairs found in ${moves} moves. Nicely done!` : 'A match!';
        (board.querySelector('button:not(:disabled)') || restart).focus();
      } else {
        const previous = first; first = null; locked = true;
        feedback.textContent = 'Not a match. Take another look.';
        timer = setTimeout(() => {
          [card, previous].forEach(c => {
            const i = cards.indexOf(c), cell = board.children[i];
            if (cell) { cell.textContent = '?'; cell.classList.remove('is-open'); cell.setAttribute('aria-label', `Card ${i + 1}, face down`); }
          });
          locked = false;
        }, 850);
      }
      info.textContent = `${matches} ${matches === 1 ? 'pair' : 'pairs'} found · ${moves} ${moves === 1 ? 'move' : 'moves'}`;
    }
    start();
    return () => clearTimeout(timer);
  }

  const squares = [
    'Saw a maple leaf', 'Had a cozy drink', 'Spotted a bird', 'Talked about the weather', 'Heard someone say “sorry”', 'Took the scenic route', 'Saw a dog in a sweater', 'Tried a local snack', 'Waved at a neighbour', 'Saw a ferry or a train', 'Wore an extra layer', 'Admired a sunset', 'Discovered a little shop', 'Went for a walk', 'Saw a mountain or a hill', 'Enjoyed a rainy day', 'Found a good view', 'Heard a familiar song', 'Made someone smile', 'Saw a Canadian flag', 'Noticed a cool old building', 'Watched clouds drift by', 'Took a photo', 'Visited a park', 'Found a cozy spot', 'Saw a bicycle', 'Ate something with maple', 'Heard a hockey reference', 'Spotted a squirrel', 'Took a proper break'
  ];
  function bingo(root) {
    heading(root, 'A LITTLE EVERYDAY ADVENTURE', 'The Little Things Bingo', 'A gentle scavenger hunt for your day. Tap the things you’ve experienced—no time limit, no rules about when.');
    const board = el('div', 'fg-bingo');
    board.setAttribute('aria-label', 'Bingo board');
    const feedback = status();
    root.append(board, feedback, button('Make a new card', start, 'fg-button fg-button-secondary'));
    function start() {
      board.replaceChildren(); feedback.textContent = 'Tap a square to mark it.';
      const picked = shuffle(squares).slice(0, 9);
      picked.forEach((text, i) => {
        const b = button(text, () => {
          const selected = b.getAttribute('aria-pressed') !== 'true';
          b.setAttribute('aria-pressed', String(selected)); b.classList.toggle('is-selected', selected);
          const cells = [...board.children].map(x => x.getAttribute('aria-pressed') === 'true');
          const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
          feedback.textContent = lines.some(line => line.every(n => cells[n])) ? 'Bingo! A little celebration for the little things.' : `${cells.filter(Boolean).length} of 9 marked.`;
        }, 'fg-square');
        b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', `${text}, square ${i + 1}`);
        board.append(b);
      });
    }
    start();
  }

  const list = [
    { id: 'trivia', title: 'The Canada Quiz', description: 'A little coast-to-coast trivia for curious minds.', tag: 'TRIVIA', icon: '🍁', tone: 'coral' },
    { id: 'unscramble', title: 'The Great Unscramble', description: 'Canadian words, all mixed up. Can you sort them out?', tag: 'WORD GAME', icon: '🔤', tone: 'yellow' },
    { id: 'memory', title: 'Cabin Match', description: 'Find the pairs and give your brain a cozy workout.', tag: 'MEMORY', icon: '🧦', tone: 'blue' },
    { id: 'bingo', title: 'The Little Things Bingo', description: 'A tiny scavenger hunt for the lovely, everyday stuff.', tag: 'JUST FOR FUN', icon: '✨', tone: 'green' }
  ];
  const games = { trivia, unscramble: wordGame, memory, bingo };
  let cleanup;
  window.FunGames = {
    list,
    mount(id, container) {
      if (!container || !games[id]) throw new Error('Unknown game or missing game container');
      if (cleanup) cleanup();
      container.replaceChildren();
      cleanup = games[id](container);
    },
    unmount(container) {
      if (cleanup) cleanup();
      cleanup = undefined;
      if (container) container.replaceChildren();
    }
  };
})();
