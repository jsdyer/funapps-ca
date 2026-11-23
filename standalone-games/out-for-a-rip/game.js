(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const WORLD = { w: 3600, h: 2400 };

  const ui = {
    menu: $('menu'), topbar: $('topbar'), missionCard: $('missionCard'), radio: $('radio'), radioText: $('radioText'),
    upgradeScreen: $('upgradeScreen'), shedScreen: $('shedScreen'), pauseScreen: $('pauseScreen'),
    gameOverScreen: $('gameOverScreen'), helpScreen: $('helpScreen'), mobileControls: $('mobileControls'),
    hudDeliveries: $('hudDeliveries'), hudScore: $('hudScore'), hudTime: $('hudTime'), cargoIcon: $('cargoIcon'),
    missionTitle: $('missionTitle'), missionRoute: $('missionRoute'), healthBar: $('healthBar'), boostBar: $('boostBar'),
    weatherText: $('weatherText'), comboText: $('comboText'), bestScore: $('bestScore'), bestDeliveries: $('bestDeliveries'),
    bankCoins: $('bankCoins'), shedCoins: $('shedCoins'), shedChoices: $('shedChoices'), upgradeChoices: $('upgradeChoices'),
    resultStamp: $('resultStamp'), resultTitle: $('resultTitle'), resultReason: $('resultReason'), resultScore: $('resultScore'),
    resultDeliveries: $('resultDeliveries'), resultCombo: $('resultCombo'), resultCoins: $('resultCoins'), resultQuote: $('resultQuote'),
    soundBtn: $('soundBtn'), toastStack: $('toastStack')
  };

  const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const formatNum = (n) => Math.floor(n).toLocaleString('en-CA');
  const formatTime = (s) => { const seconds = Math.max(0, Math.ceil(s)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function mulberry32(seed) {
    return function rand() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const mapRand = mulberry32(90210);

  const HOME_BONUSES = {
    NS: { name: 'Nova Scotia', roadSpeed: 1.05, timer: 0, offroad: 1, weather: 1, horn: 1 },
    NB: { name: 'New Brunswick', roadSpeed: 1, timer: 14, offroad: 1, weather: 1, horn: 1 },
    PE: { name: 'PEI', roadSpeed: 1, timer: 0, offroad: 1.22, weather: 1, horn: 1 },
    NL: { name: 'Newfoundland & Labrador', roadSpeed: 1, timer: 0, offroad: 1, weather: .78, horn: 1.2 }
  };

  const TOWNS = [
    { x: 1780, y: 1130, name: 'Halifax-ish', short: 'Halifax-ish', icon: '⚓' },
    { x: 2090, y: 980, name: 'Deep Dartmouth', short: 'Dartmouth', icon: '🌉' },
    { x: 2450, y: 690, name: 'Upper Lower Musquodoboit-ish', short: 'Musquodoboit-ish', icon: '🌲' },
    { x: 2960, y: 1120, name: 'North Sydney Ferry Line', short: 'North Sydney', icon: '⛴️' },
    { x: 3200, y: 550, name: 'Corner Brook Eventually', short: 'Corner Brook', icon: '⛰️' },
    { x: 2840, y: 1850, name: "St. John's, Not Saint John", short: "St. John's", icon: '🫖' },
    { x: 2190, y: 1930, name: 'The Other Side of the Causeway', short: 'The Causeway', icon: '🎻' },
    { x: 1450, y: 1910, name: 'Charlottetown Adjacent', short: 'Charlottetown', icon: '🥔' },
    { x: 900, y: 1710, name: 'Sackville Marsh & Snacks', short: 'Sackville', icon: '🪿' },
    { x: 520, y: 1270, name: 'Moncton Roundabout District', short: 'Moncton', icon: '🔄' },
    { x: 710, y: 660, name: 'Saint John, Not St. John’s', short: 'Saint John', icon: '🌫️' },
    { x: 1310, y: 430, name: 'Miramichi-ish', short: 'Miramichi', icon: '🐟' },
    { x: 1710, y: 610, name: 'Lunenburg Parking Search', short: 'Lunenburg', icon: '⛵' },
    { x: 1110, y: 1080, name: 'Digby Scallop Orbit', short: 'Digby', icon: '🦪' }
  ];

  const ROAD_LINKS = [
    [0,1],[0,12],[0,13],[0,6],[0,7],[1,2],[1,3],[2,3],[3,4],[3,6],[4,5],[5,6],[6,7],[7,8],
    [8,9],[9,10],[9,13],[10,11],[11,12],[12,0],[13,10],[13,8],[11,2]
  ];

  const CARGO = [
    { icon: '🥔', name: 'storm chips', line: 'The clouds looked at the province funny.' },
    { icon: '🥙', name: 'garlic fingers & emergency donair sauce', line: 'The sauce-to-finger ratio has become critical.' },
    { icon: '🪑', name: 'six folding chairs', line: 'There are forty people and eight chairs. Maritime mathematics.' },
    { icon: '🎻', name: 'the backup fiddler', line: 'The first fiddler has been playing since noon and can now see sound.' },
    { icon: '🫖', name: 'a heroic quantity of tea', line: 'Someone said “I’m fine” in a tone requiring immediate tea.' },
    { icon: '🧊', name: 'a cooler full of pop', line: 'Nobody bought ice because everybody assumed somebody bought ice.' },
    { icon: '🍞', name: 'church-basement squares', line: 'They are mostly icing and structural optimism.' },
    { icon: '🦞', name: 'lobster elastics', line: 'Do not ask what happened to the first bag.' },
    { icon: '📻', name: 'the good kitchen radio', line: 'The current one only gets weather and one call-in show.' },
    { icon: '🧂', name: 'road salt', line: 'It is July, but nobody trusts July.' },
    { icon: '🥫', name: 'emergency pantry supplies', line: 'A casserole has expanded beyond its original mandate.' },
    { icon: '🧦', name: 'dry socks for everyone', line: 'The deck looked dry from inside.' }
  ];

  const RADIO_LINES = [
    'Traffic update: the bridge is backed up because somebody hesitated near an exit.',
    'Forecast: rain, followed by a brief period where the rain is technically mist.',
    'Caller reports a moose by the old gas station. Which old gas station? Correct.',
    'Directions are “left where the barn used to be,” then “you’ll know.”',
    'Ferry update: delayed due to being a ferry.',
    'Tourist report: one rental RV is reconsidering every life choice on a narrow road.',
    'Halifax update: everyone is moving to Dartmouth and acting like it was their own idea.',
    'PEI traffic is backed up behind one tractor. This is a province-wide bulletin.',
    'New Brunswick update: you missed the exit and are now receiving directions bilingually.',
    'Newfoundland update: the road is open. The weather has other plans.',
    'Cape Breton update: the kitchen party has absorbed two neighbouring houses.',
    'A local man says the pothole “wasn’t there yesterday,” which is somehow not reassuring.',
    'Reminder: Saint John and St. John’s remain two different places despite decades of confusion.',
    'The nice day has been rescheduled to a weekday while you are working.',
    'Somebody’s cousin can fix it cheaper. This statement has never required evidence.',
    'Road crews have put up a sign confirming the bump you just hit was intentional.',
    'Breaking: a gull has stolen something expensive and is showing no remorse.',
    'Community hall capacity is listed as 80, which locally means 146 plus three dogs.',
    'The phrase “just down the road” may indicate any distance under three hours.',
    'You have entered a cellular dead zone. Locals call it “outside.”'
  ];

  const WEATHER = [
    { id: 'decent', name: 'Suspiciously decent', duration: [28, 40], wind: 0, grip: 1, visibility: 1, rain: 0, tint: 'rgba(255,220,120,.03)' },
    { id: 'drizzle', name: 'Fine Atlantic drizzle', duration: [32, 48], wind: 18, grip: .94, visibility: .92, rain: .45, tint: 'rgba(90,150,170,.10)' },
    { id: 'sideways', name: 'Rain, now sideways', duration: [28, 42], wind: 62, grip: .88, visibility: .82, rain: .85, tint: 'rgba(55,105,145,.17)' },
    { id: 'fog', name: 'Fog with opinions', duration: [28, 44], wind: 5, grip: .96, visibility: .46, rain: .12, tint: 'rgba(220,235,235,.22)' },
    { id: 'noreaster', name: 'A proper nor’easter', duration: [24, 36], wind: 105, grip: .78, visibility: .65, rain: 1, tint: 'rgba(35,70,110,.25)' },
    { id: 'blackflies', name: 'Blackfly convention', duration: [26, 38], wind: 0, grip: .98, visibility: .9, rain: 0, tint: 'rgba(80,70,45,.08)' },
    { id: 'tourists', name: 'Peak tourist season', duration: [32, 46], wind: 0, grip: 1, visibility: 1, rain: 0, tint: 'rgba(255,180,75,.06)' }
  ];

  const RUN_UPGRADES = [
    { id: 'duct', icon: '🩹', title: 'Industrial Duct Tape', desc: '+28 vehicle condition now and +8 maximum condition.', apply: p => { p.maxHealth += 8; p.health = Math.min(p.maxHealth, p.health + 28); } },
    { id: 'thermos', icon: '☕', title: 'Unreasonably Large Thermos', desc: '+25 maximum coffee and faster coffee recovery.', apply: p => { p.maxBoost += 25; p.boost = p.maxBoost; p.boostRegen += 2.5; } },
    { id: 'suspension', icon: '🛞', title: 'Cousin’s “Good” Suspension', desc: 'Less slowdown off-road and potholes hurt less.', apply: p => { p.offroadGrip += .12; p.potholeResist = Math.min(.85, p.potholeResist + .18); } },
    { id: 'engine', icon: '🔧', title: 'Engine Light Electrical Tape', desc: '+9% top speed. The light can no longer hurt you.', apply: p => { p.speed *= 1.09; } },
    { id: 'horn', icon: '📯', title: 'Ferry-Terminal Horn', desc: 'Bigger horn blast and shorter cooldown.', apply: p => { p.hornPower += .28; p.hornMaxCd *= .82; } },
    { id: 'map', icon: '🗺️', title: 'Directions From a Local', desc: '+24 seconds. Only three landmarks no longer exist.', apply: () => { run.time += 24; } },
    { id: 'sauce', icon: '🥣', title: 'Extra Donair Sauce', desc: '+15% score and your cargo survives one extra bump.', apply: p => { p.scoreMult += .15; p.cargoShield += 1; } },
    { id: 'tires', icon: '🌧️', title: 'Four Matching Tires', desc: 'A luxury item. Better grip in rain and snow-adjacent rain.', apply: p => { p.weatherGrip += .13; } },
    { id: 'refund', icon: '🪙', title: 'Bag of Empties', desc: '+8 bottle refunds immediately and more empties appear.', apply: p => { run.coins += 8; p.coinLuck += .22; } },
    { id: 'radio', icon: '📻', title: 'CBC-Compatible Radio', desc: 'Combos decay slower and deliveries add more time.', apply: p => { p.comboHold += 2.5; p.deliveryTime += 2; } }
  ];

  const SHED_UPGRADES = [
    { id: 'rust', icon: '🚙', title: 'Actual Rustproofing', desc: '+8 starting vehicle condition per level.', max: 5, base: 12 },
    { id: 'mug', icon: '☕', title: 'Trunk Thermos', desc: '+10 starting coffee capacity per level.', max: 5, base: 12 },
    { id: 'springs', icon: '🛞', title: 'Reinforced Suspension', desc: 'Better permanent off-road grip.', max: 5, base: 16 },
    { id: 'airhorn', icon: '📯', title: 'Marine-Grade Horn', desc: 'Stronger permanent horn blast.', max: 4, base: 18 },
    { id: 'shortcut', icon: '🗺️', title: 'Cousin’s Shortcut Map', desc: '+5 starting seconds per level.', max: 5, base: 14 },
    { id: 'deposit', icon: '🪙', title: 'Sorted Empties', desc: 'More bottle-refund pickups appear.', max: 4, base: 20 }
  ];

  const storeDefaults = { bestScore: 0, bestDeliveries: 0, coins: 0, home: 'NS', sound: true, upgrades: {}, achievements: {} };
  let save = loadSave();
  let mode = 'menu';
  let dpr = 1, viewW = innerWidth, viewH = innerHeight;
  let last = performance.now();
  let run = null;
  let player = null;
  let camera = { x: 0, y: 0, shake: 0 };
  let entities = [];
  let particles = [];
  let decorations = [];
  let rainDrops = [];
  let keys = Object.create(null);
  let mobileAxis = { x: 0, y: 0 };
  let mobileBoost = false;
  let radioTimer = 0;
  let radioHideTimer = 0;
  let lastHudUpdate = 0;

  function loadSave() {
    const clean = { ...storeDefaults, upgrades: {}, achievements: {} };
    try {
      const stored = JSON.parse(localStorage.getItem('outForARipSave') || '{}');
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return clean;
      for (const key of ['bestScore', 'bestDeliveries', 'coins']) {
        const value = stored[key];
        if (Number.isFinite(value) && value >= 0) clean[key] = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value));
      }
      if (Object.hasOwn(HOME_BONUSES, stored.home)) clean.home = stored.home;
      if (typeof stored.sound === 'boolean') clean.sound = stored.sound;
      for (const upgrade of SHED_UPGRADES) {
        const level = stored.upgrades?.[upgrade.id];
        clean.upgrades[upgrade.id] = Number.isInteger(level) ? clamp(level, 0, upgrade.max) : 0;
      }
      for (const id of ['first', 'ten', 'names']) clean.achievements[id] = stored.achievements?.[id] === true;
    } catch {}
    return clean;
  }
  function persist() {
    try { localStorage.setItem('outForARipSave', JSON.stringify(save)); } catch {}
    updateMenuStats();
  }

  function resize() {
    viewW = innerWidth;
    viewH = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeRain();
  }
  addEventListener('resize', resize);
  resize();

  function makeDecorations() {
    decorations = [];
    for (let i = 0; i < 380; i++) {
      const x = 80 + mapRand() * (WORLD.w - 160);
      const y = 80 + mapRand() * (WORLD.h - 160);
      const r = mapRand();
      let type = r < .55 ? 'tree' : r < .66 ? 'rock' : r < .76 ? 'pond' : r < .87 ? 'field' : r < .94 ? 'house' : 'lighthouse';
      if (TOWNS.some(t => Math.hypot(t.x - x, t.y - y) < 135)) continue;
      if (distanceToRoad(x, y) < 62) continue;
      decorations.push({ x, y, type, s: .7 + mapRand() * .75, rot: mapRand() * TAU });
    }
  }

  function makeRain() {
    rainDrops = Array.from({ length: 160 }, () => ({ x: Math.random() * viewW, y: Math.random() * viewH, l: 10 + Math.random() * 22, s: 420 + Math.random() * 480 }));
  }

  function distanceToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const wx = px - ax, wy = py - ay;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - ax, py - ay);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - bx, py - by);
    const b = c1 / c2;
    return Math.hypot(px - (ax + b * vx), py - (ay + b * vy));
  }

  function distanceToRoad(x, y) {
    let min = Infinity;
    for (const [a, b] of ROAD_LINKS) {
      const p = TOWNS[a], q = TOWNS[b];
      min = Math.min(min, distanceToSegment(x, y, p.x, p.y, q.x, q.y));
    }
    return min;
  }

  class AudioManager {
    constructor() { this.ctx = null; this.enabled = save.sound !== false; this.musicClock = 0; this.note = 0; }
    init() {
      if (!this.enabled) return;
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Audio unavailable');
        if (!this.ctx) this.ctx = new Audio();
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      } catch { this.enabled = false; save.sound = false; updateMenuStats(); }
    }
    tone(freq, dur=.1, type='sine', volume=.035, slide=0) {
      if (!this.enabled) return;
      this.init();
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + dur + .03);
    }
    horn() { this.tone(190, .26, 'square', .06, -30); setTimeout(() => this.tone(155, .2, 'square', .04, -15), 70); }
    bump() { this.tone(85, .18, 'sawtooth', .06, -35); }
    pickup() { this.tone(660, .06, 'sine', .03, 180); }
    delivery() { [392,494,587,784].forEach((n,i) => setTimeout(() => this.tone(n,.18,'triangle',.04), i*65)); }
    click() { this.tone(420,.04,'square',.018,80); }
    gameover() { [330,277,220,165].forEach((n,i)=>setTimeout(()=>this.tone(n,.28,'triangle',.035,-20),i*130)); }
    update(dt) {
      if (!this.enabled || mode !== 'game') return;
      this.musicClock -= dt;
      if (this.musicClock <= 0) {
        this.musicClock = .28;
        const seq = [196,247,294,330,294,247,220,247,294,392,330,294,247,220,196,247];
        const n = seq[this.note++ % seq.length];
        this.tone(n, .12, this.note % 4 === 0 ? 'triangle' : 'sine', .011);
        if (this.note % 4 === 0) this.tone(n/2, .16, 'triangle', .009);
      }
    }
  }
  const audio = new AudioManager();

  function startGame() {
    audio.init();
    const home = HOME_BONUSES[save.home] || HOME_BONUSES.NS;
    const su = save.upgrades || {};
    const startTown = TOWNS[0];
    player = {
      x: startTown.x, y: startTown.y, vx: 0, vy: 0, angle: 0, radius: 24,
      maxHealth: 100 + (su.rust || 0) * 8,
      health: 100 + (su.rust || 0) * 8,
      maxBoost: 100 + (su.mug || 0) * 10,
      boost: 100 + (su.mug || 0) * 10,
      boostRegen: 9,
      speed: 265,
      accel: 650,
      handling: 7.3,
      offroadGrip: .62 + (su.springs || 0) * .035,
      potholeResist: 0,
      weatherGrip: 0,
      hornPower: home.horn * (1 + (su.airhorn || 0) * .12),
      hornCd: 0,
      hornMaxCd: 3.1,
      hornPulse: 0,
      invuln: 0,
      cargoShield: 0,
      scoreMult: 1,
      coinLuck: (su.deposit || 0) * .08,
      comboHold: 5.5,
      deliveryTime: 16,
      home
    };
    run = {
      score: 0, deliveries: 0, time: 125 + home.timer + (su.shortcut || 0) * 5,
      combo: 1, bestCombo: 1, comboTimer: 0, coins: 0, elapsed: 0, difficulty: 1,
      mission: null, weather: WEATHER[0], weatherTimer: 25, weatherIndex: 0,
      windAngle: Math.random() * TAU, weatherSurvived: new Set(), nextUpgrade: 2,
      radioAt: 8, reason: '', lastTown: 0, upgradeIn: null, collectibleRespawns: []
    };
    entities = [];
    particles = [];
    lastHudUpdate = 0;
    last = performance.now();
    audio.musicClock = 0;
    spawnInitialWorld();
    assignMission(true);
    camera.x = player.x - viewW / 2;
    camera.y = player.y - viewH / 2;
    camera.shake = 0;
    radioTimer = 2;
    showRadio(`You are leaving ${TOWNS[0].name} with ${run.mission.cargo.name}. This already feels avoidable.`);
    setMode('game');
    updateHud(true);
  }

  function spawnInitialWorld() {
    for (let i = 0; i < 30; i++) spawnHazard();
    for (let i = 0; i < 32; i++) spawnCollectible();
  }

  function assignMission(first=false) {
    const from = run.lastTown;
    let to = from;
    while (to === from || (!first && to === run.mission?.from)) to = (Math.random() * TOWNS.length) | 0;
    const cargo = pick(CARGO);
    run.mission = { from, to, cargo };
    run.lastTown = to;
    ui.cargoIcon.textContent = cargo.icon;
    ui.missionTitle.textContent = `Deliver ${cargo.name}`;
    ui.missionRoute.textContent = `${TOWNS[from].short} → ${TOWNS[to].short}`;
  }

  function spawnHazard(type=null) {
    const weatherId = run?.weather?.id;
    if (!type) {
      const roll = Math.random();
      if (weatherId === 'tourists' && roll < .45) type = 'rv';
      else if (weatherId === 'blackflies' && roll < .38) type = 'flies';
      else type = roll < .38 ? 'pothole' : roll < .58 ? 'gull' : roll < .74 ? 'moose' : roll < .88 ? 'rv' : 'flies';
    }
    let x, y;
    for (let tries=0; tries<30; tries++) {
      if (type === 'pothole' || type === 'rv') {
        const [a,b] = pick(ROAD_LINKS), p=TOWNS[a], q=TOWNS[b], t=Math.random();
        x=lerp(p.x,q.x,t)+(Math.random()-.5)*35; y=lerp(p.y,q.y,t)+(Math.random()-.5)*35;
      } else { x=100+Math.random()*(WORLD.w-200); y=100+Math.random()*(WORLD.h-200); }
      if (!player || Math.hypot(x-player.x,y-player.y)>280) break;
    }
    if (type === 'pothole') entities.push({ type,x,y,r:18+Math.random()*12,rot:Math.random()*TAU,hitCd:0 });
    if (type === 'gull') entities.push({ type,x,y,r:17,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90,phase:Math.random()*TAU,scared:0,hitCd:0 });
    if (type === 'moose') entities.push({ type,x,y,r:31,vx:(Math.random()-.5)*35,vy:(Math.random()-.5)*35,phase:Math.random()*TAU,scared:0,hitCd:0 });
    if (type === 'rv') entities.push({ type,x,y,r:30,angle:Math.random()*TAU,vx:0,vy:0,speed:45+Math.random()*35,wander:Math.random()*TAU,scared:0,hitCd:0 });
    if (type === 'flies') entities.push({ type,x,y,r:55+Math.random()*35,phase:Math.random()*TAU,hitCd:0 });
  }

  function spawnCollectible(type=null, nearPlayer=false) {
    const roll = Math.random();
    if (!type) {
      const coinChance = clamp(.38 + player.coinLuck, .38, .7);
      const otherRoll = (roll - coinChance) / (1 - coinChance);
      type = roll < coinChance ? 'empty' : otherRoll < 21/62 ? 'coffee' : otherRoll < 37/62 ? 'note' : otherRoll < 50/62 ? 'tape' : 'clock';
    }
    let x, y;
    if (nearPlayer) { x=player.x+(Math.random()-.5)*360; y=player.y+(Math.random()-.5)*360; }
    else {
      const [a,b] = pick(ROAD_LINKS), p=TOWNS[a], q=TOWNS[b], t=Math.random();
      x=lerp(p.x,q.x,t)+(Math.random()-.5)*110; y=lerp(p.y,q.y,t)+(Math.random()-.5)*110;
    }
    entities.push({ type,x:clamp(x,60,WORLD.w-60),y:clamp(y,60,WORLD.h-60),r:16,phase:Math.random()*TAU,life:60+Math.random()*70 });
  }

  function chooseWeather() {
    let choices = WEATHER.filter(w => w.id !== run.weather.id);
    if (run.deliveries < 2) choices = choices.filter(w => w.id !== 'noreaster');
    run.weatherSurvived.add(run.weather.id);
    run.weather = pick(choices);
    const [a,b] = run.weather.duration;
    run.weatherTimer = lerp(a,b,Math.random());
    run.windAngle = Math.random()*TAU;
    showRadio(weatherIntro(run.weather.id));
    toast(run.weather.name, run.weather.id === 'decent' ? 'good' : '');
    if (run.weather.id === 'tourists') for (let i=0;i<5;i++) spawnHazard('rv');
    if (run.weather.id === 'blackflies') for (let i=0;i<5;i++) spawnHazard('flies');
    if (run.weather.id === 'noreaster') for (let i=0;i<4;i++) spawnHazard('pothole');
  }

  function weatherIntro(id) {
    const lines = {
      decent: 'Alert: the sun is visible. Please do not make plans; this may cause it to leave.',
      drizzle: 'A fine drizzle has begun. Locals continue operating as if this is dry.',
      sideways: 'The rain has turned sideways, as tradition demands.',
      fog: 'Fog is moving in. Visibility now measured in civic addresses.',
      noreaster: 'Nor’easter warning. Secure lawn furniture, relatives, and loose opinions.',
      blackflies: 'Blackflies have declared a provincial convention directly around your windshield.',
      tourists: 'Peak tourist season: expect rental RVs to stop wherever the view becomes “quaint.”'
    };
    return lines[id];
  }

  function update(dt) {
    if (mode !== 'game') return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05);
    run.elapsed += dt;
    run.time -= dt;
    run.weatherTimer -= dt;
    player.hornCd = Math.max(0, player.hornCd - dt);
    player.hornPulse = Math.max(0, player.hornPulse - dt * 2.2);
    player.invuln = Math.max(0, player.invuln - dt);
    camera.shake = Math.max(0, camera.shake - dt * 18);

    if (run.time <= 0) return endGame('The weather arrived before you did. Classic.', 'SHE’S SOME WEATHER');
    if (player.health <= 0) return endGame('Your vehicle has become a collection of opinions and loose parts.', 'SHE’S DONE, B’Y');

    if (run.upgradeIn !== null) {
      run.upgradeIn -= dt;
      if (run.upgradeIn <= 0) { run.upgradeIn = null; showRunUpgrades(); return; }
    }
    run.collectibleRespawns = run.collectibleRespawns.filter(delay => {
      if (delay <= dt) { spawnCollectible(); return false; }
      return true;
    }).map(delay => delay - dt);
    if (run.weatherTimer <= 0) chooseWeather();
    const wx = Math.cos(run.windAngle) * run.weather.wind * player.home.weather;
    const wy = Math.sin(run.windAngle) * run.weather.wind * player.home.weather;

    let ix = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0) + mobileAxis.x;
    let iy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0) + mobileAxis.y;
    const il = Math.hypot(ix, iy);
    if (il > 1) { ix /= il; iy /= il; }

    const roadDist = distanceToRoad(player.x, player.y);
    const onRoad = roadDist < 43;
    const weatherGrip = clamp(run.weather.grip + player.weatherGrip, .65, 1.12);
    const terrainMult = onRoad ? player.home.roadSpeed : Math.min(.92, player.offroadGrip * player.home.offroad);
    const boosting = (keys.Space || mobileBoost) && player.boost > 1 && il > .1;
    const boostMult = boosting ? 1.52 : 1;
    if (boosting) player.boost = Math.max(0, player.boost - 27 * dt);
    else player.boost = Math.min(player.maxBoost, player.boost + player.boostRegen * dt);

    const targetSpeed = player.speed * terrainMult * weatherGrip * boostMult;
    const desiredX = ix * targetSpeed + wx;
    const desiredY = iy * targetSpeed + wy;
    const follow = 1 - Math.exp(-player.handling * dt * weatherGrip);
    player.vx = lerp(player.vx, desiredX, follow);
    player.vy = lerp(player.vy, desiredY, follow);
    if (il < .05) { player.vx *= Math.pow(.12, dt); player.vy *= Math.pow(.12, dt); }
    player.x = clamp(player.x + player.vx * dt, 36, WORLD.w - 36);
    player.y = clamp(player.y + player.vy * dt, 36, WORLD.h - 36);
    if (Math.hypot(player.vx, player.vy) > 18) player.angle = Math.atan2(player.vy, player.vx);

    if (boosting && Math.random() < dt * 20) addParticle(player.x-Math.cos(player.angle)*24, player.y-Math.sin(player.angle)*24, 'boost');

    updateEntities(dt);
    if (player.health <= 0) return endGame('Your vehicle has become a collection of opinions and loose parts.', 'SHE’S DONE, B’Y');
    updateParticles(dt);
    checkMission();

    if (run.comboTimer > 0) run.comboTimer -= dt;
    else run.combo = lerp(run.combo, 1, dt * .85);
    run.bestCombo = Math.max(run.bestCombo, run.combo);

    radioTimer -= dt;
    radioHideTimer -= dt;
    if (radioTimer <= 0) {
      showRadio(pick(RADIO_LINES));
      radioTimer = 16 + Math.random() * 18;
    }
    if (radioHideTimer <= 0) ui.radio.classList.add('hidden');

    const followCam = 1 - Math.exp(-5.5 * dt);
    camera.x = lerp(camera.x, clamp(player.x - viewW / 2, -120, WORLD.w - viewW + 120), followCam);
    camera.y = lerp(camera.y, clamp(player.y - viewH / 2, -120, WORLD.h - viewH + 120), followCam);

    audio.update(dt);
    if (run.elapsed - lastHudUpdate > .08) { updateHud(); lastHudUpdate = run.elapsed; }
  }

  function updateEntities(dt) {
    const weather = run.weather.id;
    for (let i=entities.length-1; i>=0; i--) {
      const e = entities[i];
      if (e.hitCd) e.hitCd = Math.max(0, e.hitCd - dt);
      if ('life' in e) { e.life -= dt; if (e.life <= 0) { entities.splice(i,1); continue; } }
      if (e.type === 'gull') {
        e.phase += dt * 3;
        if (e.scared > 0) { e.scared -= dt; }
        else {
          const d = Math.hypot(player.x-e.x, player.y-e.y);
          if (d > 0 && d < 330) { e.vx += (player.x-e.x)/d*45*dt; e.vy += (player.y-e.y)/d*45*dt; }
        }
        e.vx *= Math.pow(.4,dt); e.vy *= Math.pow(.4,dt);
        e.x += e.vx*dt; e.y += e.vy*dt;
      }
      if (e.type === 'moose') {
        e.phase += dt;
        if (e.scared > 0) e.scared -= dt;
        else if (Math.random() < dt*.7) { e.vx += (Math.random()-.5)*28; e.vy += (Math.random()-.5)*28; }
        e.vx *= Math.pow(.55,dt); e.vy *= Math.pow(.55,dt);
        e.x = clamp(e.x+e.vx*dt,40,WORLD.w-40); e.y=clamp(e.y+e.vy*dt,40,WORLD.h-40);
      }
      if (e.type === 'rv') {
        e.wander += (Math.random()-.5)*dt*1.5;
        if (e.scared > 0) { e.scared-=dt; e.wander += dt*3; }
        const target = nearestRoadDirection(e.x,e.y,e.angle);
        const desired = target + Math.sin(e.wander)*.35;
        e.angle = angleLerp(e.angle, desired, dt * .9);
        const roadD = distanceToRoad(e.x,e.y);
        if (roadD > 100) e.angle += Math.PI * dt;
        const touristSlow = weather === 'tourists' ? .78 : 1;
        e.vx = Math.cos(e.angle)*e.speed*touristSlow; e.vy=Math.sin(e.angle)*e.speed*touristSlow;
        e.x=clamp(e.x+e.vx*dt,40,WORLD.w-40); e.y=clamp(e.y+e.vy*dt,40,WORLD.h-40);
      }
      if (e.type === 'flies') e.phase += dt * 2;
      if (['empty','coffee','note','tape','clock'].includes(e.type)) e.phase += dt*2.5;

      const d = Math.hypot(player.x-e.x, player.y-e.y);
      if (d < player.radius + e.r && !e.hitCd) {
        if (['empty','coffee','note','tape','clock'].includes(e.type)) {
          collect(e); entities.splice(i,1); if (Math.random()<.8) run.collectibleRespawns.push(.4); continue;
        }
        if (e.type === 'flies') {
          player.boost = Math.max(0, player.boost - 18*dt);
          player.vx *= Math.pow(.2,dt); player.vy *= Math.pow(.2,dt);
          if (Math.random()<dt*.8) addParticle(player.x+(Math.random()-.5)*40,player.y+(Math.random()-.5)*40,'fly');
        } else if (player.invuln <= 0) {
          collideHazard(e);
        }
      }
    }

    const targetCount = 55 + run.deliveries * 2;
    if (entities.length < targetCount && Math.random() < dt * 2) (Math.random()<.53 ? spawnHazard() : spawnCollectible());
  }

  function nearestRoadDirection(x,y,current=0) {
    let best=Infinity, angle=0;
    for (const [a,b] of ROAD_LINKS) {
      const p=TOWNS[a],q=TOWNS[b];
      const d=distanceToSegment(x,y,p.x,p.y,q.x,q.y);
      if (d<best) {
        best=d;
        const base=Math.atan2(q.y-p.y,q.x-p.x);
        const opposite=base+Math.PI;
        const diffA=Math.abs(angleDifference(current,base));
        const diffB=Math.abs(angleDifference(current,opposite));
        angle=diffA<diffB?base:opposite;
      }
    }
    return angle;
  }
  function angleDifference(a,b) { return Math.atan2(Math.sin(b-a), Math.cos(b-a)); }
  function angleLerp(a,b,t) { return a+angleDifference(a,b)*clamp(t,0,1); }

  function collideHazard(e) {
    e.hitCd = 1.2;
    player.invuln = .85;
    let damage=0, msg='';
    if (e.type==='pothole') { damage=12*(1-clamp(player.potholeResist,0,.85)); msg=pick(['POTHOLE WITH MUNICIPAL AMBITIONS','That road had a basement','Suspension has left the chat']); }
    if (e.type==='gull') { damage=6; msg=pick(['GULL-RELATED FINANCIAL LOSS','The gull showed no remorse','Snack tax collected']); run.score=Math.max(0,run.score-80); }
    if (e.type==='moose') { damage=27; msg=pick(['MOOSE HAS RIGHT OF WAY','Large local resident encountered','That was not a decorative moose']); }
    if (e.type==='rv') { damage=16; msg=pick(['RENTAL RV MANOEUVRE','Tourist used sudden stop','Scenic panic braking']); }
    if (player.cargoShield>0) { player.cargoShield--; damage*=.45; msg+=' — SAUCE ABSORBED IT'; }
    player.health-=damage;
    player.vx *= -.45; player.vy *= -.45;
    run.combo=1; run.comboTimer=0;
    camera.shake=Math.max(camera.shake,12+damage*.4);
    audio.bump(); toast(`${msg}  −${Math.ceil(damage)}`, 'bad');
    for(let j=0;j<12;j++) addParticle(player.x,player.y,'debris');
  }

  function collect(e) {
    audio.pickup();
    if (e.type==='empty') { const n=Math.random()<.12?3:1; run.coins+=n; run.score+=Math.round(35*run.combo); toast(`Bottle refund +${n}`, 'good'); }
    if (e.type==='coffee') { player.boost=Math.min(player.maxBoost,player.boost+35); run.score+=45; toast('Coffee: legally a performance enhancer', 'good'); }
    if (e.type==='note') { run.combo=Math.min(5,run.combo+.22); run.comboTimer=player.comboHold; run.score+=Math.round(90*run.combo); toast(`Kitchen-party groove x${run.combo.toFixed(1)}`, 'good'); }
    if (e.type==='tape') { player.health=Math.min(player.maxHealth,player.health+14); run.score+=40; toast('Duct tape restored structural confidence', 'good'); }
    if (e.type==='clock') { run.time+=5; run.score+=55; toast('+5 sec: somebody held the ferry', 'good'); }
    for(let j=0;j<8;j++) addParticle(e.x,e.y,'spark');
  }

  function honk() {
    if (mode!=='game' || player.hornCd>0) return;
    player.hornCd=player.hornMaxCd;
    player.hornPulse=1;
    audio.horn();
    const range=220*player.hornPower;
    let moved=0;
    for(const e of entities) {
      if(!['gull','moose','rv'].includes(e.type)) continue;
      const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);
      if(d<range && d>0) { e.vx=(e.vx||0)+dx/d*210*player.hornPower; e.vy=(e.vy||0)+dy/d*210*player.hornPower; e.scared=1.8; moved++; }
    }
    toast(moved ? `Honk diplomacy affected ${moved}` : pick(['Honked into the void','A traditional greeting','Nobody moved. Authentic.']), moved?'good':'');
  }

  function checkMission() {
    const town=TOWNS[run.mission.to];
    if(Math.hypot(player.x-town.x,player.y-town.y)<78) completeDelivery();
  }

  function completeDelivery() {
    const m=run.mission;
    const town=TOWNS[m.to];
    run.deliveries++;
    run.difficulty=1+run.deliveries*.085;
    run.combo=Math.min(5,run.combo+.35);
    run.comboTimer=player.comboHold+1;
    run.bestCombo=Math.max(run.bestCombo,run.combo);
    const points=Math.round((700+run.time*5+run.deliveries*85)*run.combo*player.scoreMult);
    run.score+=points;
    const bonusTime=player.deliveryTime+Math.max(0,5-run.deliveries*.18);
    run.time+=bonusTime;
    player.health=Math.min(player.maxHealth,player.health+5);
    player.boost=Math.min(player.maxBoost,player.boost+18);
    audio.delivery();
    toast(`DELIVERED! +${formatNum(points)}  +${Math.round(bonusTime)} sec`, 'good');
    showRadio(deliveryLine(m.cargo.name,town.name));
    for(let j=0;j<28;j++) addParticle(town.x,town.y,'confetti');
    for(let i=0;i<2+Math.floor(run.deliveries/4);i++) spawnHazard();
    for(let i=0;i<4;i++) spawnCollectible(null,true);
    unlockAchievement('first', 'FIRST RUN DONE: You have become “the one with the car.”', run.deliveries>=1);
    unlockAchievement('ten', 'TEN DELIVERIES: The kitchen party now has zoning implications.', run.deliveries>=10);
    unlockAchievement('names', 'GEOGRAPHY BADGE: You personally distinguished Saint John from St. John’s.', (TOWNS[m.from].name.includes('Saint John')&&town.name.includes("St. John's"))||(TOWNS[m.from].name.includes("St. John's")&&town.name.includes('Saint John')));
    assignMission();
    if(run.deliveries>=run.nextUpgrade) {
      run.nextUpgrade+=2;
      run.upgradeIn = .5;
    }
  }

  function deliveryLine(cargo,town) {
    return pick([
      `${cargo} delivered to ${town}. Nobody says thank you because you are immediately asked to get something else.`,
      `Success in ${town}. The crowd has grown by seventeen people and one dog.`,
      `${town} received the ${cargo}. Aunt Sheila says, “Perfect, while you’re out…”`,
      `Delivery complete. Someone has put your name on a paper plate containing leftovers.`,
      `${town} is saved. The kitchen party is now visible on weather radar.`
    ]);
  }

  function showRunUpgrades() {
    setMode('upgrade');
    const choices=[...RUN_UPGRADES].sort(()=>Math.random()-.5).slice(0,3);
    ui.upgradeChoices.innerHTML='';
    choices.forEach(u=>{
      const b=document.createElement('button'); b.className='upgrade-card';
      b.innerHTML=`<span class="u-icon">${u.icon}</span><h3>${u.title}</h3><p>${u.desc}</p><strong>INSTALL IT</strong>`;
      b.onclick=()=>{audio.click();u.apply(player);setMode('game');toast(`${u.title} installed by Dave`, 'good');};
      ui.upgradeChoices.appendChild(b);
    });
    ui.upgradeChoices.querySelector('button')?.focus({preventScroll:true});
  }

  function showShed() {
    renderShed();
    showScreen(ui.shedScreen);
  }
  function renderShed() {
    ui.shedCoins.textContent=save.coins;
    ui.shedChoices.innerHTML='';
    for(const u of SHED_UPGRADES) {
      const level=save.upgrades[u.id]||0;
      const cost=u.base+level*u.base;
      const b=document.createElement('button'); b.className='upgrade-card'; b.disabled=level>=u.max||save.coins<cost;
      b.innerHTML=`<span class="u-icon">${u.icon}</span><h3>${u.title}</h3><p>${u.desc}</p><strong>${level>=u.max?'MAXED OUT':`${cost} REFUNDS`}</strong><span class="level">LEVEL ${level} / ${u.max}</span>`;
      b.onclick=()=>{
        if(save.coins<cost||level>=u.max)return;
        audio.click();save.coins-=cost;save.upgrades[u.id]=level+1;persist();renderShed();toast(`${u.title} upgraded`, 'good');
      };
      ui.shedChoices.appendChild(b);
    }
  }

  function endGame(reason, stamp) {
    if(mode!=='game')return;
    run.reason=reason;
    audio.gameover();
    const earned=run.coins+Math.floor(run.deliveries/2)+Math.floor(run.score/5000);
    save.coins+=earned;
    save.bestScore=Math.max(save.bestScore,Math.floor(run.score));
    save.bestDeliveries=Math.max(save.bestDeliveries,run.deliveries);
    persist();
    ui.resultStamp.textContent=stamp;
    ui.resultTitle.textContent=run.deliveries>=12?'A legendary rip':run.deliveries>=6?'A respectable rip':'A brief but culturally accurate rip';
    ui.resultReason.textContent=reason;
    ui.resultScore.textContent=formatNum(run.score);
    ui.resultDeliveries.textContent=run.deliveries;
    ui.resultCombo.textContent=`x${run.bestCombo.toFixed(1)}`;
    ui.resultCoins.textContent=`+${earned}`;
    ui.resultQuote.textContent=pick([
      '“Could’ve been worse.” — every Atlantic Canadian, always',
      '“You made good time, considering.” — the highest available local praise',
      '“Road was some rough.” — official infrastructure review',
      '“Sure you’re here now.” — Aunt Sheila, without looking up',
      '“Take a plate with you.” — you are handed enough food for four days'
    ]);
    setMode('gameover');
  }

  function unlockAchievement(id,text,condition) {
    if(!condition||save.achievements[id])return;
    save.achievements[id]=true;persist();toast(`🏆 ${text}`,'good');
  }

  function addParticle(x,y,type) {
    const a=Math.random()*TAU,s=30+Math.random()*150;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.75,max:1,type,rot:Math.random()*TAU});
  }
  function updateParticles(dt) {
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.18,dt);p.vy*=Math.pow(.18,dt);p.vy+=40*dt;p.rot+=dt*5;}
  }

  function draw() {
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0a6074';ctx.fillRect(0,0,viewW,viewH);
    if(mode==='menu' || !player) drawMenuBackdrop();
    else drawWorld();
  }

  function drawMenuBackdrop() {
    const t=performance.now()/1000;
    ctx.fillStyle='#0a6074';ctx.fillRect(0,0,viewW,viewH);
    for(let i=0;i<16;i++){
      const x=(i*173+t*8)% (viewW+100)-50;
      const y=(i*97+Math.sin(t+i)*20)% (viewH+100)-50;
      ctx.globalAlpha=.1;ctx.fillStyle='#d9f99d';ctx.beginPath();ctx.arc(x,y,40+(i%4)*20,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
    for(let y=10;y<viewH;y+=42){ctx.beginPath();for(let x=0;x<=viewW;x+=20){ctx.lineTo(x,y+Math.sin(x*.02+t+y)*3);}ctx.stroke();}
  }

  function drawWorld() {
    const shakeX=(Math.random()-.5)*camera.shake,shakeY=(Math.random()-.5)*camera.shake;
    ctx.save();ctx.translate(-camera.x+shakeX,-camera.y+shakeY);
    drawLand();
    drawDecorations();
    drawRoads();
    drawTowns();
    drawEntities();
    drawParticles();
    drawPlayer();
    ctx.restore();
    drawMissionArrow();
    drawWeather();
  }

  function drawLand() {
    ctx.fillStyle='#397a4e';
    roundRect(ctx,0,0,WORLD.w,WORLD.h,130);ctx.fill();
    ctx.strokeStyle='rgba(226,232,240,.22)';ctx.lineWidth=28;ctx.stroke();
    const gradients=[['#4d8958',400,300,660],['#2d6b49',3000,450,520],['#6d804a',1200,1900,580],['#356f5e',2800,1850,600]];
    for(const [c,x,y,r] of gradients){ctx.fillStyle=c;ctx.globalAlpha=.32;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
    ctx.globalAlpha=1;
  }

  function drawDecorations() {
    for(const d of decorations) {
      if(!inView(d.x,d.y,120))continue;
      ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.rot);ctx.scale(d.s,d.s);
      if(d.type==='tree') drawTree();
      if(d.type==='rock') {ctx.fillStyle='#71836e';ctx.beginPath();ctx.ellipse(0,0,10,7,0,0,TAU);ctx.fill();ctx.strokeStyle='#425748';ctx.stroke();}
      if(d.type==='pond') {ctx.fillStyle='rgba(34,139,159,.75)';ctx.beginPath();ctx.ellipse(0,0,32,17,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(210,250,250,.24)';ctx.stroke();}
      if(d.type==='field') {ctx.fillStyle='rgba(155,106,61,.35)';ctx.fillRect(-32,-20,64,40);ctx.strokeStyle='rgba(255,220,160,.18)';for(let x=-28;x<30;x+=8){ctx.beginPath();ctx.moveTo(x,-18);ctx.lineTo(x,18);ctx.stroke();}}
      if(d.type==='house') drawHouse();
      if(d.type==='lighthouse') drawLighthouse();
      ctx.restore();
    }
  }
  function drawTree(){ctx.fillStyle='#22563c';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-11,9);ctx.lineTo(11,9);ctx.closePath();ctx.fill();ctx.fillStyle='#183f30';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(-14,15);ctx.lineTo(14,15);ctx.closePath();ctx.fill();ctx.fillStyle='#6b4f36';ctx.fillRect(-2,12,4,8);}
  function drawHouse(){ctx.fillStyle='#e9ddc0';ctx.fillRect(-12,-7,24,18);ctx.fillStyle='#b43b3b';ctx.beginPath();ctx.moveTo(-15,-7);ctx.lineTo(0,-19);ctx.lineTo(15,-7);ctx.closePath();ctx.fill();ctx.fillStyle='#315f78';ctx.fillRect(-4,1,8,10);}
  function drawLighthouse(){ctx.fillStyle='#f8fafc';ctx.fillRect(-6,-14,12,28);ctx.fillStyle='#ef4444';ctx.fillRect(-6,-5,12,6);ctx.beginPath();ctx.moveTo(-10,-14);ctx.lineTo(0,-22);ctx.lineTo(10,-14);ctx.closePath();ctx.fill();ctx.fillStyle='#fde68a';ctx.globalAlpha=.24;ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(70,-35);ctx.lineTo(70,0);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}

  function drawRoads() {
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [a,b] of ROAD_LINKS){const p=TOWNS[a],q=TOWNS[b];ctx.strokeStyle='#243942';ctx.lineWidth=70;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.strokeStyle='#6b7478';ctx.lineWidth=56;ctx.stroke();ctx.strokeStyle='rgba(255,238,160,.55)';ctx.lineWidth=3;ctx.setLineDash([18,20]);ctx.stroke();ctx.setLineDash([]);}
  }

  function drawTowns() {
    const target=run.mission.to;
    TOWNS.forEach((t,i)=>{
      if(!inView(t.x,t.y,180))return;
      const isTarget=i===target;
      if(isTarget){const pulse=1+Math.sin(performance.now()/180)*.12;ctx.strokeStyle='rgba(250,204,21,.75)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(t.x,t.y,62*pulse,0,TAU);ctx.stroke();ctx.strokeStyle='rgba(250,204,21,.25)';ctx.lineWidth=18;ctx.beginPath();ctx.arc(t.x,t.y,78*pulse,0,TAU);ctx.stroke();}
      ctx.fillStyle=isTarget?'#facc15':'#e9e1c7';ctx.beginPath();ctx.arc(t.x,t.y,34,0,TAU);ctx.fill();ctx.strokeStyle='#263d45';ctx.lineWidth=5;ctx.stroke();
      ctx.font='22px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#111827';ctx.fillText(t.icon,t.x,t.y+1);
      ctx.font='800 13px Inter, sans-serif';ctx.textBaseline='top';ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillText(t.name,t.x+1,t.y+48);ctx.fillStyle='white';ctx.fillText(t.name,t.x,t.y+47);
    });
  }

  function drawEntities() {
    for(const e of entities) {
      if(!inView(e.x,e.y,120))continue;
      ctx.save();ctx.translate(e.x,e.y);
      if(e.type==='pothole'){ctx.rotate(e.rot);ctx.fillStyle='#263238';ctx.beginPath();ctx.ellipse(0,0,e.r,e.r*.58,0,0,TAU);ctx.fill();ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(2,2,e.r*.65,e.r*.32,0,0,TAU);ctx.fill();}
      if(e.type==='gull'){ctx.rotate(Math.atan2(e.vy,e.vx));ctx.strokeStyle='#f8fafc';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-15,Math.sin(e.phase)*3);ctx.quadraticCurveTo(-5,-8,0,1);ctx.quadraticCurveTo(7,-8,16,0);ctx.stroke();ctx.fillStyle='#facc15';ctx.fillRect(14,-1,6,2);}
      if(e.type==='moose'){ctx.font='44px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🫎',0,0);}
      if(e.type==='rv'){ctx.rotate(e.angle);ctx.fillStyle='#f4f0df';roundRect(ctx,-31,-17,62,34,7);ctx.fill();ctx.fillStyle='#3d6473';ctx.fillRect(4,-13,18,12);ctx.fillStyle='#d94b4b';ctx.fillRect(-20,-15,7,30);ctx.fillStyle='#1f2937';ctx.fillRect(-24,-20,12,5);ctx.fillRect(14,-20,12,5);}
      if(e.type==='flies'){ctx.globalAlpha=.18;ctx.fillStyle='#292216';ctx.beginPath();ctx.arc(0,0,e.r,0,TAU);ctx.fill();ctx.globalAlpha=.75;ctx.fillStyle='#181512';for(let j=0;j<12;j++){const a=e.phase+j*2.4,r=(j%4)*11+9;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a*1.3)*r,2,0,TAU);ctx.fill();}}
      if(['empty','coffee','note','tape','clock'].includes(e.type)){const bob=Math.sin(e.phase)*4;ctx.translate(0,bob);ctx.globalAlpha=.24;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,24,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.font='28px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText({empty:'🪙',coffee:'☕',note:'🎵',tape:'🩹',clock:'⏱️'}[e.type],0,0);}
      ctx.restore();
    }
  }

  function drawPlayer() {
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle);
    if(player.invuln>0&&Math.floor(player.invuln*14)%2===0)ctx.globalAlpha=.35;
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(3,7,28,18,0,0,TAU);ctx.fill();
    ctx.fillStyle='#c53f3f';roundRect(ctx,-28,-17,56,34,10);ctx.fill();ctx.strokeStyle='#7d2424';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#a5d8e5';roundRect(ctx,-8,-13,22,26,5);ctx.fill();
    ctx.fillStyle='#26333a';ctx.fillRect(-21,-21,13,6);ctx.fillRect(10,-21,13,6);ctx.fillRect(-21,15,13,6);ctx.fillRect(10,15,13,6);
    ctx.fillStyle='#f9e27f';ctx.fillRect(22,-12,6,7);ctx.fillRect(22,5,6,7);
    ctx.fillStyle='#f3f4f6';ctx.font='15px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(run.mission.cargo.icon,-13,0);
    if((keys.Space||mobileBoost)&&player.boost>0){ctx.fillStyle='#d6f6ff';ctx.beginPath();ctx.moveTo(-29,-8);ctx.lineTo(-44,0);ctx.lineTo(-29,8);ctx.closePath();ctx.fill();}
    ctx.restore();
    if(player.hornPulse>0){ctx.strokeStyle=`rgba(250,204,21,${player.hornPulse*.65})`;ctx.lineWidth=6;ctx.beginPath();ctx.arc(player.x,player.y,(1-player.hornPulse)*220*player.hornPower+40,0,TAU);ctx.stroke();}
  }

  function drawParticles() {
    for(const p of particles){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=clamp(p.life*1.8,0,1);if(p.type==='confetti'){ctx.fillStyle=pick(['#facc15','#ef4444','#22c55e','#60a5fa','#f8fafc']);ctx.fillRect(-3,-6,6,12);}else if(p.type==='debris'){ctx.fillStyle='#50463d';ctx.fillRect(-3,-3,6,6);}else if(p.type==='boost'){ctx.fillStyle='#a5f3fc';ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();}else if(p.type==='fly'){ctx.fillStyle='#17120c';ctx.beginPath();ctx.arc(0,0,2,0,TAU);ctx.fill();}else{ctx.fillStyle='#fef08a';ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();}ctx.restore();}
  }

  function drawMissionArrow() {
    const t=TOWNS[run.mission.to];
    const sx=t.x-camera.x,sy=t.y-camera.y;
    const margin=90;
    if(sx>margin&&sx<viewW-margin&&sy>margin&&sy<viewH-margin)return;
    const cx=viewW/2,cy=viewH/2,a=Math.atan2(sy-cy,sx-cx);
    const dx=Math.cos(a),dy=Math.sin(a);
    const tx=dx!==0?(dx>0?(viewW-margin-cx)/dx:(margin-cx)/dx):Infinity;
    const ty=dy!==0?(dy>0?(viewH-margin-cy)/dy:(margin-cy)/dy):Infinity;
    const k=Math.min(Math.abs(tx),Math.abs(ty));
    const x=cx+dx*k,y=cy+dy*k;
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#facc15';ctx.beginPath();ctx.moveTo(26,0);ctx.lineTo(-15,-16);ctx.lineTo(-8,0);ctx.lineTo(-15,16);ctx.closePath();ctx.fill();ctx.strokeStyle='#0b2531';ctx.lineWidth=4;ctx.stroke();ctx.restore();
    const km=Math.max(1,Math.round(Math.hypot(t.x-player.x,t.y-player.y)/22));
    ctx.font='900 12px Inter';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText(`${km} km-ish`,x,y+35);
  }

  function drawWeather() {
    const w=run.weather;
    ctx.fillStyle=w.tint;ctx.fillRect(0,0,viewW,viewH);
    if(w.rain>0){ctx.strokeStyle=`rgba(205,235,245,${.22*w.rain})`;ctx.lineWidth=1.3;const wx=Math.cos(run.windAngle)*18;for(const r of rainDrops){r.x+=(-40+wx)*.016*w.rain;r.y+=r.s*.016*w.rain;if(r.y>viewH+30){r.y=-30;r.x=Math.random()*viewW;}if(r.x<0)r.x=viewW;if(r.x>viewW)r.x=0;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x-5-wx*.25,r.y-r.l);ctx.stroke();}}
    if(w.id==='fog'){const g=ctx.createRadialGradient(viewW/2,viewH/2,Math.min(viewW,viewH)*.18,viewW/2,viewH/2,Math.max(viewW,viewH)*.62);g.addColorStop(0,'rgba(225,236,235,.04)');g.addColorStop(.45,'rgba(218,230,229,.30)');g.addColorStop(1,'rgba(210,224,224,.78)');ctx.fillStyle=g;ctx.fillRect(0,0,viewW,viewH);}
    if(w.id==='blackflies'){ctx.fillStyle='rgba(18,15,10,.7)';for(let i=0;i<28;i++){const t=performance.now()/700+i*9.1,x=(Math.sin(t*1.3+i)*.5+.5)*viewW,y=(Math.cos(t*.9+i*2.2)*.5+.5)*viewH;ctx.beginPath();ctx.arc(x,y,1.5,0,TAU);ctx.fill();}}
    if(player.health<35){ctx.fillStyle=`rgba(160,0,0,${(35-player.health)/160})`;ctx.fillRect(0,0,viewW,viewH);}
  }

  function roundRect(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  function inView(x,y,m=0){return x>camera.x-m&&x<camera.x+viewW+m&&y>camera.y-m&&y<camera.y+viewH+m;}

  function updateHud(force=false) {
    if(!run)return;
    ui.hudDeliveries.textContent=run.deliveries;
    ui.hudScore.textContent=formatNum(run.score);
    ui.hudTime.textContent=formatTime(run.time);
    ui.healthBar.style.transform=`scaleX(${clamp(player.health/player.maxHealth,0,1)})`;
    ui.boostBar.style.transform=`scaleX(${clamp(player.boost/player.maxBoost,0,1)})`;
    ui.weatherText.textContent=run.weather.name;
    ui.comboText.textContent=`x${run.combo.toFixed(1)}`;
    ui.hudTime.style.color=run.time<20?'#fb7185':'#facc15';
  }

  function updateMenuStats() {
    ui.bestScore.textContent=formatNum(save.bestScore||0);
    ui.bestDeliveries.textContent=`${save.bestDeliveries||0} deliveries`;
    ui.bankCoins.textContent=save.coins||0;
    document.querySelectorAll('.home').forEach(b=>b.classList.toggle('active',b.dataset.home===save.home));
    ui.soundBtn.textContent=save.sound===false?'🔇':'🔊';
  }

  function toast(text,type='') {
    const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=text;ui.toastStack.appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(20px)';},2600);
    setTimeout(()=>el.remove(),3000);
  }
  function showRadio(text) { ui.radioText.textContent=text;ui.radio.classList.remove('hidden');radioHideTimer=5.5; }

  function showScreen(el) { el.classList.add('active');el.setAttribute('aria-hidden','false'); }
  function hideScreen(el) { el.classList.remove('active');el.setAttribute('aria-hidden','true'); }
  function hideAllScreens(){document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');if(s!==ui.menu)s.setAttribute('aria-hidden','true');});}
  function setMode(next) {
    resetControls();
    mode=next;hideAllScreens();
    const playing=next==='game'||next==='upgrade'||next==='pause';
    ui.topbar.classList.toggle('hidden',!playing);
    ui.missionCard.classList.toggle('hidden',!playing);
    ui.mobileControls.classList.toggle('hidden',!(next==='game'&&isTouch));
    ui.mobileControls.setAttribute('aria-hidden',String(!(next==='game'&&isTouch)));
    if(next==='menu'){showScreen(ui.menu);ui.radio.classList.add('hidden');$('startBtn').focus({preventScroll:true});}
    if(next==='game')canvas.focus({preventScroll:true});
    if(next==='upgrade')showScreen(ui.upgradeScreen);
    if(next==='pause'){showScreen(ui.pauseScreen);$('resumeBtn').focus({preventScroll:true});}
    if(next==='gameover'){ui.topbar.classList.add('hidden');ui.missionCard.classList.add('hidden');ui.mobileControls.classList.add('hidden');showScreen(ui.gameOverScreen);}
  }

  function togglePause(){if(mode==='game')setMode('pause');else if(mode==='pause')setMode('game');}

  document.querySelectorAll('.home').forEach(b=>b.addEventListener('click',()=>{audio.click();save.home=b.dataset.home;persist();}));
  $('startBtn').onclick=startGame;
  $('againBtn').onclick=startGame;
  $('menuBtn').onclick=()=>setMode('menu');
  $('shedBtn').onclick=showShed;
  $('helpBtn').onclick=()=>{if(mode==='game')setMode('pause');showScreen(ui.helpScreen);ui.helpScreen.querySelector('button')?.focus({preventScroll:true});};
  $('pauseBtn').onclick=togglePause;
  $('resumeBtn').onclick=()=>setMode('game');
  $('quitBtn').onclick=()=>{if(run){mode='game';endGame('You went home voluntarily, which frankly shows healthy boundaries.','CALLED ’ER A DAY');}};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{hideScreen($(b.dataset.close));if(b.dataset.close==='helpScreen'&&mode==='pause')$('resumeBtn').focus({preventScroll:true});});
  ui.soundBtn.onclick=()=>{save.sound=!audio.enabled;audio.enabled=save.sound;if(audio.enabled)audio.init();persist();audio.click();};

  addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||e.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;
    if(ui.helpScreen.classList.contains('active')){if(e.code==='Escape'){e.preventDefault();hideScreen(ui.helpScreen);if(mode==='pause')$('resumeBtn').focus();}return;}
    if(mode==='game')keys[e.code]=true;
    if(mode==='game'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.code==='KeyH'&&!e.repeat)honk();
    if(e.code==='Escape'&&!e.repeat){if(mode==='game'||mode==='pause')togglePause();else if(mode==='upgrade'){}else{hideScreen(ui.helpScreen);hideScreen(ui.shedScreen);}}
  },{passive:false});
  addEventListener('keyup',e=>{keys[e.code]=false;});
  const pauseForFocus=()=>{resetControls();if(mode==='game')setMode('pause');};
  addEventListener('blur',pauseForFocus);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForFocus();});

  const joystick=$('joystick'),stick=$('stick');
  let joyPointer=null;
  function resetControls(){keys=Object.create(null);mobileAxis.x=mobileAxis.y=0;mobileBoost=false;joyPointer=null;if($('stick'))$('stick').style.transform='translate(0,0)';}
  function updateJoy(e){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.32,l=Math.hypot(dx,dy)||1;if(l>max){dx=dx/l*max;dy=dy/l*max;}mobileAxis.x=dx/max;mobileAxis.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;}
  joystick.addEventListener('pointerdown',e=>{if(mode!=='game'||joyPointer!==null)return;e.preventDefault();joyPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoy(e);});
  joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)updateJoy(e);});
  const endJoy=e=>{if(e.pointerId!==joyPointer)return;joyPointer=null;mobileAxis.x=mobileAxis.y=0;stick.style.transform='translate(0,0)';};
  joystick.addEventListener('pointerup',endJoy);joystick.addEventListener('pointercancel',endJoy);joystick.addEventListener('lostpointercapture',endJoy);
  $('mobileBoost').addEventListener('pointerdown',e=>{if(mode!=='game')return;e.preventDefault();mobileBoost=true;e.currentTarget.setPointerCapture(e.pointerId);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(n=>$('mobileBoost').addEventListener(n,()=>mobileBoost=false));
  $('mobileHorn').addEventListener('pointerdown',e=>{e.preventDefault();honk();});

  function loop(now) {
    const dt=(now-last)/1000;last=now;
    update(dt);draw();requestAnimationFrame(loop);
  }

  makeDecorations();
  updateMenuStats();
  requestAnimationFrame(loop);
})();
