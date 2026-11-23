import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js';

const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const formatScore = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
const formatTime = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const UI = {
  loading: $('loading'), loadingBar: $('loading-bar'), menu: $('menu'), hud: $('hud'),
  pause: $('pause-screen'), upgrade: $('upgrade-screen'), end: $('end-screen'),
  how: $('how-screen'), settings: $('settings-screen'), touch: $('touch-controls'),
  score: $('score'), multiplier: $('multiplier'), modeTitle: $('mode-title'),
  objectiveKicker: $('objective-kicker'), objectiveTitle: $('objective-title'),
  objectiveDetail: $('objective-detail'), progress: $('interact-progress').querySelector('i'),
  eventStack: $('event-stack'), toast: $('toast'),
  chaosHud: $('chaos-hud'), snacksHud: $('snacks-hud'), fiddleHud: $('fiddle-hud'), dodgeHud: $('dodge-hud'),
};

const MODE_META = {
  chaos: { title: 'KEEP ’ER GOIN’', icon: '🫖' },
  snacks: { title: 'SNACK RUN', icon: '🥪' },
  fiddle: { title: 'FIDDLE FRENZY', icon: '🎻' },
  dodge: { title: 'LAST CHAIR STANDING', icon: '🦞' },
};

const lore = [
  'The party officially begins when somebody says, “I’m only staying for one.”',
  'A folding chair is not furniture. It is a social contract.',
  'Storm chips are both a snack and a preparedness doctrine.',
  'Every kitchen has one drawer that sounds like a cutlery avalanche.',
  'The shortest Maritime goodbye is forty-five minutes.',
  'The weather is never bad; it is merely coming at you sideways.',
  'Somebody will eventually request the same song. This cannot be prevented.',
  'The good mug is whichever mug nobody else has claimed yet.',
  'If the door keeps opening, the entire province is apparently being heated.',
  'A kitchen party can survive anything except running out of chips.'
];

const SAVE_KEY = 'kitchenPartyOuttaHand_v1';
const defaults = {
  highs: { chaos: 0, snacks: 0, fiddle: 0, dodge: 0 },
  caps: 0,
  achievements: {},
  stats: { plays: 0, orders: 0, chips: 0, bestWave: 0, bestStreak: 0, bestSurvival: 0 },
  settings: { sound: true, reducedMotion: false, shake: true, quality: 'auto' }
};
let save = loadSave();
function loadSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      ...structuredClone(defaults), ...parsed,
      highs: { ...defaults.highs, ...(parsed.highs || {}) },
      stats: { ...defaults.stats, ...(parsed.stats || {}) },
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      achievements: { ...(parsed.achievements || {}) }
    };
  } catch { return structuredClone(defaults); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* Storage can be unavailable; keep the session playable. */ } }

const achievements = [
  { id: 'one', icon: '🚪', name: 'Only Staying for One', desc: 'Start your first kitchen party.' },
  { id: 'incident', icon: '🚨', name: 'Municipal Incident', desc: 'Reach wave 5 in Keep ’Er Goin’.' },
  { id: 'feed', icon: '🥪', name: 'Feed of People', desc: 'Serve 20 total snack orders.' },
  { id: 'ceilidh', icon: '🎻', name: 'Kitchen Ceilidh', desc: 'Build a 15-note fiddle streak.' },
  { id: 'chips', icon: '🌧', name: 'Storm Chip Strategist', desc: 'Collect 10 storm-chip bags.' },
  { id: 'chair', icon: '🪑', name: 'Still a Good Chair', desc: 'Survive 60 seconds in Last Chair Standing.' }
];
function unlock(id) {
  if (save.achievements[id]) return;
  save.achievements[id] = Date.now();
  persist();
  const a = achievements.find(x => x.id === id);
  if (a) toast(`Achievement: ${a.name} ${a.icon}`);
  updateMenu();
}

let scene, camera, renderer, clock, room, player, danceLight;
let ambientParticles = [];
let staticObstacles = [];
let interactStations = [];
let guests = [];
let dynamicObjects = [];
let markers = [];
let hazards = [];
let notes = [];
let pickups = [];
let currentInteractKey = null;
let interactProgress = 0;
let cameraShake = 0;
let worldReady = false;
let visualTime = 0;
let hudClock = 0;

const runtime = {
  mode: null, running: false, paused: false, upgrading: false, ended: false, session: 0,
  score: 0, multiplier: 1, elapsed: 0, sessionCaps: 0,
  speed: 4.7, interactRate: 1, dashCooldown: 0, dashTimer: 0, invincible: 0,
  chaos: null, snacks: null, fiddle: null, dodge: null
};

const input = {
  keys: new Set(), interact: false, dashQueued: false,
  joyX: 0, joyY: 0
};

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = save.settings.sound;
    this.musicClock = 0;
    this.step = 0;
    this.melody = [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 11, 9, 7, 4, 2];
  }
  ensure() {
    if (!this.enabled) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { this.ctx = new AC(); } catch { return false; }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(()=>{});
    return true;
  }
  tone(freq, length = .08, type = 'triangle', volume = .12, when = 0) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + .01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + length + .03);
  }
  click() { this.tone(440, .05, 'square', .055); }
  good() { this.tone(523, .08, 'triangle', .12); this.tone(659, .12, 'triangle', .1, .06); }
  bad() { this.tone(150, .18, 'sawtooth', .1); }
  dash() { this.tone(270, .07, 'sawtooth', .08); }
  hit() { this.tone(95, .2, 'square', .14); this.tone(70, .25, 'sawtooth', .08, .03); }
  beat() { this.tone(110, .055, 'sine', .1); }
  update(dt) {
    if (!runtime.running || runtime.paused || runtime.upgrading || !this.enabled) return;
    if (runtime.mode === 'fiddle') return;
    this.musicClock -= dt;
    if (this.musicClock <= 0) {
      this.musicClock = .38;
      const root = runtime.mode === 'dodge' ? 196 : 174.61;
      const semitone = this.melody[this.step % this.melody.length];
      this.tone(root * Math.pow(2, semitone / 12), .12, 'triangle', .035);
      if (this.step % 4 === 0) this.tone(root / 2, .09, 'sine', .025);
      this.step++;
    }
  }
  setEnabled(on) {
    this.enabled = on;
    save.settings.sound = on;
    persist();
    if (this.master) this.master.gain.value = on ? .18 : 0;
  }
}
const audio = new AudioEngine();

function init() {
  UI.loadingBar.style.width = '16%';
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('game-canvas'), antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.error(err); $('webgl-error').classList.add('active'); UI.loading.classList.remove('active'); return;
  }
  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = save.settings.quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a2730);
  scene.fog = new THREE.FogExp2(0x09242b, .018);
  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 100);
  camera.position.set(10.5, 11.2, 13.5);
  camera.lookAt(0, 0, 0);
  clock = new THREE.Clock();

  UI.loadingBar.style.width = '35%';
  buildLights();
  buildRoom();
  buildPlayer();
  buildGuests();
  buildStations();
  buildAmbient();
  UI.loadingBar.style.width = '82%';
  bindUI();
  bindInput();
  applySettingsToUI();
  updateMenu();
  worldReady = true;
  setTimeout(() => {
    UI.loadingBar.style.width = '100%';
    setTimeout(() => { UI.loading.classList.remove('active'); UI.menu.classList.add('active'); }, 260);
  }, 220);
  animate();
}

function getPixelRatio() {
  if (save.settings.quality === 'low') return 1;
  if (save.settings.quality === 'high') return Math.min(devicePixelRatio, 2);
  return Math.min(devicePixelRatio, innerWidth < 800 ? 1.35 : 1.75);
}

function mat(color, roughness = .75, metalness = .03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function addBox(parent, size, color, pos, rot = [0,0,0], material = null) {
  const m = mesh(new THREE.BoxGeometry(...size), material || mat(color), ...pos);
  m.rotation.set(...rot); parent.add(m); return m;
}
function addCylinder(parent, radius, height, color, pos, rot = [0,0,0], segments = 16) {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat(color), ...pos);
  m.rotation.set(...rot); parent.add(m); return m;
}

function buildLights() {
  scene.add(new THREE.HemisphereLight(0x9bdfff, 0x362317, 1.5));
  const key = new THREE.DirectionalLight(0xffe6bd, 2.2);
  key.position.set(4, 10, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024,1024); key.shadow.camera.left = -12; key.shadow.camera.right = 12;
  key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
  scene.add(key);
  danceLight = new THREE.PointLight(0xffb347, 10, 18, 2);
  danceLight.position.set(0, 4, 1); scene.add(danceLight);
}

