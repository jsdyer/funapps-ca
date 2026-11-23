import { LENGTH, MAX_SPEED, STOPS, clamp, curveAt, hillAt, createGame, nextStop, nearbyStop, canPhotograph, takePhoto, continueTour, recover, score, step } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('road'), ctx = canvas.getContext('2d');
canvas.tabIndex = 0;
let game = createGame(), lastTime = 0, lastUI = 0, lastToast = '', toastUntil = 0;
const inputs = { left: false, right: false, brake: false, accelerate: false };
const keyMap = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowDown: 'brake', s: 'brake', ArrowUp: 'accelerate', w: 'accelerate' };
const heldKeys = new Set(), heldPointers = new Map();
let best = 0;
try { best = Number(localStorage.getItem('funapps-cabot-best') || 0); } catch {}
function bestText() { $('best-score').textContent = best ? `Your best tour: ${best.toLocaleString()} points, saved on this device.` : 'Your best tour will be saved on this device.'; }
bestText();

function miniature(index, wide = false) {
  const colours = [['#bcdedb','#5c9a9b','#567b62','#ddba7a'],['#d3dfce','#72a5a3','#547963','#d88b66'],['#dbc7aa','#6d9ca0','#486c5e','#bf8b5b'],['#ded7c2','#8cacaa','#587967','#b98370']][index];
  return `<svg viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><rect width="240" height="130" fill="${colours[0]}"/><circle cx="188" cy="32" r="17" fill="#f7e4ba"/><path d="M0 58Q32 26 64 55T130 57L170 96H0" fill="${colours[2]}" opacity=".6"/><path d="M0 78Q38 43 90 82L150 109H0" fill="${colours[2]}"/><path d="M94 77Q158 64 240 75V130H0V109Z" fill="${colours[1]}"/><path d="M0 100Q49 80 86 100T166 130H0" fill="${colours[2]}"/><path d="M0 113Q49 90 83 111T123 130" fill="none" stroke="#dfc899" stroke-width="5"/>${index === 1 || index === 3 ? '<path d="M120 90v-20h16v20Z" fill="#f0e4c8"/><path d="M116 71l12-11 12 11Z" fill="#b9674d"/><path d="M144 97V81h13v16Z" fill="#f0e4c8"/><path d="M141 82l10-9 10 9Z" fill="#a15a43"/>' : '<path d="M32 95V75m-8 10 8-20 9 20m-6 11V79m-7 9 7-17 8 17" stroke="#284e44" stroke-width="3" fill="#284e44"/>'}<path d="M173 92h30m-55 13h24m32-17h19" stroke="#eaf1dd" stroke-width="1" opacity=".5"/></svg>`;
}

function renderAlbum() {
  $('album').innerHTML = STOPS.map((stop, i) => {
    const taken = game.photos.includes(stop.id), missed = game.z > stop.z + 260 && !taken;
    return `<li class="${taken ? 'taken' : missed ? 'missed' : ''}"><div class="album-thumb">${taken ? miniature(i) : String(i + 1).padStart(2, '0')}</div><div class="album-copy"><strong>${stop.name}</strong><small>${taken ? 'Postcard collected ✓' : missed ? 'For your next trip' : stop.subtitle}</small></div></li>`;
  }).join('');
  $('photo-count').textContent = game.photos.length;
}
renderAlbum();

