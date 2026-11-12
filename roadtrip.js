/* Tiny Road Trip: an offline, fictional choose-your-own-detour. */
(() => {
  'use strict';
  const routes = [
    {
      id: 'atlantic', title: 'Atlantic detour', icon: '🌊', subtitle: 'Salt air, harbour towns & coastal roads',
      intro: 'The air is cool and salty, and the day is yours. You follow a road toward the water with no particular schedule.',
      stops: [
        { title: 'A harbour morning', scene: 'Fishing boats rest by the wharf. A small bakery has just put out its sign.', choices: [
          ['Watch the harbour', 'You lean on the railing and watch the boats rock gently at their moorings.', 'watched the harbour wake up'],
          ['Visit the bakery', 'You pick something warm from the counter and save the last bite for later.', 'found a warm bakery treat']
        ] },
        { title: 'The long way around', scene: 'The road forks: one turn leads toward a beach, the other toward a little village.', choices: [
          ['Walk the beach', 'You wander along the shoreline, listening to the rhythm of the waves.', 'walked by the water'],
          ['Wander the village', 'You follow a colourful side street and browse a tiny second-hand shop.', 'found a second-hand shop']
        ] },
        { title: 'Before the light fades', scene: 'The afternoon softens. There is still time for one last stop.', choices: [
          ['Find a lookout', 'You settle in above the water and watch the light change.', 'watched the evening light'],
          ['Write a postcard', 'At a café table, you write a few lines to someone you miss.', 'wrote a postcard']
        ] }
      ]
    },
    {
      id: 'pacific', title: 'Pacific wandering', icon: '🌲', subtitle: 'Rainy roads, forest trails & ocean views',
      intro: 'A misty morning is lifting on the West Coast. You have a thermos, a full tank, and nowhere you need to be.',
      stops: [
        { title: 'A forest pause', scene: 'Tall evergreens line the road. A short trail and a coffee stop both look inviting.', choices: [
          ['Take the trail', 'You step into the cool forest and listen to the rain drip from the branches.', 'walked beneath the evergreens'],
          ['Get a coffee', 'You find a little café and warm your hands around a mug.', 'found a cozy café']
        ] },
        { title: 'By the water', scene: 'The clouds begin to part as you reach a stretch of shoreline.', choices: [
          ['Watch the water', 'You sit on a bench and watch the changing patterns on the water.', 'sat by the shoreline'],
          ['Explore the shops', 'You find a local bookshop and browse its travel shelves.', 'browsed a local bookshop']
        ] },
        { title: 'An evening decision', scene: 'The light is turning golden between the clouds.', choices: [
          ['Find a viewpoint', 'You take the scenic turn and find a quiet place to enjoy the view.', 'followed a scenic turn'],
          ['Make a sketch', 'You pull out a notebook and sketch the outlines of trees and water.', 'sketched the landscape']
        ] }
      ]
    },
    {
      id: 'prairies', title: 'Prairie skies', icon: '🌾', subtitle: 'Big horizons, small towns & open roads',
      intro: 'The horizon seems to stretch forever. With a big sky overhead, you set out to see where the day takes you.',
      stops: [
        { title: 'Small-town stop', scene: 'A main street appears ahead. A diner and a local museum both have their doors open.', choices: [
          ['Visit the diner', 'You order a coffee and linger over the handwritten specials.', 'stopped at a friendly diner'],
          ['Explore the museum', 'You spend a while looking through photographs and stories from the area.', 'explored a local museum']
        ] },
        { title: 'Room to breathe', scene: 'Beyond town, the wide-open landscape invites a slower pace.', choices: [
          ['Take a quiet walk', 'You stretch your legs and watch the grasses move in the wind.', 'took a quiet walk'],
          ['Photograph the sky', 'You frame the clouds above the horizon and take a few photos.', 'photographed the big sky']
        ] },
        { title: 'The road at dusk', scene: 'There is enough daylight left for one more gentle detour.', choices: [
          ['Find a picnic spot', 'You unpack a simple snack and settle down somewhere peaceful.', 'stopped for a picnic'],
          ['Watch the sunset', 'You park safely, switch off the engine, and watch the colours deepen.', 'watched the sky change colour']
        ] }
      ]
    },
    {
      id: 'central', title: 'Lakes & little towns', icon: '🛶', subtitle: 'Lakeside breaks, markets & scenic detours',
      intro: 'A ribbon of road leads between lakes, trees, and small towns. Your only plan is to make a few good stops.',
      stops: [
        { title: 'Morning by the lake', scene: 'The water is still. A public dock and a small café are both a short walk away.', choices: [
          ['Sit by the water', 'You spend a few quiet minutes watching the ripples.', 'sat by the lake'],
          ['Try the café', 'You order a warm drink and find a window seat.', 'found a window-seat café']
        ] },
        { title: 'A town worth a stop', scene: 'You spot a community market and a used-book store on the next main street.', choices: [
          ['Browse the market', 'You wander between stalls, admiring local crafts and seasonal treats.', 'browsed a community market'],
          ['Visit the bookshop', 'You find a well-loved paperback with a handwritten note inside.', 'found a second-hand book']
        ] },
        { title: 'Afternoon outdoors', scene: 'A trail and a picnic table catch your eye.', choices: [
          ['Follow the trail', 'You head out for a short walk through the trees.', 'walked through the trees'],
          ['Have a picnic', 'You spread out a snack and enjoy the lack of an agenda.', 'had an unhurried picnic']
        ] }
      ]
    },
    {
      id: 'north', title: 'Northern daydream', icon: '✨', subtitle: 'Big skies, quiet trails & northern light',
      intro: 'This imagined northern day trip starts with a wide sky, a thermos, and plenty of time to take it all in.',
      stops: [
        { title: 'The first stop', scene: 'You come across a small community stop and a trailhead nearby.', choices: [
          ['Visit the café', 'You warm up with a drink and take a few minutes to relax.', 'warmed up at a café'],
          ['Walk the trail', 'You take a short walk and admire the quiet landscape.', 'took a quiet trail']
        ] },
        { title: 'A little discovery', scene: 'The day is open-ended. A community gallery and a viewpoint both sound appealing.', choices: [
          ['Explore the gallery', 'You spend time with art and stories shared by local creators.', 'visited a community gallery'],
          ['Find the viewpoint', 'You stop at a viewpoint and let the landscape fill your field of vision.', 'found a wide-open view']
        ] },
        { title: 'A quiet finish', scene: 'You settle in for a peaceful end to your day.', choices: [
          ['Write in a journal', 'You jot down the little details you want to remember.', 'wrote a few journal notes'],
          ['Look up at the sky', 'You put your phone away for a moment and simply watch the sky.', 'spent a moment watching the sky']
        ] }
      ]
    }
  ];
  const make = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const button = (text, handler, cls = 'fg-button') => {
    const el = make('button', cls, text); el.type = 'button'; el.addEventListener('click', handler); return el;
  };
  function mount(root) {
    let route = null, step = 0, selected = null, journal = [];
    root.replaceChildren();
    const area = make('div', 'rt-root');
    root.append(area);
    function focusHeading() {
      const h = area.querySelector('.rt-screen-title');
      if (h) { h.tabIndex = -1; h.focus(); }
    }
    function routePicker(focus = false) {
      route = null; step = 0; selected = null; journal = [];
      area.replaceChildren();
      const header = make('div', 'fg-heading');
      header.append(make('p', 'fg-eyebrow', 'A LITTLE SCENIC DETOUR'), make('h2', 'fg-title rt-screen-title', 'Tiny Road Trip'), make('p', 'fg-intro', 'Pick a corner of Canada and follow your curiosity. Three stops, no clock, and no wrong turns.'));
      const note = make('p', 'rt-note', 'These are fictional, region-inspired trips—not driving directions.');
      const grid = make('div', 'rt-routes');
      routes.forEach(item => {
        const b = button('', () => { route = item; drawStop(true); }, 'rt-route');
        const icon = make('span', 'rt-icon', item.icon); icon.setAttribute('aria-hidden', 'true');
        const copy = make('span', 'rt-route-copy'); copy.append(make('strong', '', item.title), make('span', '', item.subtitle));
        const arrow = make('span', 'rt-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
        b.append(icon, copy, arrow); grid.append(b);
      });
      area.append(header, note, grid);
      if (focus) focusHeading();
    }
    function drawStop(focus = false) {
      area.replaceChildren();
      const stage = route.stops[step];
      const context = make('p', 'fg-eyebrow', `${route.icon}  ${route.title.toUpperCase()} · STOP ${step + 1} OF ${route.stops.length}`);
      const progress = make('div', 'rt-progress');
      progress.setAttribute('role', 'img'); progress.setAttribute('aria-label', `Stop ${step + 1} of ${route.stops.length}`);
      route.stops.forEach((_, i) => { const dot = make('span', i <= step ? 'is-current' : ''); progress.append(dot); });
      const heading = make('h2', 'fg-title rt-screen-title', stage.title);
      const scene = make('p', 'fg-intro', (step === 0 ? route.intro + ' ' : '') + stage.scene);
      const panel = make('div', 'fg-panel rt-panel');
      const prompt = make('p', 'rt-prompt', 'What sounds good?');
      const choices = make('div', 'fg-choices');
      const feedback = make('div', 'rt-feedback'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
      const continueBtn = button(step === route.stops.length - 1 ? 'Finish the trip' : 'On to the next stop', () => {
        journal.push(selected); selected = null; step++;
        if (step === route.stops.length) drawFinish(); else drawStop(true);
      });
      continueBtn.hidden = true;
      stage.choices.forEach(option => {
        const choice = button(option[0], () => {
          selected = option;
          [...choices.children].forEach(b => { b.setAttribute('aria-pressed', String(b === choice)); b.classList.toggle('is-selected', b === choice); });
          feedback.textContent = option[1]; continueBtn.hidden = false;
        }, 'fg-choice rt-choice');
        choice.setAttribute('aria-pressed', 'false'); choices.append(choice);
      });
      panel.append(prompt, choices, feedback, continueBtn);
      const back = button('Choose another trip', () => routePicker(true), 'fg-link rt-back');
      area.append(context, progress, heading, scene, panel, back);
      if (focus) focusHeading();
    }
    function drawFinish() {
      area.replaceChildren();
      const header = make('div', 'fg-heading');
      header.append(make('p', 'fg-eyebrow', `${route.icon}  YOUR LITTLE GETAWAY`), make('h2', 'fg-title rt-screen-title', 'A day well spent.'), make('p', 'fg-intro', `You took the ${route.title.toLowerCase()} at your own pace. Here’s what you found along the way:`));
      const panel = make('div', 'fg-panel rt-journal');
      const list = make('ol', 'rt-journal-list'); journal.forEach(entry => list.append(make('li', '', entry[2])));
      panel.append(make('p', 'rt-prompt', 'YOUR TRAVEL NOTES'), list, make('p', 'rt-closing', 'No souvenirs required. Just a little room to daydream.'));
      area.append(header, panel, button('Choose another trip', () => routePicker(true), 'fg-button rt-again'));
      focusHeading();
    }
    routePicker();
  }
  window.RoadTripGame = {
    info: { id: 'roadtrip', title: 'Tiny Road Trip', description: 'Choose a region, take the scenic route, and see where the day leads.', tag: 'CHOOSE YOUR OWN DETOUR', icon: '🚙', tone: 'sage' },
    mount
  };
})();