function buildRoom() {
  room = new THREE.Group(); scene.add(room);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc99864, roughness: .86 });
  const floor = mesh(new THREE.BoxGeometry(17, .25, 13), floorMat, 0, -.15, 0);
  room.add(floor);
  // Worn linoleum tiles.
  for (let x = -8; x <= 8; x += 1) {
    for (let z = -6; z <= 6; z += 1) {
      if ((x + z) % 2 === 0) {
        const tile = mesh(new THREE.PlaneGeometry(.94, .94), new THREE.MeshStandardMaterial({ color: 0xd7ad7b, roughness: .9 }), x, -.018, z);
        tile.rotation.x = -Math.PI/2; tile.receiveShadow = true; room.add(tile);
      }
    }
  }
  const wallMat = mat(0x2e6666, .9);
  addBox(room, [17, 5.2, .25], 0, [0, 2.45, -6.35], [0,0,0], wallMat);
  addBox(room, [.25, 5.2, 13], 0, [-8.35, 2.45, 0], [0,0,0], wallMat);
  // Lower wood panelling.
  addBox(room, [17, 1.35, .12], 0x6f3f28, [0,.66,-6.18]);
  addBox(room, [.12,1.35,13], 0x6f3f28, [-8.18,.66,0]);

  // Window with sideways rain.
  const windowFrame = new THREE.Group(); windowFrame.position.set(3.5,2.6,-6.12); room.add(windowFrame);
  addBox(windowFrame,[4.4,2.2,.08],0xe7e2cf,[0,0,0]);
  addBox(windowFrame,[3.9,1.75,.1],0x173a4a,[0,0,.06]);
  addBox(windowFrame,[.1,1.85,.12],0xe7e2cf,[0,0,.12]);
  addBox(windowFrame,[4,.1,.12],0xe7e2cf,[0,0,.12]);
  for (let i=0;i<14;i++) {
    const rain = addBox(windowFrame,[.035,rand(.25,.55),.02],0x7dd9f7,[rand(-1.8,1.8),rand(-.75,.75),.14],[0,0,.55]);
    rain.material.emissive = new THREE.Color(0x2b8cb2); rain.material.emissiveIntensity = .9;
    ambientParticles.push({ mesh: rain, kind:'rain', baseY: rain.position.y, speed: rand(.8,1.6) });
  }

  // Counters and appliances.
  addBox(room,[6.1,.95,1.05],0xe3d8bf,[-3.8,.48,-5.35]);
  addBox(room,[6.1,.08,1.18],0x26373a,[-3.8,.98,-5.34]);
  addBox(room,[1.55,2.65,1.2],0xd8e6e4,[-7.35,1.33,-4.8]); // fridge
  addBox(room,[.08,1.0,.05],0x56676b,[-6.58,1.6,-4.17]);
  addBox(room,[1.4,.82,1.0],0x403d38,[-5.15,.45,-5.3]); // stove
  for (const dx of [-.38,.38]) for (const dz of [-.23,.23]) addCylinder(room,.17,.03,0x161616,[-5.15+dx,.89,-5.3+dz]);
  addBox(room,[1.4,.82,1.0],0xb8c7c9,[-2.8,.45,-5.3]); // sink cabinet
  const sink = mesh(new THREE.BoxGeometry(.9,.12,.65),mat(0x7e9498,.2,.55),-2.8,.94,-5.3); room.add(sink);
  const tap = addCylinder(room,.035,.55,0x9fb5b8,[-2.8,1.18,-5.55],[Math.PI/2,0,0],10);

  // Table and chairs.
  addBox(room,[4.5,.18,2.2],0x8c4c2f,[.4,1.02,.8]);
  for (const x of [-1.4,2.2]) for (const z of [.1,1.5]) addBox(room,[.18,1.0,.18],0x5b3527,[x,.5,z]);
  const chairPositions = [[-2.3,0.6],[-2.1,2.0],[3.1,.7],[2.8,2.1],[0,-1.2],[1.5,-1.1]];
  chairPositions.forEach(([x,z],i)=> buildChair(x,z,i%2?0:Math.PI));
  staticObstacles.push({minX:-2,maxX:2.8,minZ:-.45,maxZ:2.0});

  // Rug/dance area.
  const rug = mesh(new THREE.CylinderGeometry(2.4,2.4,.035,32),new THREE.MeshStandardMaterial({color:0x9e3040,roughness:.9}),2.8,.01,-2.2);
  room.add(rug);
  const ring = mesh(new THREE.TorusGeometry(2.02,.045,8,48),new THREE.MeshStandardMaterial({color:0xffc857,emissive:0xff8c2a,emissiveIntensity:.8}),2.8,.06,-2.2);
  ring.rotation.x = Math.PI/2; room.add(ring);

  // Door and neighbour zone.
  addBox(room,[.25,4.6,2.4],0x73492f,[-8.16,2.1,3.7]);
  addCylinder(room,.07,.14,0xe8b948,[-8.0,2.0,4.45],[0,0,Math.PI/2],12);

  // String lights.
  const colours = [0xff5d5d,0xffcf54,0x65e1cb,0x61bdf3];
  for(let i=0;i<14;i++){
    const x=-7.3+i*1.08;
    const bulb=mesh(new THREE.SphereGeometry(.095,10,8),new THREE.MeshStandardMaterial({color:colours[i%4],emissive:colours[i%4],emissiveIntensity:2}),x,4.65,-6.05);
    room.add(bulb); ambientParticles.push({mesh:bulb,kind:'bulb',phase:i*.6});
  }
  // Framed map-ish Maritime blob.
  addBox(room,[2.1,1.55,.08],0xd8c38e,[-8.08,3.2,-1.9],[0,Math.PI/2,0]);
  const map = new THREE.Group(); map.position.set(-8.01,3.2,-1.9); map.rotation.y=Math.PI/2; room.add(map);
  [[-.45,.2,.35,.5],[0,.05,.25,.8],[.4,-.2,.45,.25],[.62,.25,.18,.55]].forEach(([x,y,sx,sy])=>addBox(map,[sx,sy,.04],0x357c67,[x,y,.08]));

  // Little kitchen clutter.
  for(let i=0;i<7;i++) addCylinder(room,.11,.42,pick([0xd84f45,0xe2b84e,0x4d9cb5]),[rand(-1.4,2.0),1.32,rand(.1,1.5)],[0,0,0],12);
  addBox(room,[.65,.12,.45],0xd5b469,[1.5,1.23,.65]);
  addCylinder(room,.32,.38,0x315c63,[-2.1,1.22,-5.25]);
}

function buildChair(x,z,rot=0) {
  const c = new THREE.Group(); c.position.set(x,0,z); c.rotation.y=rot; room.add(c);
  addBox(c,[.75,.12,.75],0x58717a,[0,.58,0]);
  addBox(c,[.75,.75,.1],0x58717a,[0,1.0,.32]);
  for(const dx of [-.28,.28]) for(const dz of [-.28,.28]) addBox(c,[.08,.6,.08],0x263b40,[dx,.28,dz]);
}

function buildPlayer() {
  player = new THREE.Group(); player.position.set(0,0,-1.2); scene.add(player);
  const body = mesh(new THREE.CapsuleGeometry(.38,.72,4,10),mat(0xe05549),0,1.03,0); player.add(body);
  const head = mesh(new THREE.SphereGeometry(.34,16,12),mat(0xf0bd8b),0,1.72,0); player.add(head);
  const hair = mesh(new THREE.SphereGeometry(.35,14,10,0,Math.PI*2,0,Math.PI*.52),mat(0x493126),0,1.81,0); player.add(hair);
  const toque = mesh(new THREE.CylinderGeometry(.28,.36,.3,16),mat(0x1c6f78),0,2.0,0); player.add(toque);
  const pom = mesh(new THREE.SphereGeometry(.12,10,8),mat(0xffc857),0,2.2,0); player.add(pom);
  const armGeo = new THREE.CapsuleGeometry(.105,.5,3,8);
  const leftArm = mesh(armGeo,mat(0xe05549),-.48,1.12,0); leftArm.rotation.z=-.2; player.add(leftArm);
  const rightArm = mesh(armGeo,mat(0xe05549),.48,1.12,0); rightArm.rotation.z=.2; player.add(rightArm);
  player.userData = { body, leftArm, rightArm, facing: new THREE.Vector3(0,0,1), moving: false };
}

const guestNames = ['Aunt Bev','Cousin Ryan','Nan','The Neighbour’s Cousin','Buddy from Work','Shy Accordion Guy','Kim from Away','Uncle Terry'];
function makePerson(name, colour, x,z, scale=1) {
  const g = new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(scale); g.userData.name=name;
  const body=mesh(new THREE.CapsuleGeometry(.3,.58,3,8),mat(colour),0,.93,0); g.add(body);
  const head=mesh(new THREE.SphereGeometry(.27,12,10),mat(pick([0xf1c49b,0xd99f75,0x9f684a,0xe8b185])),0,1.52,0); g.add(head);
  const hair=mesh(new THREE.SphereGeometry(.28,12,8,0,Math.PI*2,0,Math.PI*.48),mat(pick([0x3a2a24,0x796050,0xc4a678,0x201b19])),0,1.61,0); g.add(hair);
  const armL=mesh(new THREE.CapsuleGeometry(.08,.38,3,7),mat(colour),-.38,1.0,0); armL.rotation.z=-.3; g.add(armL);
  const armR=mesh(new THREE.CapsuleGeometry(.08,.38,3,7),mat(colour),.38,1.0,0); armR.rotation.z=.3; g.add(armR);
  g.userData.parts={body,head,armL,armR};
  g.userData.phase=Math.random()*Math.PI*2; g.userData.home=new THREE.Vector3(x,0,z); g.userData.order=null; g.userData.orderSprite=null;
  scene.add(g); return g;
}
function buildGuests() {
  const spots=[[-5.8,-2.5],[-4.4,2.8],[-.7,3.9],[3.6,3.7],[4.2,-2.3],[6.3,.2],[1.5,-4.1],[-5.4,.1]];
  const colours=[0xe85d75,0x4a93b5,0x7f9d54,0xd38445,0x7958a6,0x3c8b79,0xc85040,0x57738d];
  guests=spots.map((p,i)=>makePerson(guestNames[i],colours[i],p[0],p[1],rand(.92,1.08)));
}

