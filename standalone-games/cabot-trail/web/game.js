import{newDrive,startDrive,pauseDrive,resumeDrive,driveStep,TOUR_SECONDS,PLACES}from'./arcade-engine.js';
import{clamp,curveAt,hillAt,STOPS}from'./engine.js';
const $=id=>document.getElementById(id),canvas=$('road'),ctx=canvas.getContext('2d');
let state=newDrive(),demo=startDrive(),game=demo,lastTime=0,lastHUD=0,down=false;
const inputs={left:false,right:false,brake:false,target:null},keys=new Set(),pointers=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let best=0;try{best=Number(localStorage.getItem('cabot-quick-best'))||0;}catch{}if(best)$('best').textContent=`Best cruise: ${best} points`;
function clear(){keys.clear();pointers.clear();inputs.left=inputs.right=inputs.brake=false;inputs.target=null;down=false;}
function sync(){for(const kind of ['left','right','brake'])inputs[kind]=[...keys].some(k=>({ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowDown:'brake',s:'brake'})[k]===kind)||[...pointers.values()].includes(kind);}
function start(){state=startDrive();clear();$('card').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';$('hint').hidden=false;canvas.focus({preventScroll:true});updateHUD();}
function resume(){resumeDrive(state);clear();$('card').hidden=true;$('pause').textContent='Pause';lastTime=0;}
function pause(){if(state.status!=='driving')return;pauseDrive(state);clear();$('kicker').textContent='PULLED OVER';$('title').textContent='The coast can wait.';$('copy').textContent='Your drive is paused.';$('start').textContent='Resume';$('best').textContent='';$('card').hidden=false;$('pause').textContent='Resume';}
function finish(){clear();best=Math.max(best,state.score);try{localStorage.setItem('cabot-quick-best',String(best));}catch{}$('kicker').textContent='COASTAL LOOP COMPLETE';$('title').textContent=state.photos>=10?'An album full of coast.':'Home with a story.';$('copy').textContent=`${state.photos} postcards · ${state.bumps} bumps · ${state.score} points`;$('start').textContent='Drive again';$('best').textContent=`Best cruise: ${best} points`;$('card').hidden=false;$('pause').disabled=true;$('hint').hidden=true;}
$('start').onclick=()=>state.status==='paused'?resume():start();$('pause').onclick=()=>state.status==='paused'?resume():pause();
for(const direction of ['left','right','brake']){const b=$(direction);b.onpointerdown=e=>{e.preventDefault();if(state.status==='ready'||state.status==='finished')start();if(state.status!=='driving')return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,direction);inputs.target=null;sync();};for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{pointers.delete(e.pointerId);sync();});b.addEventListener('click',e=>{if(e.detail===0&&direction!=='brake'){if(state.status==='ready'||state.status==='finished')start();if(state.status==='driving')inputs.target=clamp(state.x+(direction==='left'?-.65:.65),-1,1);}});}
$('brake').addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();if(state.status==='driving'){keys.add('ArrowDown');sync();}}});$('brake').addEventListener('keyup',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();keys.delete('ArrowDown');sync();}});
function aim(e){const rect=canvas.getBoundingClientRect();inputs.target=clamp(((e.clientX-rect.left)/rect.width-.5)*2.3,-1,1);}
canvas.onpointerdown=e=>{if(state.status==='ready'||state.status==='finished')start();if(state.status!=='driving')return;down=true;canvas.setPointerCapture(e.pointerId);aim(e);};canvas.onpointermove=e=>{if(down&&state.status==='driving')aim(e);};for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>down=false);
window.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('a,summary,details'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowLeft','ArrowRight','ArrowDown','a','d','s'].includes(k)){e.preventDefault();if(state.status==='ready')start();if(state.status==='driving'){keys.add(k);inputs.target=null;sync();}}if((k==='p'||k==='Escape')&&!e.repeat){e.preventDefault();state.status==='paused'?resume():pause();}if(e.code==='Space'&&!e.repeat&&!e.target.closest('button')){e.preventDefault();state.status==='driving'?pause():state.status==='paused'?resume():start();}});window.addEventListener('keyup',e=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);sync();});window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function updateHUD(){$('photos').textContent=state.photos;$('bumps').textContent=state.bumps;$('time').textContent=Math.ceil(TOUR_SECONDS-state.elapsed);const cue=state.eventTime>0?state.event:'';if($('cue').textContent!==cue)$('cue').textContent=cue;$('place').textContent=PLACES[Math.min(3,Math.floor(game.elapsed/(TOUR_SECONDS/4)))].toUpperCase()+' · CAPE BRETON';}
function drawTokens(w,h){for(const o of game.objects){if(o.taken&&o.kind==='photo')continue;const p=Math.max(.08,o.y*o.y),x=w/2+(o.x-game.x)*w*.37*p,y=h*.37+h*.49*p,r=Math.max(8,Math.min(39,w*.048)*Math.sqrt(p));if(o.kind==='photo'){ctx.fillStyle='#ffe17844';ctx.beginPath();ctx.arc(x,y,r*1.4,0,Math.PI*2);ctx.fill();rounded(x-r,y-r*.7,r*2,r*1.4,Math.max(3,r*.13),'#ffe273');rounded(x-r*.83,y-r*.54,r*1.65,r,Math.max(2,r*.08),'#f9fff1');polygon([[x-r*.68,y+r*.26],[x-r*.28,y-r*.3],[x+r*.1,y+r*.26]],'#3e9186');polygon([[x-r*.1,y+r*.26],[x+r*.26,y-r*.15],[x+r*.66,y+r*.26]],'#74ac77');ctx.fillStyle='#f5b752';ctx.beginPath();ctx.arc(x+r*.43,y-r*.3,r*.13,0,Math.PI*2);ctx.fill();}else{polygon([[x-r,y+r*.3],[x-r*.7,y-r*.3],[x-r*.1,y-r*.62],[x+r*.65,y-r*.35],[x+r,y+r*.35]],'#8b5143');polygon([[x-r*.7,y-r*.3],[x-r*.1,y-r*.62],[x+r*.25,y-r*.12],[x-r*.2,y+r*.3]],'#c07c58');line(x-r,y+r*.4,x+r,y+r*.4,'#eeac62',4);}}}
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
  drawTokens(w,h);
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
function frame(time){const dt=lastTime?Math.min(.1,(time-lastTime)/1000):0;lastTime=time;if(!document.hidden){if(state.status==='driving'){driveStep(state,inputs,dt);if(state.status==='finished')finish();}else if(state.status==='ready'&&!reduced){const target=demo.objects.find(o=>o.kind==='photo'&&o.y>.3&&!o.taken);driveStep(demo,{target:target?.x??0},dt);if(demo.status==='finished')demo=startDrive();}}game=state.status==='ready'?demo:state;const r=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}ctx.setTransform(ratio,0,0,ratio,0,0);drawRoad(w,h);if(time-lastHUD>80){updateHUD();lastHUD=time;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
