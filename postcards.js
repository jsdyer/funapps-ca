/* Postcard Shuffle — a self-contained extension for Fun Apps. */
(() => {
  'use strict';
  if (!window.FunGames) return;

  // Facts refer to established place names and park descriptions, not live travel advice.
  const cards = [
    { place: 'Greenwich Dunes', province: 'Prince Edward Island', region: 'Atlantic Canada', icon: '🏖️', clue: 'Dear friend, today I followed a floating boardwalk across a pond toward sweeping dunes. A sea breeze is doing its best to carry this postcard away.', fact: 'The Greenwich Dunes Trail crosses Bowley Pond in Prince Edward Island National Park.', url: 'https://parks.canada.ca/pn-np/pe/pei-ipe/activ/sentiers-trails/greenwich-dune' },
    { place: 'L’Anse aux Meadows', province: 'Newfoundland and Labrador', region: 'Atlantic Canada', icon: '🧭', clue: 'Dear friend, I have reached the tip of a great northern peninsula, where archaeologists found traces of a Norse settlement.', fact: 'L’Anse aux Meadows is an archaeological site on Newfoundland’s Great Northern Peninsula.', url: 'https://parks.canada.ca/lhn-nhs/nl/meadows' },
    { place: 'Gros Morne', province: 'Newfoundland and Labrador', region: 'Atlantic Canada', icon: '⛰️', clue: 'Dear friend, the rust-coloured Tablelands look like a piece of another planet. The mountains and water make a pretty wonderful backdrop, too.', fact: 'The Tablelands are a distinctive landscape in Gros Morne National Park.', url: 'https://parks.canada.ca/pn-np/nl/grosmorne' },
    { place: 'Hopewell Rocks', province: 'New Brunswick', region: 'Atlantic Canada', icon: '🌊', clue: 'Dear friend, the sea here has a very ambitious daily routine. At low tide, tall flowerpot-shaped rocks stand above the shore.', fact: 'The Hopewell Rocks are on the Bay of Fundy in New Brunswick.', url: 'https://www.thehopewellrocks.ca/' },
    { place: 'Cabot Trail', province: 'Nova Scotia', region: 'Atlantic Canada', icon: '🚙', clue: 'Dear friend, the road curves along the coast and climbs through the highlands of Cape Breton Island. Every bend asks for another photo stop.', fact: 'The Cabot Trail runs through Cape Breton Highlands National Park.', url: 'https://parks.canada.ca/pn-np/ns/cbreton' },
    { place: 'Old Québec', province: 'Quebec', region: 'Central Canada', icon: '🏘️', clue: 'Dear friend, I’m wandering the historic streets of a walled city above the St. Lawrence River, with a famous château on the skyline.', fact: 'Historic Old Québec is a UNESCO World Heritage site.', url: 'https://whc.unesco.org/en/list/300/' },
    { place: 'Rideau Canal', province: 'Ontario', region: 'Central Canada', icon: '🚣', clue: 'Dear friend, a waterway joins Ottawa and Kingston, passing locks, towns and lakes along the way. I’m sending this from the towpath.', fact: 'The Rideau Canal links Ottawa and Kingston, Ontario.', url: 'https://parks.canada.ca/lhn-nhs/on/rideau' },
    { place: 'Churchill', province: 'Manitoba', region: 'The Prairies', icon: '🐻‍❄️', clue: 'Dear friend, I’m by Hudson Bay in a northern town known for polar bears, beluga whales and skies worth looking up for.', fact: 'Churchill sits on the shore of Hudson Bay in northern Manitoba.' },
    { place: 'Grasslands National Park', province: 'Saskatchewan', region: 'The Prairies', icon: '🌾', clue: 'Dear friend, the horizon seems to go on forever. Prairie grass moves in the wind, and the night sky is worth staying up for.', fact: 'Grasslands National Park protects prairie grasslands in southern Saskatchewan.', url: 'https://parks.canada.ca/pn-np/sk/grasslands' },
    { place: 'Dinosaur Provincial Park', province: 'Alberta', region: 'The Prairies', icon: '🦕', clue: 'Dear friend, I’m among sculpted badlands where fossils have been found. This is a very old landscape with excellent dinosaur stories.', fact: 'Dinosaur Provincial Park in Alberta is a UNESCO World Heritage site.', url: 'https://whc.unesco.org/en/list/71/' },
    { place: 'Pacific Rim National Park Reserve', province: 'British Columbia', region: 'The Pacific coast', icon: '🌲', clue: 'Dear friend, mist hangs in the rainforest behind a long beach on Vancouver Island’s west coast. I’ve brought a raincoat, naturally.', fact: 'Pacific Rim National Park Reserve is on the west coast of Vancouver Island.', url: 'https://parks.canada.ca/pn-np/bc/pacificrim' },
    { place: 'Dawson City', province: 'Yukon', region: 'Northern Canada', icon: '🛶', clue: 'Dear friend, the Yukon River flows past this town with deep connections to the Klondike Gold Rush and the Tr’ondëk Hwëch’in.', fact: 'Dawson City is part of the traditional territory of the Tr’ondëk Hwëch’in.', url: 'https://parks.canada.ca/lhn-nhs/yt/klondike/activ/dawson' },
    { place: 'Nahanni National Park Reserve', province: 'Northwest Territories', region: 'Northern Canada', icon: '🏞️', clue: 'Dear friend, I’m imagining a journey along the South Nahanni River, past canyons and the powerful Virginia Falls, or Náįlįcho.', fact: 'Náįlįcho (Virginia Falls) is in Nahanni National Park Reserve.', url: 'https://parks.canada.ca/pn-np/nt/nahanni' },
    { place: 'Auyuittuq National Park', province: 'Nunavut', region: 'Northern Canada', icon: '🏔️', clue: 'Dear friend, this national park on Baffin Island is a landscape of glaciers, fjords and dramatic mountain peaks.', fact: 'Auyuittuq National Park is on Baffin Island in Nunavut.', url: 'https://parks.canada.ca/pn-np/nu/auyuittuq' },
    { place: 'Waterton Lakes', province: 'Alberta', region: 'The Prairies', icon: '🏔️', clue: 'Dear friend, I’ve found a place where prairie gives way to mountains, near the border with Montana. The lake is the perfect shade of blue.', fact: 'Waterton Lakes National Park is in southwestern Alberta.', url: 'https://parks.canada.ca/pn-np/ab/waterton' },
    { place: 'Fundy National Park', province: 'New Brunswick', region: 'Atlantic Canada', icon: '🌲', clue: 'Dear friend, I’ve left the shore and stepped into a forest of trails and waterfalls beside the Bay of Fundy.', fact: 'Fundy National Park is on the Bay of Fundy in New Brunswick.', url: 'https://parks.canada.ca/pn-np/nb/fundy' },
    { place: 'Kejimkujik', province: 'Nova Scotia', region: 'Atlantic Canada', icon: '🛶', clue: 'Dear friend, I’m picturing a paddle through lakes and rivers at a place that is both a national park and a national historic site.', fact: 'Kejimkujik National Park and National Historic Site is in Nova Scotia.', url: 'https://parks.canada.ca/pn-np/ns/kejimkujik' },
    { place: 'Prince Albert National Park', province: 'Saskatchewan', region: 'The Prairies', icon: '🦉', clue: 'Dear friend, my prairie postcard has a surprise: boreal forest, lakes and a place called Waskesiu.', fact: 'Waskesiu Lake is within Prince Albert National Park in Saskatchewan.', url: 'https://parks.canada.ca/pn-np/sk/princealbert' }
  ];
  const provinces = ['British Columbia', 'Alberta', 'Saskatchewan', 'Manitoba', 'Ontario', 'Quebec', 'New Brunswick', 'Nova Scotia', 'Prince Edward Island', 'Newfoundland and Labrador', 'Yukon', 'Northwest Territories', 'Nunavut'];
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const button = (text, fn, cls = 'fg-button') => { const node = el('button', cls, text); node.type = 'button'; node.addEventListener('click', fn); return node; };

  function play(root) {
    let deck, index, firstTry, attempts, current, guessed;
    const header = el('div', 'fg-heading');
    header.append(el('p', 'fg-eyebrow', 'A LITTLE TRIP THROUGH THE MAIL'), el('h2', 'fg-title', 'Postcard Shuffle'), el('p', 'fg-intro', 'Five postcards from across Canada. Read the clue, then guess the province or territory. No timer, and you can keep guessing.'));
    const area = el('div', 'pc-area'); root.append(header, area);
    function start() { deck = shuffle(cards).slice(0, 5); index = 0; firstTry = 0; draw(); }
    function draw() {
      current = deck[index]; attempts = 0; guessed = false;
      area.replaceChildren();
      const counter = el('p', 'fg-counter', `Postcard ${index + 1} of ${deck.length} · ${firstTry} first-try ${firstTry === 1 ? 'stamp' : 'stamps'}`);
      const card = el('div', 'pc-postcard');
      const corner = el('div', 'pc-corner');
      corner.append(el('span', 'pc-postmark', 'CANADA POSTCARD CLUB'), el('span', 'pc-stamp', current.icon));
      const clue = el('p', 'pc-message', current.clue);
      card.append(corner, clue, el('p', 'pc-signature', 'Wish you were here  ✳'));
      const question = el('h3', 'pc-question', 'Where was this postcard written?'); question.tabIndex = -1;
      const choices = el('div', 'pc-choices');
      choices.setAttribute('aria-label', 'Choose a province or territory');
      const feedback = el('p', 'fg-status'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      const hint = el('p', 'pc-hint'); hint.hidden = true;
      const details = el('div', 'pc-details'); details.hidden = true;
      const title = el('strong', '', current.place + ' · ' + current.province);
      details.append(title, el('p', '', current.fact));
      if (current.url) { const link = el('a', '', 'Explore this place ↗'); link.href = current.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; details.append(link); }
      const actions = el('div', 'fg-actions');
      const hintButton = button('Show a hint', () => { hint.textContent = `Hint: ${current.region}.`; hint.hidden = false; hintButton.disabled = true; }, 'fg-link');
      const revealButton = button('Reveal answer', () => finish(false), 'fg-link');
      const nextButton = button(index === deck.length - 1 ? 'See your trip' : 'Next postcard', () => { index++; draw(); area.querySelector('.pc-question, .pc-result-title')?.focus(); });
      nextButton.hidden = true;
      const options = shuffle([current.province, ...shuffle(provinces.filter(p => p !== current.province)).slice(0, 3)]);
      options.forEach(option => {
        const b = button(option, () => {
          if (guessed) return;
          attempts++;
          if (option === current.province) { if (attempts === 1) firstTry++; finish(true); }
          else { b.disabled = true; b.classList.add('pc-miss'); feedback.textContent = 'Not this time. Try another place or open a hint.'; }
        }, 'fg-choice');
        choices.append(b);
      });
      function finish(correct) {
        guessed = true;
        choices.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.textContent === current.province) b.classList.add('is-correct'); });
        feedback.textContent = correct ? (attempts === 1 ? 'You found it on your first try! A stamp for your collection.' : 'You found it!') : `This postcard came from ${current.province}.`;
        details.hidden = false; hintButton.hidden = true; revealButton.hidden = true; nextButton.hidden = false;
        counter.textContent = `Postcard ${index + 1} of ${deck.length} · ${firstTry} first-try ${firstTry === 1 ? 'stamp' : 'stamps'}`;
      }
      actions.append(hintButton, revealButton, nextButton);
      area.append(counter, card, question, choices, hint, feedback, details, actions);
    }
    // The last Next button finishes the deck without introducing a sixth card.
    const originalDraw = draw;
    draw = function () {
      if (index < deck.length) return originalDraw();
      area.replaceChildren();
      const result = el('div', 'pc-result');
      const title = el('h3', 'pc-result-title', 'A little trip, well travelled.'); title.tabIndex = -1;
      result.append(el('p', 'fg-eyebrow', 'YOUR POSTCARD COLLECTION'), title, el('p', 'fg-intro', `You explored ${deck.length} places and collected ${firstTry} first-try ${firstTry === 1 ? 'stamp' : 'stamps'}.`));
      const recap = el('ul', 'pc-recap'); deck.forEach(item => recap.append(el('li', '', `${item.place} · ${item.province}`)));
      result.append(recap, button('Shuffle a new trip', () => { start(); area.querySelector('.pc-question')?.focus(); }));
      area.append(result);
    };
    start();
  }

  const previousMount = window.FunGames.mount.bind(window.FunGames);
  window.FunGames.list.push({ id: 'postcards', title: 'Postcard Shuffle', description: 'Follow a few clues on a coast-to-coast postcard trip.', tag: 'EXPLORE CANADA', icon: '💌', tone: 'coral' });
  window.FunGames.mount = function (id, container) {
    if (id !== 'postcards') return previousMount(id, container);
    window.FunGames.unmount(container);
    play(container);
  };
})();