const FOOD = {
  chips:{name:'STORM CHIPS',icon:'🌧',colour:0x4b9bc2},
  tea:{name:'TEA',icon:'🫖',colour:0xb95d42},
  sandwich:{name:'SANDWICHES',icon:'🥪',colour:0xd8aa45},
  squares:{name:'SQUARES',icon:'🍰',colour:0xc781aa},
  donair:{name:'DONAIR',icon:'🌯',colour:0xe07149},
  pop:{name:'POP',icon:'🥤',colour:0x62a85b}
};
function buildStations() {
  const defs=[
    {item:'chips',pos:[-6.5,0,-1.2],label:'STORM CHIPS'},
    {item:'tea',pos:[-2.0,0,-5.1],label:'TEA'},
    {item:'sandwich',pos:[1.4,0,-1.05],label:'SANDWICHES'},
    {item:'squares',pos:[-.8,0,-1.05],label:'SQUARES'},
    {item:'donair',pos:[-6.8,0,-4.25],label:'DONAIR'},
    {item:'pop',pos:[5.8,0,3.8],label:'POP'}
  ];
  defs.forEach((d,i)=>{
    const group=new THREE.Group(); group.position.set(...d.pos); scene.add(group);
    const base=mesh(new THREE.CylinderGeometry(.42,.48,.18,16),mat(FOOD[d.item].colour),0,.14,0); group.add(base);
    const icon=makeTextSprite(FOOD[d.item].icon,{fontSize:64,bg:'rgba(0,0,0,0)',scale:[.8,.8]}); icon.position.set(0,1.1,0); group.add(icon);
    const label=makeTextSprite(d.label,{fontSize:34,bg:'rgba(5,25,30,.85)',padding:14,scale:[1.8,.45]}); label.position.set(0,.65,0); group.add(label);
    group.userData={kind:'station',item:d.item,label:d.label,radius:1.05,key:`station-${d.item}`};
    interactStations.push(group);
  });
}

function buildAmbient() {
  for(let i=0;i<25;i++){
    const dust=mesh(new THREE.SphereGeometry(.018,5,4),new THREE.MeshBasicMaterial({color:0xffe7b2,transparent:true,opacity:rand(.12,.38)}),rand(-8,8),rand(.2,4.5),rand(-6,6));
    dust.castShadow=false; scene.add(dust); ambientParticles.push({mesh:dust,kind:'dust',phase:rand(0,10),speed:rand(.1,.3)});
  }
}