function clearInput() {
  heldKeys.clear(); heldPointers.clear();
  for (const k in inputs) inputs[k] = false;
  document.querySelectorAll('[data-control]').forEach(b => b.dataset.active = 'false');
}
function syncInput() {
  for (const k in inputs) inputs[k] = [...heldKeys].some(key => keyMap[key] === k) || [...heldPointers.values()].includes(k);
  document.querySelectorAll('[data-control]').forEach(b => b.dataset.active = String(inputs[b.dataset.control]));
}
function announce(text, seconds = 3) { lastToast = text; toastUntil = performance.now() + seconds * 1000; $('toast').textContent = text; $('toast').classList.add('visible'); }
function hideOverlay() { $('overlay').hidden = true; canvas.focus({ preventScroll: true }); }
function showCard(html) { clearInput(); $('overlay').innerHTML = `<div class="start-card result-card">${html}</div>`; $('overlay').hidden = false; $('overlay').querySelector('button')?.focus({ preventScroll: true }); }
function newTour() { game = createGame(); game.status = 'driving'; clearInput(); hideOverlay(); renderAlbum(); $('pause').disabled = false; $('pause').innerHTML = 'Pause <kbd>P</kbd>'; announce('Cruise is on. Steer gently; brake before a bend.', 5); }
$('start').addEventListener('click', newTour);

function pause() {
  if (game.status !== 'driving') return;
  game.status = 'paused';
  showCard('<span class="stamp">PULL OVER FOR A MOMENT</span><h2>The coast<br>can wait.</h2><p>Your tour is paused. Daylight and comfort are safely on hold.</p><button class="primary" id="resume">Back to the road</button><button class="primary secondary" id="restart">Start a fresh tour</button>');
  $('resume').onclick = resume;
  $('restart').onclick = newTour;
}
function resume() { if (game.status !== 'paused') return; game.status = 'driving'; hideOverlay(); clearInput(); }
$('pause').onclick = pause;

function photograph() {
  const stop = takePhoto(game);
  if (!stop) return;
  const i = STOPS.findIndex(s => s.id === stop.id);
  renderAlbum();
  showCard(`<span class="stamp">POSTCARD ${String(game.photos.length).padStart(2, '0')} / 04</span><div class="postcard-image">${miniature(i, true)}</div><h2>${stop.name}</h2><p class="trip-note">${stop.note}</p><p>Photo tucked into your album. A little break restores ride comfort.</p><button class="primary" id="continue">Continue the coastal tour</button>`);
  $('continue').onclick = () => { continueTour(game); hideOverlay(); clearInput(); announce('Back on the road. Your next view is waiting.'); };
}
$('camera').onclick = photograph;

function finish() {
  clearInput(); $('pause').disabled = true;
  if (game.status === 'won') {
    const points = score(game);
    if (points > best) { best = points; try { localStorage.setItem('funapps-cabot-best', String(best)); } catch {} bestText(); }
    showCard(`<span class="stamp">THE LONG WAY WAS THE RIGHT WAY</span><h2>${game.photos.length === 4 ? 'An album<br>full of coast.' : 'Home with<br>a story.'}</h2><p>${game.photos.length === 4 ? 'All four postcards, one beautiful loop. That was a proper scenic drive.' : 'You made the coastal loop. There are still a few lookoffs to discover on your next trip.'}</p><div class="result-grid"><div><strong>${game.photos.length}/4</strong><span>POSTCARDS</span></div><div><strong>${Math.round(game.comfort)}%</strong><span>COMFORT</span></div><div><strong>${points.toLocaleString()}</strong><span>POINTS</span></div></div>${game.recovery ? '<p class="small-note">Tour completed with a checkpoint recovery.</p>' : ''}<button class="primary" id="again">Take the long way again</button>`);
    $('again').onclick = newTour;
  } else {
    showCard(`<span class="stamp">TIME FOR A BREATHER</span><h2>${game.daylight <= 0 ? 'The sun<br>has called it.' : 'A rather<br>bumpy ride.'}</h2><p>${game.daylight <= 0 ? 'You ran out of daylight. Try the next stretch again with a fresh start.' : 'The roadside was a little too rough. Brake before bends and make small steering adjustments.'}</p><p>Your ${game.photos.length} collected postcard${game.photos.length === 1 ? '' : 's'} will stay in the album.</p><button class="primary" id="recover">Retry from the last photo stop</button><button class="primary secondary" id="again">Start a fresh tour</button>`);
    $('recover').onclick = () => { recover(game); hideOverlay(); clearInput(); $('pause').disabled = false; announce('Fresh daylight. Fresh comfort. Enjoy this stretch.'); };
    $('again').onclick = newTour;
  }
  renderAlbum();
}