function makeTextSprite(text,{fontSize=42,bg='rgba(3,20,24,.86)',fg='#fff7df',padding=18,scale=[2.2,.62]}={}) {
  const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d');
  ctx.font=`800 ${fontSize}px DM Sans, Arial`; const w=Math.ceil(ctx.measureText(text).width+padding*2); const h=fontSize+padding*2;
  canvas.width=THREE.MathUtils.ceilPowerOfTwo(w); canvas.height=THREE.MathUtils.ceilPowerOfTwo(h);
  const x=(canvas.width-w)/2, y=(canvas.height-h)/2;
  if(bg!=='rgba(0,0,0,0)') { ctx.fillStyle=bg; roundRect(ctx,x,y,w,h,18); ctx.fill(); }
  ctx.font=`800 ${fontSize}px DM Sans, Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=fg;
  ctx.fillText(text,canvas.width/2,canvas.height/2+1);
  const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; tex.minFilter=THREE.LinearFilter;
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false})); spr.scale.set(scale[0],scale[1],1); spr.renderOrder=50;
  spr.userData.dispose=()=>{tex.dispose();spr.material.dispose();};
  return spr;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

function bindUI() {
  document.querySelectorAll('.mode-card').forEach(btn=>btn.addEventListener('click',()=>startGame(btn.dataset.mode)));
  $('how-button').addEventListener('click',()=>UI.how.classList.add('active'));
  $('settings-button').addEventListener('click',()=>UI.settings.classList.add('active'));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).classList.remove('active')));
  $('pause-button').addEventListener('click',togglePause);
  $('resume-button').addEventListener('click',togglePause);
  $('restart-button').addEventListener('click',()=>{UI.pause.classList.remove('active');startGame(runtime.mode);});
  $('menu-button').addEventListener('click',returnToMenu);
  $('again-button').addEventListener('click',()=>startGame(runtime.mode));
  $('end-menu-button').addEventListener('click',returnToMenu);
  $('share-button').addEventListener('click',copyScore);
  $('mute-button').addEventListener('click',()=>{audio.setEnabled(!audio.enabled);updateMuteIcon();});
  $('setting-sound').addEventListener('change',e=>{audio.setEnabled(e.target.checked);updateMuteIcon();});
  $('setting-motion').addEventListener('change',e=>{save.settings.reducedMotion=e.target.checked;persist();});
  $('setting-shake').addEventListener('change',e=>{save.settings.shake=e.target.checked;persist();});
  $('setting-quality').addEventListener('change',e=>{save.settings.quality=e.target.value;persist();renderer.setPixelRatio(getPixelRatio());renderer.shadowMap.enabled=e.target.value!=='low';toast('Quality updated');});
  $('reset-progress').addEventListener('click',()=>{
    if(confirm('Reset all local scores, bottle caps, and achievements?')){save=structuredClone(defaults);persist();applySettingsToUI();updateMenu();toast('Local progress reset');}
  });
  addEventListener('resize',onResize);
  const pauseForFocus=()=>{resetInput();if(runtime.running&&!runtime.paused&&!runtime.upgrading)togglePause();};
  addEventListener('blur',pauseForFocus);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForFocus();});
}
function applySettingsToUI(){
  $('setting-sound').checked=save.settings.sound; $('setting-motion').checked=save.settings.reducedMotion;
  $('setting-shake').checked=save.settings.shake; $('setting-quality').value=save.settings.quality;
  audio.enabled=save.settings.sound; updateMuteIcon();
}
function updateMuteIcon(){$('mute-button').textContent=audio.enabled?'♪':'×';}

function resetInput(){input.keys.clear();input.interact=false;input.dashQueued=false;input.joyX=input.joyY=0;const knob=$('joystick').querySelector('i');if(knob)knob.style.transform='';}

function bindInput() {
  addEventListener('keydown',e=>{
    if(e.target?.closest?.('input,select,textarea')||(e.target?.closest?.('button')&&['Space','Enter'].includes(e.code)))return;
    if(!runtime.running||runtime.upgrading)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    input.keys.add(e.code);
    if(e.code==='KeyE'||e.code==='Space')input.interact=true;
    if(!e.repeat&&(e.code==='ShiftLeft'||e.code==='ShiftRight'))input.dashQueued=true;
    if(!e.repeat&&(e.code==='KeyP'||e.code==='Escape')&&runtime.running&&!runtime.upgrading)togglePause();
  });
  addEventListener('keyup',e=>{
    input.keys.delete(e.code);
    if(e.code==='KeyE'||e.code==='Space')input.interact=false;
  });
  const joy=$('joystick'), knob=joy.querySelector('i');
  let joyPointer=null;
  const setJoy=e=>{
    const r=joy.getBoundingClientRect(); const cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy; const max=r.width*.32; const d=Math.hypot(dx,dy)||1;
    if(d>max){dx=dx/d*max;dy=dy/d*max;}
    input.joyX=dx/max; input.joyY=dy/max; knob.style.transform=`translate(${dx}px,${dy}px)`;
  };
  joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);setJoy(e);});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e);});
  const endJoy=e=>{if(e.pointerId!==joyPointer)return;joyPointer=null;input.joyX=input.joyY=0;knob.style.transform='';};
  joy.addEventListener('pointerup',endJoy); joy.addEventListener('pointercancel',endJoy);joy.addEventListener('lostpointercapture',endJoy);
  $('touch-interact').addEventListener('pointerdown',e=>{e.preventDefault();input.interact=true;});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>$('touch-interact').addEventListener(ev,()=>input.interact=false));
  $('touch-dash').addEventListener('pointerdown',e=>{e.preventDefault();input.dashQueued=true;});
}

function updateMenu() {
  Object.keys(save.highs).forEach(k=>$(`best-${k}`).textContent=`BEST ${formatScore(save.highs[k])}`);
  $('caps-total').textContent=formatScore(save.caps);
  $('lore-text').textContent=lore[(new Date().getDate()+new Date().getMonth()*3)%lore.length];
  $('achievement-list').innerHTML=achievements.map(a=>`<div class="achievement ${save.achievements[a.id]?'unlocked':''}" title="${a.desc}"><span>${save.achievements[a.id]?a.icon:'○'}</span><b>${a.name}</b></div>`).join('');
}

function startGame(mode) {
  resetInput();audio.ensure();
  clearDynamic();
  runtime.session++;
  runtime.mode=mode; runtime.running=true; runtime.paused=false; runtime.upgrading=false; runtime.ended=false;
  runtime.score=0; runtime.multiplier=1; runtime.elapsed=0; runtime.sessionCaps=0; hudClock=0; cameraShake=0; audio.musicClock=0; audio.step=0;
  runtime.speed=4.7; runtime.interactRate=1; runtime.dashCooldown=0; runtime.dashTimer=0; runtime.invincible=0;
  runtime.chaos=runtime.snacks=runtime.fiddle=runtime.dodge=null;
  player.position.set(0,0,-1.2); player.rotation.y=0; player.visible=true;
  guests.forEach((g,i)=>{g.visible=true;g.position.copy(g.userData.home);clearGuestOrder(g);});
  interactStations.forEach(s=>s.visible=mode==='snacks');
  UI.menu.classList.remove('active'); UI.pause.classList.remove('active'); UI.end.classList.remove('active'); UI.upgrade.classList.remove('active');
  UI.hud.classList.remove('hidden'); UI.touch.classList.remove('hidden');
  UI.chaosHud.classList.toggle('hidden',mode!=='chaos'); UI.snacksHud.classList.toggle('hidden',mode!=='snacks');
  UI.fiddleHud.classList.toggle('hidden',mode!=='fiddle'); UI.dodgeHud.classList.toggle('hidden',mode!=='dodge');
  UI.modeTitle.textContent=MODE_META[mode].title;
  UI.eventStack.innerHTML=''; setObjective('GET READY','The kitchen is warming up…','Move with WASD or the touch joystick.');
  save.stats.plays++; persist(); unlock('one');
  if(mode==='chaos')initChaos();
  if(mode==='snacks')initSnacks();
  if(mode==='fiddle')initFiddle();
  if(mode==='dodge')initDodge();
  updateHUD();
}

function returnToMenu() {
  resetInput();
  runtime.running=false;runtime.paused=false;runtime.upgrading=false;runtime.ended=false;
  clearDynamic(); guests.forEach(g=>{g.visible=true;clearGuestOrder(g);}); interactStations.forEach(s=>s.visible=false);
  UI.pause.classList.remove('active');UI.end.classList.remove('active');UI.upgrade.classList.remove('active');
  UI.hud.classList.add('hidden');UI.touch.classList.add('hidden');UI.menu.classList.add('active');
  updateMenu();
}
function togglePause(){
  if(!runtime.running||runtime.ended||runtime.upgrading)return;
  runtime.paused=!runtime.paused;UI.pause.classList.toggle('active',runtime.paused);
  resetInput();
}
function copyScore(){
  const text=`I scored ${formatScore(runtime.score)} in ${MODE_META[runtime.mode].title} — Kitchen Party: Outta Hand!`;
  navigator.clipboard?.writeText(text).then(()=>toast('Score copied. Tell the group chat.')).catch(()=>toast(text));
}

function initChaos() {
  runtime.chaos={vibe:68,snacks:82,mess:8,neighbour:92,wave:1,waveTime:0,waveLength:38,nextEvent:2.5,events:[],resolved:0,
    upgrades:{move:0,fix:0,calm:0,tidy:0,score:0,eventDelay:0,snack:0,shield:0}};
  setObjective('HOUSE CHECK','Keep all four party meters healthy','Crises appear as glowing markers around the kitchen.');
}

const chaosDefs=[
  {title:'Kettle Boiling Dry',icon:'🫖',pos:[-2.0,0,-5.0],time:1.7,ttl:15,detail:'Save the kettle before it becomes cookware archaeology.',effects:{vibe:-.7,mess:.25},resolve:{vibe:5,mess:-2}},
  {title:'Gull Through the Window',icon:'🐦',pos:[3.6,0,-5.35],time:2.4,ttl:18,detail:'Shoo it out. It has already judged the sandwiches.',effects:{snacks:-1.1,mess:.5},resolve:{vibe:7,snacks:4}},
  {title:'Storm Chips Critical',icon:'🌧',pos:[-6.4,0,-1.2],time:1.4,ttl:14,detail:'Refill the bowl. Preparedness is a shared responsibility.',effects:{vibe:-1.0,snacks:-.7},resolve:{snacks:15,vibe:4}},
  {title:'Bluetooth Coup',icon:'🔊',pos:[5.6,0,-3.8],time:2.1,ttl:17,detail:'Someone has connected and their playlist cannot be allowed to govern.',effects:{vibe:-1.25,neighbour:-.3},resolve:{vibe:10}},
  {title:'Donair Sauce Footprint',icon:'👣',pos:[-4.0,0,1.9],time:2.2,ttl:19,detail:'Mop the evidence before it spreads coast to coast.',effects:{mess:1.15,vibe:-.3},resolve:{mess:-18}},
  {title:'Same Song Request Again',icon:'🎵',pos:[3.7,0,3.55],time:1.8,ttl:18,detail:'Diplomatically redirect Uncle Terry toward literally any other tune.',effects:{vibe:-.8,neighbour:-.25},resolve:{vibe:7,neighbour:3}},
  {title:'Folding Chair Failure',icon:'🪑',pos:[3.55,0,2.55],time:2.0,ttl:17,detail:'It is still a good chair. It merely needs conviction.',effects:{vibe:-.55,mess:.65},resolve:{vibe:6,mess:-5}},
  {title:'Neighbour at the Door',icon:'🚪',pos:[-7.6,0,3.7],time:2.6,ttl:16,detail:'Deploy charm, apologies, and a small plate of squares.',effects:{neighbour:-1.35,vibe:-.2},resolve:{neighbour:18,vibe:2}},
  {title:'Fridge Door Wide Open',icon:'🧊',pos:[-6.9,0,-4.4],time:1.2,ttl:13,detail:'Close it. We are not heating the entire Atlantic Ocean.',effects:{snacks:-.65,neighbour:-.25},resolve:{snacks:5}},
  {title:'Cutlery Drawer Avalanche',icon:'🥄',pos:[-1.0,0,-4.8],time:2.0,ttl:17,detail:'Return seven hundred utensils to the one drawer that fits none of them.',effects:{mess:1.0,vibe:-.35},resolve:{mess:-14}},
  {title:'Mystery Coat Mountain',icon:'🧥',pos:[-6.3,0,3.0],time:2.5,ttl:22,detail:'Sort the coats before the pile achieves municipal status.',effects:{mess:.75},resolve:{mess:-16,vibe:3}},
  {title:'Rogue Lobster',icon:'🦞',pos:[1.0,0,-3.5],time:2.3,ttl:18,detail:'Nobody remembers inviting it. Nobody wants to confront it.',effects:{vibe:-.45,snacks:-.55,mess:.45},resolve:{vibe:9,snacks:3}},
  {title:'Screen Door Symphony',icon:'🚪',pos:[-7.4,0,1.6],time:1.8,ttl:15,detail:'Stop the slam-slam-slam before the neighbour begins a petition.',effects:{neighbour:-1.0},resolve:{neighbour:11}},
  {title:'Dishwasher Rave',icon:'🫧',pos:[-2.7,0,-4.7],time:2.1,ttl:17,detail:'The machine is walking itself across the floor. Negotiate.',effects:{mess:.7,neighbour:-.45},resolve:{mess:-8,neighbour:5}},
  {title:'Kitchen Percussion Solo',icon:'🥁',pos:[.5,0,-1.25],time:2.2,ttl:18,detail:'Remove the wooden spoons from the amateur drummer.',effects:{neighbour:-.85,vibe:.15},resolve:{neighbour:8,vibe:5}}
];

function spawnChaosEvent(){
  const c=runtime.chaos;if(!c)return;
  const activeTitles=new Set(c.events.map(e=>e.def.title));
  const choices=chaosDefs.filter(d=>!activeTitles.has(d.title));
  if(!choices.length)return;
  const def=pick(choices); const marker=createMarker(def.pos,def.icon,def.title,0xef5b4c);
  const e={id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,def,marker,ttl:def.ttl,maxTtl:def.ttl,progress:0};
  c.events.push(e); dynamicObjects.push(marker);
  audio.bad(); toast(def.title);
}
function updateChaos(dt){
  const c=runtime.chaos; c.waveTime+=dt; c.nextEvent-=dt;
  const maxEvents=Math.min(2+Math.floor(c.wave/2),6);
  if(c.nextEvent<=0&&c.events.length<maxEvents){spawnChaosEvent();c.nextEvent=Math.max(2.7,8.5-c.wave*.62)+rand(0,2.8)+c.upgrades.eventDelay*.75;}
  let vibeDrain=.04+.012*c.wave;
  c.events.forEach(e=>{
    e.ttl-=dt; const ef=e.def.effects;
    c.vibe+= (ef.vibe||0)*dt; c.snacks+=(ef.snacks||0)*dt; c.mess+=(ef.mess||0)*dt; c.neighbour+=(ef.neighbour||0)*dt;
    e.marker.rotation.y+=dt*1.4; e.marker.position.y=.08+Math.sin(runtime.elapsed*4+e.marker.userData.phase)*.09;
    if(e.ttl<=0){
      c.vibe-=8;c.mess+=6;c.neighbour-=4; removeChaosEvent(e,false); toast(`${e.def.title}: got away from us`); audio.bad();
    }
  });
  c.vibe-=vibeDrain*dt;
  c.snacks-=Math.max(.035,.08+c.wave*.012-c.upgrades.snack*.012)*dt;
  c.mess+=Math.max(.02,.055+c.wave*.011-c.upgrades.tidy*.008)*dt;
  c.neighbour-=Math.max(.015,.035+c.wave*.008-c.upgrades.calm*.008)*dt;
  c.vibe=clamp(c.vibe,0,100);c.snacks=clamp(c.snacks,0,100);c.mess=clamp(c.mess,0,100);c.neighbour=clamp(c.neighbour,0,100);
  runtime.score+=dt*(8+c.wave*2)*runtime.multiplier;
  if(c.waveTime>=c.waveLength){
    c.wave++;c.waveTime=0;c.waveLength=Math.min(52,c.waveLength+2);save.stats.bestWave=Math.max(save.stats.bestWave,c.wave);persist();
    if(c.wave>=5)unlock('incident'); showUpgrades(); return;
  }
  if(c.vibe<=0)endGame('The vibe quietly left','Somebody said “we should probably head out” and, against all precedent, everyone did.','😶');
  else if(c.snacks<=0)endGame('The chip bowl went empty','A preventable tragedy. The room has entered a period of reflection.','🥔');
  else if(c.mess>=100)endGame('The kitchen became sentient','The floor is now legally classified as a wetland.','🧹');
  else if(c.neighbour<=0)endGame('The neighbours called it','The porch light blinked three times. The universal signal.','🚨');
}
function removeChaosEvent(e,resolved){
  const c=runtime.chaos;if(!c)return; const idx=c.events.indexOf(e);if(idx>=0)c.events.splice(idx,1);
  removeObject(e.marker); if(resolved){
    const r=e.def.resolve;c.vibe+=(r.vibe||0);c.snacks+=(r.snacks||0);c.mess+=(r.mess||0);c.neighbour+=(r.neighbour||0);
    c.resolved++;runtime.score+=(120+c.wave*22)*runtime.multiplier;runtime.multiplier=Math.min(5,runtime.multiplier+.1);
    audio.good();burst(e.marker?.position||player.position,0xffc857);toast(pick(['Handled. Barely.','That’ll do.','Crisis downgraded to anecdote.','Kitchen stabilized-ish.']));
  }
}

const upgrades=[
  {icon:'👢',title:'Indoor Shoes',desc:'Move 12% faster. Nan disapproves, but results are results.',apply:()=>{runtime.speed*=1.12;runtime.chaos.upgrades.move++;}},
  {icon:'🧰',title:'Buddy Who Knows a Guy',desc:'Resolve every crisis 18% faster with undocumented expertise.',apply:()=>{runtime.interactRate*=1.18;runtime.chaos.upgrades.fix++;}},
  {icon:'🌧',title:'Strategic Storm Chips',desc:'Restore 25 snacks now and slow passive snack loss.',apply:()=>{runtime.chaos.snacks+=25;runtime.chaos.upgrades.snack++;}},
  {icon:'🧹',title:'Industrial Tea Towel',desc:'Drop mess by 22 and slow the kitchen’s natural slide into chaos.',apply:()=>{runtime.chaos.mess-=22;runtime.chaos.upgrades.tidy++;}},
  {icon:'🙂',title:'Neighbour Diplomacy',desc:'Restore 22 neighbour patience and make future noise slightly less political.',apply:()=>{runtime.chaos.neighbour+=22;runtime.chaos.upgrades.calm++;}},
  {icon:'⏳',title:'Maritime Goodbye',desc:'Crises take longer to arrive. Nobody can leave quickly anyway.',apply:()=>{runtime.chaos.upgrades.eventDelay++;runtime.chaos.nextEvent+=3;}},
  {icon:'♻',title:'Bottle Depot Economics',desc:'Earn 20% more score from here on out.',apply:()=>{runtime.multiplier+=.2;runtime.chaos.upgrades.score++;}},
  {icon:'🧿',title:'Nan’s Look',desc:'Cancel the oldest active crisis and add 8 vibe.',apply:()=>{const c=runtime.chaos;if(c.events[0])removeChaosEvent(c.events[0],true);c.vibe+=8;}},
  {icon:'🫖',title:'Emergency Tea Round',desc:'Restore 18 vibe and 12 neighbour patience. The old technology still works.',apply:()=>{runtime.chaos.vibe+=18;runtime.chaos.neighbour+=12;}}
];
function showUpgrades(){
  resetInput();runtime.upgrading=true; UI.upgrade.classList.add('active');
  const choices=shuffle(upgrades).slice(0,3);$('upgrade-cards').innerHTML='';
  choices.forEach(u=>{
    const b=document.createElement('button');b.className='upgrade-card';b.innerHTML=`<span class="uicon">${u.icon}</span><b>${u.title}</b><span>${u.desc}</span>`;
    b.addEventListener('click',()=>{if(!runtime.upgrading)return;resetInput();u.apply();runtime.chaos.vibe=clamp(runtime.chaos.vibe,0,100);runtime.chaos.snacks=clamp(runtime.chaos.snacks,0,100);runtime.chaos.mess=clamp(runtime.chaos.mess,0,100);runtime.chaos.neighbour=clamp(runtime.chaos.neighbour,0,100);UI.upgrade.classList.remove('active');runtime.upgrading=false;audio.good();toast(`Wave ${runtime.chaos.wave}: the kitchen continues`);});
    $('upgrade-cards').appendChild(b);
  });
}

function initSnacks(){
  runtime.snacks={time:120,lives:3,ordersDone:0,combo:0,carrying:null,nextOrder:.4};
  const session=runtime.session;
  guests.slice(0,3).forEach((g,i)=>setTimeout(()=>{if(runtime.session===session&&runtime.mode==='snacks'&&runtime.running)assignOrder(g);},250+i*180));
  setObjective('FIRST ORDER','Look for a food icon over a guest','Pick it up from the matching labelled station, then deliver it.');
}
function assignOrder(guest){
  if(!runtime.snacks||guest.userData.order)return;
  const item=pick(Object.keys(FOOD)); const max=rand(12,18);
  guest.userData.order={item,time:max,max};
  const spr=makeTextSprite(`${FOOD[item].icon}  ${FOOD[item].name}`,{fontSize:35,bg:'rgba(5,27,32,.92)',scale:[1.75,.48]});
  spr.position.set(0,2.35,0);guest.add(spr);guest.userData.orderSprite=spr;dynamicObjects.push(spr);
}
function clearGuestOrder(g){
  if(g.userData.orderSprite){
    const spr=g.userData.orderSprite;g.remove(spr);disposeObject(spr);
    const i=dynamicObjects.indexOf(spr);if(i>=0)dynamicObjects.splice(i,1);
    g.userData.orderSprite=null;
  }
  g.userData.order=null;
}
function updateSnacks(dt){
  const s=runtime.snacks;s.time-=dt;s.nextOrder-=dt;
  runtime.score+=dt*2;
  const active=guests.filter(g=>g.userData.order);
  active.forEach(g=>{
    g.userData.order.time-=dt;
    if(g.userData.order.time<=0){
      clearGuestOrder(g);s.lives=Math.max(0,s.lives-1);s.combo=0;runtime.multiplier=1;audio.bad();toast(`${g.userData.name} has entered a snack-related mood`);
      const session=runtime.session;
      setTimeout(()=>{if(runtime.session===session&&runtime.mode==='snacks'&&runtime.running)assignOrder(g);},1200);
    }
  });
  const desired=Math.min(2+Math.floor((120-s.time)/28),5);
  if(s.nextOrder<=0&&active.length<desired){
    const free=guests.filter(g=>!g.userData.order);if(free.length)assignOrder(pick(free));s.nextOrder=rand(2.5,4.5);
  }
  if(s.lives<=0)endGame('The room got hangry','Three guests went unserved. The kitchen has lost the confidence of the people.','🥪');
  else if(s.time<=0)endGame('A proper feed of people',`You served ${s.ordersDone} orders and nobody had to eat a decorative candle.`, '🏆');
}
function deliverOrder(g){
  const s=runtime.snacks,o=g.userData.order;if(!o)return;
  if(!s.carrying){toast('Your hands are impressively empty');audio.bad();return;}
  if(s.carrying!==o.item){toast(`${g.userData.name} asked for ${FOOD[o.item].name}, not ${FOOD[s.carrying].name}`);audio.bad();return;}
  const quick=o.time/o.max;s.ordersDone++;s.combo++;runtime.multiplier=Math.min(5,1+Math.floor(s.combo/3)*.5);
  runtime.score+=(100+Math.floor(quick*180))*runtime.multiplier;s.carrying=null;save.stats.orders++;if(save.stats.orders>=20)unlock('feed');persist();
  burst(g.position,FOOD[o.item].colour);clearGuestOrder(g);audio.good();toast(pick(['Delivered with seconds to spare.','A thing of beauty.','Snack diplomacy succeeds.','The room approves.']));
  const session=runtime.session;
  setTimeout(()=>{if(runtime.session===session&&runtime.mode==='snacks'&&runtime.running)assignOrder(g);},rand(900,1700));
}

function initFiddle(){
  runtime.fiddle={time:90,beat:0,beatInterval:.62,beatCount:0,nextNoteBeat:1,energy:56,streak:0,bestStreak:0,misses:0};
  player.position.set(2.8,0,-2.2);setObjective('FOLLOW THE NOTES','Collect glowing notes around the dance floor','Catch them close to the beat for a much bigger score.');
}
function spawnNote(){
  const f=runtime.fiddle;
  let point;
  for(let tries=0;tries<12;tries++){
    const angle=rand(0,Math.PI*2),radius=rand(1.1,4.8);
    const candidate=new THREE.Vector3(clamp(2.8+Math.cos(angle)*radius,-7.2,7.2),0,clamp(-2.2+Math.sin(angle)*radius,-5.3,5.2));
    if(!collidesObstacle(candidate)){point=candidate;break;}
  }
  point ||= randomFloorPoint();
  const x=point.x,z=point.z;
  const gold=f.beatCount%12===0;
  const group=new THREE.Group();group.position.set(x,.42,z);scene.add(group);
  const orb=mesh(new THREE.SphereGeometry(gold?.32:.24,16,12),new THREE.MeshStandardMaterial({color:gold?0xffc857:0x6fe6c2,emissive:gold?0xff8c2a:0x2fc69e,emissiveIntensity:2}),0,0,0);group.add(orb);
  const ring=mesh(new THREE.TorusGeometry(gold?.47:.36,.045,8,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75}),0,0,0);ring.rotation.x=Math.PI/2;group.add(ring);
  const spr=makeTextSprite(gold?'★':'♪',{fontSize:64,bg:'rgba(0,0,0,0)',scale:[.55,.55]});spr.position.set(0,.65,0);group.add(spr);
  group.userData={kind:'note',gold,life:2.5,maxLife:2.5,phase:rand(0,10)};notes.push(group);dynamicObjects.push(group);
}
function updateFiddle(dt){
  const f=runtime.fiddle;f.time-=dt;f.beat+=dt;f.energy-=dt*1.4;
  if(f.beat>=f.beatInterval){
    f.beat-=f.beatInterval;f.beatCount++;audio.beat();const dot=$('beat-dot');dot.classList.remove('pulse');void dot.offsetWidth;dot.classList.add('pulse');
    if(f.beatCount>=f.nextNoteBeat){spawnNote();f.nextNoteBeat=f.beatCount+(Math.random()<.28?1:2);}
  }
  for(const n of [...notes]){
    n.userData.life-=dt;n.rotation.y+=dt*2;n.position.y=.4+Math.sin(runtime.elapsed*5+n.userData.phase)*.15;
    if(horizontalDistance(player.position,n.position)<.72){
      const timing=Math.min(f.beat,f.beatInterval-f.beat);const perfect=timing<.11;
      f.streak++;f.bestStreak=Math.max(f.bestStreak,f.streak);f.energy=clamp(f.energy+(n.userData.gold?15:perfect?8:5),0,100);
      runtime.multiplier=Math.min(6,1+Math.floor(f.streak/5)*.5);runtime.score+=(n.userData.gold?400:perfect?180:90)*runtime.multiplier;
      burst(n.position,n.userData.gold?0xffc857:0x6fe6c2);removeNote(n);audio.good();toast(n.userData.gold?'KITCHEN LEGEND NOTE!':perfect?'RIGHT ON THE BEAT!':'Nice step!');
      save.stats.bestStreak=Math.max(save.stats.bestStreak,f.bestStreak);if(f.bestStreak>=15)unlock('ceilidh');persist();
    } else if(n.userData.life<=0){
      f.streak=0;runtime.multiplier=1;f.energy-=7;f.misses++;removeNote(n);audio.bad();
    }
  }
  runtime.score+=dt*3;
  if(f.energy<=0)endGame('The floor lost the tune','The crowd energy dipped below conversational humming.','🎻');
  else if(f.time<=0)endGame('The kitchen became a ceilidh',`Best streak: ${f.bestStreak}. The floorboards will remember this.`, '🎻');
}
function removeNote(n){const i=notes.indexOf(n);if(i>=0)notes.splice(i,1);removeObject(n);}

function initDodge(){
  runtime.dodge={lives:3,nextHazard:1.2,nextPickup:4,intensity:0,chips:0,shield:0};
  setObjective('STAY UPRIGHT','Dodge the red hazards and collect storm chips','Dash through tight gaps. Three hits and the good chair wins.');
}
const hazardKinds=['bottle','lobster','chair','boot'];
function spawnHazard(){
  const d=runtime.dodge;const kind=pick(hazardKinds);const side=Math.floor(Math.random()*4);let x,z;
  if(side===0){x=-8.2;z=rand(-5.5,5.5);} if(side===1){x=8.2;z=rand(-5.5,5.5);} if(side===2){x=rand(-7.5,7.5);z=-6.2;} if(side===3){x=rand(-7.5,7.5);z=6.2;}
  const group=new THREE.Group();group.position.set(x,.35,z);scene.add(group);
  if(kind==='bottle'){const b=mesh(new THREE.CylinderGeometry(.13,.18,.7,12),mat(0xb33e35),0,0,0);b.rotation.z=Math.PI/2;group.add(b);}
  if(kind==='lobster'){const body=mesh(new THREE.SphereGeometry(.28,12,8),mat(0xd44d38),0,0,0);body.scale.set(1.5,.65,.7);group.add(body);for(const sx of [-1,1]){const claw=mesh(new THREE.SphereGeometry(.16,9,7),mat(0xe15a43),sx*.42,0,.05);claw.scale.set(.8,.5,1.2);group.add(claw);}}
  if(kind==='chair'){addBox(group,[.85,.12,.85],0xc8463b,[0,0,0]);addBox(group,[.85,.75,.1],0xc8463b,[0,.42,.34]);}
  if(kind==='boot'){const b=mesh(new THREE.BoxGeometry(.65,.35,.35),mat(0xc4413a),0,0,0);group.add(b);addBox(group,[.28,.65,.35],0xc4413a,[-.18,.3,0]);}
  const dir=player.position.clone().sub(group.position).setY(0).normalize();const speed=3.2+d.intensity*.16+rand(0,.8);
  group.userData={kind:'hazard',velocity:dir.multiplyScalar(speed),radius:kind==='chair'?.62:.45,spin:rand(-5,5)};
  hazards.push(group);dynamicObjects.push(group);
}
function spawnPickup(){
  const point=randomFloorPoint();
  const group=new THREE.Group();group.position.set(point.x,.45,point.z);scene.add(group);
  const bag=addBox(group,[.48,.62,.16],0x4a9cc4,[0,0,0]);bag.material.emissive=new THREE.Color(0x1d6480);bag.material.emissiveIntensity=1;
  const spr=makeTextSprite('🌧',{fontSize:60,bg:'rgba(0,0,0,0)',scale:[.5,.5]});spr.position.set(0,.75,0);group.add(spr);
  group.userData={kind:'pickup',life:9,phase:rand(0,10)};pickups.push(group);dynamicObjects.push(group);
}
function updateDodge(dt){
  const d=runtime.dodge;d.intensity=runtime.elapsed/12;d.nextHazard-=dt;d.nextPickup-=dt;runtime.score+=dt*(12+d.intensity*1.5);
  if(d.nextHazard<=0){spawnHazard();d.nextHazard=Math.max(.32,1.35-d.intensity*.07)*rand(.75,1.2);}
  if(d.nextPickup<=0){spawnPickup();d.nextPickup=rand(4.5,7);}
  for(const h of [...hazards]){
    h.position.addScaledVector(h.userData.velocity,dt);h.rotation.y+=h.userData.spin*dt;h.rotation.x+=h.userData.spin*.35*dt;
    if(horizontalDistance(h.position,player.position)<h.userData.radius+.35&&runtime.invincible<=0){
      if(d.shield>0){d.shield--;toast('Storm-chip shield absorbed it');}else{d.lives--;runtime.invincible=1.3;cameraShake=.55;audio.hit();toast(pick(['That chair had intent.','Clipped by local wildlife.','A completely avoidable collision.']));}
      removeHazard(h);
    } else if(Math.abs(h.position.x)>10||Math.abs(h.position.z)>8)removeHazard(h);
  }
  for(const p of [...pickups]){
    p.userData.life-=dt;p.rotation.y+=dt*2;p.position.y=.45+Math.sin(runtime.elapsed*4+p.userData.phase)*.12;
    if(horizontalDistance(p.position,player.position)<.72){d.chips++;runtime.score+=250;runtime.sessionCaps++;save.stats.chips++;if(save.stats.chips>=10)unlock('chips');persist();d.shield=Math.min(2,d.shield+1);burst(p.position,0x5fc8ee);removePickup(p);audio.good();toast('Storm chips acquired: tactical shielding active');}
    else if(p.userData.life<=0)removePickup(p);
  }
  save.stats.bestSurvival=Math.max(save.stats.bestSurvival,runtime.elapsed);if(runtime.elapsed>=60)unlock('chair');
  if(d.lives<=0)endGame('The chair finally won',`You stayed upright for ${formatTime(runtime.elapsed)} and secured ${d.chips} storm-chip bags.`, '🪑');
}
function removeHazard(h){const i=hazards.indexOf(h);if(i>=0)hazards.splice(i,1);removeObject(h);}
function removePickup(p){const i=pickups.indexOf(p);if(i>=0)pickups.splice(i,1);removeObject(p);}

function createMarker(pos,icon,title,colour){
  const g=new THREE.Group();g.position.set(pos[0],.08,pos[2]);scene.add(g);
  const ring=mesh(new THREE.TorusGeometry(.62,.09,10,30),new THREE.MeshStandardMaterial({color:colour,emissive:colour,emissiveIntensity:1.4}),0,.05,0);ring.rotation.x=Math.PI/2;g.add(ring);
  const beam=mesh(new THREE.CylinderGeometry(.06,.22,1.25,12,1,true),new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:.24,side:THREE.DoubleSide}),0,.68,0);g.add(beam);
  const spr=makeTextSprite(`${icon} ${title}`,{fontSize:34,bg:'rgba(5,25,30,.92)',scale:[2.2,.48]});spr.position.set(0,1.6,0);g.add(spr);
  g.userData={kind:'marker',radius:1.1,phase:rand(0,10)};return g;
}

function updateInteraction(dt){
  if(!runtime.running||runtime.paused||runtime.upgrading)return;
  let target=null,key=null,required=.5,title='',detail='',kicker='INTERACT';
  if(runtime.mode==='chaos'){
    const candidates=runtime.chaos.events.map(e=>({obj:e.marker,e})).sort((a,b)=>horizontalDistance(player.position,a.obj.position)-horizontalDistance(player.position,b.obj.position));
    if(candidates[0]){
      const c=candidates[0];target=c.obj;key=c.e.id;required=c.e.def.time/runtime.interactRate;title=c.e.def.title;detail=c.e.def.detail;kicker='CURRENT CRISIS';
      if(horizontalDistance(player.position,target.position)>1.35)target=null;
    }
  } else if(runtime.mode==='snacks'){
    const s=runtime.snacks; const nearStation=nearest(interactStations.filter(x=>x.visible),1.25);
    const nearGuest=nearest(guests.filter(g=>g.userData.order),1.15);
    if(nearGuest){target=nearGuest;key=`guest-${nearGuest.userData.name}`;required=.34;title=`Serve ${nearGuest.userData.name}`;detail=`Requested ${FOOD[nearGuest.userData.order.item].name}.`;kicker='DELIVERY';}
    else if(nearStation){target=nearStation;key=nearStation.userData.key;required=.24;title=`Pick up ${nearStation.userData.label}`;detail=s.carrying?'This replaces what you are carrying.':'Grab it and find the matching guest.';kicker='SNACK STATION';}
  }
  if(!target){
    currentInteractKey=null;interactProgress=0;UI.progress.style.width='0%';updatePassiveObjective();return;
  }
  setObjective(kicker,title,`${detail} Hold E / SPACE.`);
  if(currentInteractKey!==key){currentInteractKey=key;interactProgress=0;}
  if(input.interact){interactProgress+=dt;UI.progress.style.width=`${clamp(interactProgress/required*100,0,100)}%`;
    if(interactProgress>=required){
      if(runtime.mode==='chaos'){const e=runtime.chaos.events.find(x=>x.id===key);if(e)removeChaosEvent(e,true);}
      if(runtime.mode==='snacks'){
        if(target.userData.kind==='station'){runtime.snacks.carrying=target.userData.item;audio.click();toast(`Carrying ${FOOD[target.userData.item].name}`);}
        else deliverOrder(target);
      }
      interactProgress=0;currentInteractKey=null;input.interact=false;UI.progress.style.width='0%';
    }
  } else {interactProgress=Math.max(0,interactProgress-dt*1.8);UI.progress.style.width=`${clamp(interactProgress/required*100,0,100)}%`;}
}
function nearest(list,maxDist){let best=null,bestD=maxDist;for(const o of list){const d=horizontalDistance(player.position,o.position);if(d<bestD){best=o;bestD=d;}}return best;}
function updatePassiveObjective(){
  if(runtime.mode==='chaos'){
    const c=runtime.chaos;if(!c.events.length)setObjective('HOUSE CHECK','Everything is suspiciously fine',`Wave ${c.wave} · next crisis incoming`);
    else {const e=[...c.events].sort((a,b)=>a.ttl-b.ttl)[0];setObjective('GET CLOSER',e.def.title,e.def.detail);}
  }
  if(runtime.mode==='snacks'){
    const s=runtime.snacks;if(s.carrying){const g=guests.find(g=>g.userData.order?.item===s.carrying);setObjective('DELIVER IT',g?`${g.userData.name} wants ${FOOD[s.carrying].name}`:'Hold that thought',g?'Find the matching icon over their head.':'A matching order should arrive soon.');}
    else setObjective('READ THE ROOM','Find a guest asking for food','Then collect it from the matching station.');
  }
  if(runtime.mode==='fiddle')setObjective('CHASE THE TUNE',runtime.fiddle.streak?`${runtime.fiddle.streak}-note streak`:'Collect a glowing note','Closer to the beat means more points.');
  if(runtime.mode==='dodge')setObjective('STAY UPRIGHT',runtime.dodge.shield?`Storm-chip shield ×${runtime.dodge.shield}`:'Dodge anything glowing red','Collect blue storm-chip bags for protection.');
}
function setObjective(kicker,title,detail){UI.objectiveKicker.textContent=kicker;UI.objectiveTitle.textContent=title;UI.objectiveDetail.textContent=detail;}

function updatePlayer(dt){
  runtime.dashCooldown=Math.max(0,runtime.dashCooldown-dt);runtime.dashTimer=Math.max(0,runtime.dashTimer-dt);runtime.invincible=Math.max(0,runtime.invincible-dt);
  const x=(input.keys.has('KeyD')||input.keys.has('ArrowRight')?1:0)-(input.keys.has('KeyA')||input.keys.has('ArrowLeft')?1:0)+input.joyX;
  const z=(input.keys.has('KeyS')||input.keys.has('ArrowDown')?1:0)-(input.keys.has('KeyW')||input.keys.has('ArrowUp')?1:0)+input.joyY;
  // Map directions to the camera, so right really moves right on screen.
  const forward=camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  const right=new THREE.Vector3(-forward.z,0,forward.x);
  const dir=right.multiplyScalar(x).addScaledVector(forward,-z);if(dir.lengthSq()>1)dir.normalize();
  if(input.dashQueued&&runtime.dashCooldown<=0&&dir.lengthSq()>.02){runtime.dashTimer=.18;runtime.dashCooldown=1.15;cameraShake=.18;audio.dash();}input.dashQueued=false;
  const speed=runtime.speed*(runtime.dashTimer>0?2.35:1);
  const old=player.position.clone();
  player.position.x=clamp(old.x+dir.x*speed*dt,-7.65,7.65);
  if(collidesObstacle(player.position))player.position.x=old.x;
  player.position.z=clamp(old.z+dir.z*speed*dt,-5.7,5.7);
  if(collidesObstacle(player.position))player.position.z=old.z;
  const moving=dir.lengthSq()>.02;player.userData.moving=moving;
  if(moving){player.userData.facing.lerp(dir,.24).normalize();player.rotation.y=Math.atan2(player.userData.facing.x,player.userData.facing.z);}
  const bounce=moving?Math.sin(runtime.elapsed*13)*.055:Math.sin(runtime.elapsed*2)*.012;player.position.y=bounce;
  player.userData.leftArm.rotation.z=-.2+(moving?Math.sin(runtime.elapsed*13)*.5:0);player.userData.rightArm.rotation.z=.2-(moving?Math.sin(runtime.elapsed*13)*.5:0);
  player.visible=runtime.invincible<=0||Math.floor(runtime.invincible*12)%2===0;
}
function collidesObstacle(pos){
  // The central table is solid; everything else stays forgiving for casual play.
  return staticObstacles.some(o=>pos.x>o.minX-.3&&pos.x<o.maxX+.3&&pos.z>o.minZ-.3&&pos.z<o.maxZ+.3);
}

function updateGuests(dt){
  guests.forEach((g,i)=>{
    const p=g.userData.phase;const energetic=runtime.mode==='fiddle'?1.7:runtime.running?1:0.55;
    g.position.y=Math.abs(Math.sin(runtime.elapsed*(2.4+i*.03)+p))*.06*energetic;
    g.rotation.y+=Math.sin(runtime.elapsed*.6+p)*dt*.08;
    const parts=g.userData.parts;parts.armL.rotation.z=-.3+Math.sin(runtime.elapsed*3.1+p)*.34*energetic;parts.armR.rotation.z=.3-Math.sin(runtime.elapsed*3.1+p)*.34*energetic;
    if(g.userData.orderSprite){g.userData.orderSprite.material.opacity=.9+Math.sin(runtime.elapsed*5+p)*.1;}
  });
}
function updateAmbient(dt){
  ambientParticles.forEach(p=>{
    if(p.kind==='rain'){p.mesh.position.y-=dt*p.speed;if(p.mesh.position.y<-1)p.mesh.position.y=1;}
    if(p.kind==='bulb')p.mesh.material.emissiveIntensity=1.6+Math.sin(runtime.elapsed*2+p.phase)*.7;
    if(p.kind==='dust'){p.mesh.position.y+=dt*p.speed*.15;p.mesh.position.x+=Math.sin(runtime.elapsed*.3+p.phase)*dt*.02;if(p.mesh.position.y>4.8)p.mesh.position.y=.1;}
  });
  danceLight.intensity=8+Math.sin(runtime.elapsed*2.2)*2+(runtime.mode==='fiddle'&&runtime.running?6:0);
}
function updateCamera(dt){
  const menuOrbit=!runtime.running&&!runtime.ended;
  if(menuOrbit){const a=visualTime*.055;camera.position.set(Math.cos(a)*14,10.5,Math.sin(a)*14);camera.lookAt(0,.5,0);return;}
  const desired=new THREE.Vector3(player.position.x+8.4,9.4,player.position.z+10.2);
  camera.position.lerp(desired,1-Math.pow(.001,dt));
  let sx=0,sy=0,sz=0;if(cameraShake>0&&save.settings.shake&&!save.settings.reducedMotion){sx=rand(-cameraShake,cameraShake);sy=rand(-cameraShake*.4,cameraShake*.4);sz=rand(-cameraShake,cameraShake);cameraShake=Math.max(0,cameraShake-dt*2.3);}
  camera.position.add(new THREE.Vector3(sx,sy,sz));camera.lookAt(player.position.x, .45, player.position.z-.25);
}

function updateHUD(){
  UI.score.textContent=formatScore(runtime.score);UI.multiplier.textContent=`×${runtime.multiplier.toFixed(runtime.multiplier%1?1:0)}`;
  if(runtime.mode==='chaos'&&runtime.chaos){
    const c=runtime.chaos;setMeter('vibe',c.vibe);setMeter('snacks',c.snacks);setMeter('mess',100-c.mess);setMeter('neighbour',c.neighbour);$('wave-value').textContent=c.wave;
    UI.eventStack.innerHTML=c.events.slice().sort((a,b)=>a.ttl-b.ttl).map(e=>`<div class="event-chip"><b>${e.def.icon} ${e.def.title}</b>${Math.ceil(e.ttl)} sec<i style="--life:${clamp(e.ttl/e.maxTtl*100,0,100)}%"></i></div>`).join('');
  }
  if(runtime.mode==='snacks'&&runtime.snacks){const s=runtime.snacks;$('snack-time').textContent=formatTime(s.time);$('orders-done').textContent=s.ordersDone;$('snack-lives').textContent='♥ '.repeat(s.lives).trim()||'—';$('carrying').textContent=s.carrying?`${FOOD[s.carrying].icon} ${FOOD[s.carrying].name}`:'NOTHING';UI.eventStack.innerHTML='';}
  if(runtime.mode==='fiddle'&&runtime.fiddle){const f=runtime.fiddle;$('fiddle-time').textContent=formatTime(f.time);$('fiddle-streak').textContent=f.streak;$('energy-bar').style.width=`${clamp(f.energy,0,100)}%`;UI.eventStack.innerHTML='';}
  if(runtime.mode==='dodge'&&runtime.dodge){const d=runtime.dodge;$('dodge-time').textContent=formatTime(runtime.elapsed);$('dodge-lives').textContent='♥ '.repeat(d.lives).trim()||'—';$('chips-count').textContent=d.chips;$('danger-level').textContent=d.intensity<2?'POLITE':d.intensity<4?'ROWDY':d.intensity<6?'OUTTA HAND':d.intensity<9?'MUNICIPAL':'LEGENDARY';UI.eventStack.innerHTML='';}
}
function setMeter(id,val){$(id+'-bar').style.width=`${clamp(val,0,100)}%`;$(id+'-value').textContent=Math.round(val);const bar=$(id+'-bar');bar.style.background=val<25?'#ef5b4c':val<50?'#ffc857':'#6fe6c2';}

function endGame(title,summary,icon){
  if(runtime.ended)return;resetInput();runtime.ended=true;runtime.running=false;input.interact=false;
  clearTimeout(window.__toastTimer);const mode=runtime.mode;const oldBest=save.highs[mode]||0;const score=Math.floor(runtime.score);const isBest=score>oldBest;
  if(isBest)save.highs[mode]=score;
  let caps=Math.max(1,Math.floor(score/850))+runtime.sessionCaps;if(isBest)caps+=3;save.caps+=caps;persist();updateMenu();
  $('end-icon').textContent=icon;$('end-title').textContent=title;$('end-summary').textContent=summary;$('final-score').textContent=formatScore(score);$('caps-earned').textContent=caps;$('new-best').classList.toggle('hidden',!isBest);
  UI.end.classList.add('active');UI.touch.classList.add('hidden');audio.good();
}

function burst(position,colour){
  if(save.settings.reducedMotion)return;
  const origin=position.clone();
  for(let i=0;i<10;i++){
    const p=mesh(new THREE.SphereGeometry(.045,5,4),new THREE.MeshBasicMaterial({color:colour}),origin.x,origin.y+.6,origin.z);scene.add(p);
    p.userData={kind:'particle',life:.7,velocity:new THREE.Vector3(rand(-1.8,1.8),rand(.6,2.2),rand(-1.8,1.8))};dynamicObjects.push(p);
  }
}
function updateParticles(dt){
  for(const o of [...dynamicObjects])if(o.userData?.kind==='particle'){
    o.userData.life-=dt;o.userData.velocity.y-=dt*3;o.position.addScaledVector(o.userData.velocity,dt);o.scale.setScalar(Math.max(0,o.userData.life/.7));if(o.userData.life<=0)removeObject(o);
  }
}

function clearDynamic(){
  guests.forEach(clearGuestOrder);
  for(const o of [...dynamicObjects])removeObject(o);
  dynamicObjects=[];markers=[];hazards=[];notes=[];pickups=[];currentInteractKey=null;interactProgress=0;UI.progress.style.width='0%';
  if(runtime.chaos)runtime.chaos.events=[];
}
function removeObject(o){
  if(!o)return; if(o.parent)o.parent.remove(o);disposeObject(o);const i=dynamicObjects.indexOf(o);if(i>=0)dynamicObjects.splice(i,1);
}
function disposeObject(o){
  o.traverse?.(child=>{if(child.userData?.dispose)child.userData.dispose();if(child.geometry)child.geometry.dispose();if(child.material){const mats=Array.isArray(child.material)?child.material:[child.material];mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});
}
function horizontalDistance(a,b){const dx=a.x-b.x,dz=a.z-b.z;return Math.hypot(dx,dz);}
function randomFloorPoint(){
  for(let i=0;i<30;i++){const p=new THREE.Vector3(rand(-7,7),0,rand(-5,5));if(!collidesObstacle(p))return p;}
  return new THREE.Vector3(5,0,-4);
}
function toast(msg){UI.toast.textContent=msg;UI.toast.classList.add('show');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>UI.toast.classList.remove('show'),1700);}
function onResize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(getPixelRatio());renderer.setSize(innerWidth,innerHeight);}

function animate(){
  requestAnimationFrame(animate);
  const raw=clock.getDelta(),dt=Math.min(raw,.05);visualTime+=dt;
  const active=runtime.running&&!runtime.paused&&!runtime.upgrading;
  updateAmbient(dt);updateGuests(dt);
  if(active){
    runtime.elapsed+=dt;hudClock+=dt;
    updatePlayer(dt);updateInteraction(dt);audio.update(dt);
    if(runtime.mode==='chaos')updateChaos(dt);
    if(runtime.mode==='snacks')updateSnacks(dt);
    if(runtime.mode==='fiddle')updateFiddle(dt);
    if(runtime.mode==='dodge')updateDodge(dt);
    updateParticles(dt);
    if(hudClock>=.075){hudClock=0;updateHUD();}
  }
  updateCamera(dt);renderer.render(scene,camera);
}

init();