document.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.target.closest('input,select,textarea,a,summary') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (keyMap[k] && game.status === 'driving') { e.preventDefault(); heldKeys.add(k); syncInput(); }
  if (e.repeat) return;
  if (k === 'p' || k === 'Escape') { e.preventDefault(); game.status === 'paused' ? resume() : pause(); }
  if (k === ' ' && game.status === 'driving') { e.preventDefault(); photograph(); }
});
document.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; heldKeys.delete(k); syncInput(); });
document.querySelectorAll('[data-control]').forEach(b => {
  b.addEventListener('pointerdown', e => { if (game.status !== 'driving') return; e.preventDefault(); b.setPointerCapture(e.pointerId); heldPointers.set(e.pointerId, b.dataset.control); syncInput(); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, e => { heldPointers.delete(e.pointerId); syncInput(); });
  b.addEventListener('contextmenu', e => e.preventDefault());
});
window.addEventListener('blur', () => { clearInput(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); } });

function polygon(points, colour) { ctx.fillStyle = colour; ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
function line(x1, y1, x2, y2, colour, width = 1) { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function rounded(x, y, w, h, r, colour) { ctx.fillStyle = colour; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

function tree(x, y, s, type = 0) {
  if (s < .025) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#6d6550'; ctx.fillRect(-3, -47, 6, 47);
  if (type) {
    const c = type % 3 === 0 ? '#b78a51' : type % 3 === 1 ? '#c6a663' : '#587d57';
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -51, 24, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-17, -39, 17, 0, Math.PI * 2); ctx.fill();
  } else {
    polygon([[-22,-10],[0,-75],[22,-10]],'#375f4b'); polygon([[-19,-27],[0,-85],[19,-27]],'#426c53'); polygon([[-14,-46],[0,-94],[14,-46]],'#51795a');
  }
  ctx.restore();
}

function drawBackground(w, h, horizon) {
  const dusk = clamp((330 - game.daylight - 230) / 100, 0, 1);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon + 80);
  sky.addColorStop(0, dusk > .4 ? '#d0c4b0' : '#a7cdcd'); sky.addColorStop(1, '#e7e4c5');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const sway = curveAt(game.z) * 35 + game.x * 8;
  ctx.fillStyle = '#f4e7bc'; ctx.beginPath(); ctx.arc(w * .76 - sway, h * .15, 31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0eed8';
  for (let i = 0; i < 3; i++) { const x = ((i * 330 + 110 - game.z * .008) % (w + 220)) - 70; ctx.beginPath(); ctx.ellipse(x, 67 + i * 22, 65, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#7ba7a3'; ctx.fillRect(0, horizon - 5, w, h);
  for (let i = 0; i < 12; i++) { const y = horizon + i * 13; line(w * .55 + Math.sin(i * 2.3) * 150, y, w, y, '#b7d1bf44', 2); }
  polygon([[0,horizon+55],[0,horizon-55],[w*.1-sway,horizon-135],[w*.2-sway,horizon-70],[w*.32-sway,horizon-109],[w*.47-sway,horizon-30],[w*.64-sway,horizon+50]], '#91ae9a');
  polygon([[0,horizon+90],[0,horizon-24],[w*.12-sway,horizon-86],[w*.24-sway,horizon-48],[w*.32-sway,horizon-68],[w*.47-sway,horizon+38],[w*.66-sway,horizon+95]], '#749980');
  polygon([[0,horizon+160],[0,horizon+15],[w*.14-sway,horizon-32],[w*.23-sway,horizon+2],[w*.37-sway,horizon+15],[w*.55-sway,horizon+108],[w*.8,horizon+170]], '#5e8769');
  for (let i = 0; i < 6; i++) { const x = 25 + i * 39 - sway; tree(x,horizon + 30 + Math.sin(i)*18,.45+(i%2)*.1); }
}

function drawRoad(w, h) {
  const horizon = h * .37;
  drawBackground(w, h, horizon);
  const SEG = 40, roadHalf = 170, cameraY = 112, depth = .9, count = 105;
  const baseZ = Math.floor(game.z / SEG) * SEG;
  const points = [];
  let x = 0, dx = 0;
  for (let i = 0; i <= count; i++) {
    const z = baseZ + i * SEG, distance = z - game.z;
    x += dx; dx += curveAt(z) * 1.05;
    if (distance < 35) continue;
    const scale = depth / distance;
    points.push({ z, scale, x: w / 2 + (x - game.x * roadHalf) * scale * w / 2, y: horizon + (cameraY + hillAt(game.z) - hillAt(z)) * scale * h, rw: scale * roadHalf * w / 2, i: Math.floor(z / SEG) });
  }
  for (let i = points.length - 2; i >= 0; i--) {
    const a = points[i], b = points[i + 1];
    if (a.y < 0 || b.y > h + 200 || a.y < b.y) continue;
    const alt = Math.floor(a.i / 3) % 2;
    const terrain = alt ? '#879a68' : '#8c9e6e';
    polygon([[0,a.y],[0,b.y],[w,b.y],[w,a.y]], terrain);
    // Coast drops away on the right side, so the water remains part of the drive.
    polygon([[b.x+b.rw*2.7,b.y],[w,b.y],[w,a.y],[a.x+a.rw*2.7,a.y]], alt ? '#75a09a' : '#79a49d');
    polygon([[a.x-a.rw*1.17,a.y],[b.x-b.rw*1.17,b.y],[b.x+b.rw*1.17,b.y],[a.x+a.rw*1.17,a.y]], alt ? '#bcba95' : '#c4c09b');
    polygon([[a.x-a.rw,a.y],[b.x-b.rw,b.y],[b.x+b.rw,b.y],[a.x+a.rw,a.y]], alt ? '#616c65' : '#657068');
    for (const side of [-1,1]) polygon([[a.x+side*a.rw*.94-a.rw*.012,a.y],[b.x+side*b.rw*.94-b.rw*.012,b.y],[b.x+side*b.rw*.94+b.rw*.012,b.y],[a.x+side*a.rw*.94+a.rw*.012,a.y]], '#e8e2c0');
    if (Math.floor(a.i/3)%2 === 0) polygon([[a.x-a.rw*.012,a.y],[b.x-b.rw*.012,b.y],[b.x+b.rw*.012,b.y],[a.x+a.rw*.012,a.y]], '#d1b974');
    const stop = STOPS.find(s => Math.abs(s.z - a.z) < 250);
    if (stop) {
      polygon([[a.x+a.rw*.99,a.y],[b.x+b.rw*.99,b.y],[b.x+b.rw*1.65,b.y],[a.x+a.rw*1.65,a.y]], '#b9b28f');
      if (a.i % 6 === 0) line(a.x+a.rw*1.12,a.y,a.x+a.rw*1.5,a.y,'#e9dfb9',Math.max(1,a.rw*.018));
    }
    if (a.i % 3 === 0) { tree(a.x-a.rw*(1.7+(a.i%7)*.14),a.y,a.scale*w*.36,a.i%4); }
    if (a.i % 9 === 0 && !stop) tree(a.x+a.rw*1.9,a.y,a.scale*w*.24,a.i%3);
    if (a.i % 4 === 0) {
      for (const side of [-1,1]) { const sx=a.x+side*a.rw*1.2, sy=a.y, sh=Math.min(26,a.rw*.1); line(sx,sy,sx,sy-sh,'#e4dfc1',Math.max(1,a.rw*.009)); }
    }
  }
  const steer = Number(inputs.right)-Number(inputs.left);
  drawCar(w / 2, h * .86, w / 960, steer);
  const vignette = ctx.createLinearGradient(0,h*.8,0,h); vignette.addColorStop(0,'#173b3700'); vignette.addColorStop(1,'#173b3733'); ctx.fillStyle=vignette;ctx.fillRect(0,h*.8,w,h*.2);
}

function drawCar(x, y, scale, steer) {
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale); ctx.rotate(steer*.026);
  ctx.fillStyle='#183b3740'; ctx.beginPath();ctx.ellipse(0,27,76,17,0,0,Math.PI*2);ctx.fill();
  rounded(-65,-13,18,48,5,'#263c37');rounded(47,-13,18,48,5,'#263c37');
  polygon([[-63,20],[-59,-13],[-41,-58],[38,-58],[59,-13],[63,20]],'#b96148');
  rounded(-61,-12,122,41,10,'#d9835a');
  polygon([[-37,-51],[34,-51],[46,-17],[-47,-17]],'#476861');
  polygon([[-32,-48],[-5,-48],[-5,-20],[-42,-20]],'#9bb8a0');
  polygon([[0,-48],[30,-48],[39,-20],[0,-20]],'#88a994');
  line(-39,-58,36,-58,'#e6ad75',3);line(-55,2,55,2,'#b25e43',2);
  rounded(-53,5,23,7,2,'#e9b477');rounded(30,5,23,7,2,'#e9b477');rounded(-16,13,32,10,2,'#ece1bc');
  ctx.fillStyle='#5c7161';ctx.font='6px system-ui';ctx.textAlign='center';ctx.fillText('CABOT',0,20);
  rounded(-55,26,110,6,2,'#d1c7a6');
  if(inputs.brake){rounded(-53,5,23,7,2,'#f6d271');rounded(30,5,23,7,2,'#f6d271');}
  ctx.restore();
}

function updateUI() {
  $('speed').textContent = Math.round(game.speed * 1.6);
  $('comfort').value = game.comfort; $('comfort-label').textContent = `${Math.round(game.comfort)}%`;
  const time = Math.max(0,Math.ceil(game.daylight)); $('daylight').textContent = `${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`;
  const percent = Math.round(game.z/LENGTH*100); $('progress-label').textContent = `${percent}%`; $('progress').style.width=`${percent}%`;
  const stop = nextStop(game), near=nearbyStop(game), ready=canPhotograph(game);
  $('camera').disabled=!ready;
  $('camera-label').textContent=ready?'Take the postcard':near?(game.speed>22?'Slow below 35':'Pull right to park'):'Photo stop ahead';
  $('road-sign').hidden = !stop || stop.z-game.z>700 || game.status!=='driving';
  if(stop){$('sign-name').textContent=stop.name;$('sign-distance').textContent=near?'SLOW DOWN · KEEP RIGHT':`LOOKOFF IN ${Math.ceil((stop.z-game.z)/10)*10} m`;}
  $('leg-name').textContent=game.status==='intro'?'YOUR COASTAL ESCAPE':stop?`NEXT STOP · ${stop.name.toUpperCase()}`:'THE HOME STRETCH';
  if(game.status==='driving'&&Math.abs(game.x)>1.02&&lastToast!=='Rough shoulder — ease back onto the road.') announce('Rough shoulder — ease back onto the road.',2);
  if(performance.now()>toastUntil){$('toast').classList.remove('visible');lastToast='';}
  renderAlbum();
}
function frame(time) {
  const dt = lastTime ? Math.min(.05,(time-lastTime)/1000) : 0;lastTime=time;
  const previous=game.status;step(game,inputs,dt);
  if(previous==='driving'&&(game.status==='won'||game.status==='lost'))finish();
  drawRoad(canvas.width,canvas.height);
  if(time-lastUI>100){updateUI();lastUI=time;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
