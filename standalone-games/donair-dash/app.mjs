import {createGame,startGame,setPlayer,tick,pauseGame,resumeGame,INGREDIENTS} from './engine.mjs';
import {render} from './art.mjs';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const game=createGame(),keys=new Set(),particles=[],heldDirections=new Map();
let best=0,sound=false,audio,previous=0,toastUntil=0,lastRecipe='',lastUI='',pointer=null,controlDirection=0,width=900,height=600,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const n=Number(localStorage.getItem('donair-dash-best'));if(Number.isFinite(n)&&n>0&&n<1000000)best=Math.floor(n);}catch{}
$('best').textContent=best.toLocaleString();$('reduceMotion').checked=reduced;document.body.classList.toggle('reduced-motion',reduced);
if(best)$('bestIntro').textContent=`Your best: ${best.toLocaleString()} points. Hungry for another?`;
const icons={beef:'🥩',tomato:'🍅',onion:'🧅',sauce:'●',lettuce:'🥬',chips:'🥔'};
function updateUI(){
  const uiKey=[game.status,game.score,game.orders,game.combo,Math.ceil(game.timeLeft),game.recipe.join(','),game.recipeIndex].join('|');
  if(uiKey===lastUI)return; lastUI=uiKey;
  $('score').textContent=String(game.score).padStart(4,'0');$('orders').textContent=String(game.orders).padStart(2,'0');$('clock').replaceChildren(document.createTextNode(String(Math.ceil(game.timeLeft))),Object.assign(document.createElement('span'),{textContent:'s'}));$('clock').parentElement.classList.toggle('urgent',game.timeLeft<=10);
  $('orderNumber').textContent=String(game.orders+1).padStart(3,'0');$('combo').textContent=`×${Math.min(3,game.combo+1)}`;$('comboHint').textContent=game.combo?`${game.combo} ${game.combo===1?'order':'orders'} in your streak`:'Keep it clean. Earn more.';$('bonus').textContent=' pts';$('bonus').parentElement.firstChild.textContent=`+${150*Math.min(3,game.combo+1)}`;
  const signature=game.recipe.join(',')+':'+game.recipeIndex;
  if(signature!==lastRecipe){lastRecipe=signature;$('recipe').replaceChildren(...game.recipe.map((type,i)=>{const li=document.createElement('li');li.className=i<game.recipeIndex?'complete':i===game.recipeIndex?'current':'';if(i===game.recipeIndex)li.setAttribute('aria-current','step');const icon=Object.assign(document.createElement('span'),{className:'ingredient-icon',textContent:i<game.recipeIndex?'✓':icons[type]});icon.setAttribute('aria-hidden','true');li.append(icon,document.createTextNode(INGREDIENTS[type].short||INGREDIENTS[type].label));return li;}));$('nextName').textContent=INGREDIENTS[game.recipe[game.recipeIndex]].label;}
  $('nextCatch').hidden=game.status!=='playing';$('pause').disabled=!['playing','paused'].includes(game.status);$('pause').setAttribute('aria-label',game.status==='paused'?'Resume game':'Pause game');$('pause').innerHTML=game.status==='paused'?'<span class="play-mark" aria-hidden="true"></span><span class="pause-word">Resume</span>':'<span class="pause-mark" aria-hidden="true"></span><span class="pause-word">Pause</span>';
}
function tone(kind){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='sine';const t=audio.currentTime;o.frequency.setValueAtTime(kind==='wrong'?130:kind==='serve'?660:440,t);o.frequency.exponentialRampToValueAtTime(kind==='wrong'?80:kind==='serve'?1000:660,t+.12);g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.start(t);o.stop(t+.2);}catch{sound=false;$('sound').textContent='Sound unavailable';$('sound').setAttribute('aria-pressed','false');}}
function toast(text,bad=false){$('toast').textContent=text;$('toast').classList.toggle('bad',bad);$('toast').classList.add('visible');toastUntil=performance.now()+1150;}
function burst(color){if(reduced)return;for(let i=0;i<16;i++)particles.push({x:game.playerX,y:.80,vx:(Math.random()-.5)*.25,vy:-.2-Math.random()*.2,life:1,size:2+Math.random()*3,color});}
function overlay(mode){
  const paused=mode==='paused';$('overlay').hidden=false;$('overlayBadge').textContent=paused?'TAKE A BREATHER, BUD.':game.score>best?'NEW PERSONAL BEST!':'THE SHIFT IS WRAPPED.';
  $('overlayTitle').innerHTML=paused?'Your pita can wait.':game.orders>=8?'Certified <em>donair legend.</em>':game.orders>=4?'That’s a <em>solid shift.</em>':'One more <em>for the road?</em>';
  $('overlayCopy').textContent=paused?'The clock is stopped. Come back when you’re hungry.':game.orders?`${game.orders} donairs served. A little sauce goes a long way.`:'Follow the highlighted topping on the ticket. You’ve got this.';
  $('start').innerHTML=paused?'KEEP ROLLING':'PLAY AGAIN';$('startControls').hidden=!paused;$('resultStats').hidden=paused;$('copy').hidden=paused;
  if(!paused){$('resultStats').innerHTML=`<div><strong>${game.score.toLocaleString()}</strong><span>POINTS</span></div><div><strong>${game.orders}</strong><span>DONAIRS</span></div><div><strong>${game.bestCombo}</strong><span>BEST STREAK</span></div>`;if(game.score>best){best=game.score;try{localStorage.setItem('donair-dash-best',String(best));}catch{}}$('best').textContent=best.toLocaleString();$('bestIntro').textContent=`Personal best: ${best.toLocaleString()}`;$('announce').textContent=`Shift over. ${game.score} points, ${game.orders} donairs served.`;}
  else $('bestIntro').textContent='Press P or Escape to resume.';
  $('start').focus({preventScroll:true});
}
function begin(){if(!ctx)return;if(game.status==='paused')resumeGame(game);else{startGame(game);particles.length=0;lastRecipe='';}stopControls();previous=performance.now();$('overlay').hidden=true;$('toast').classList.remove('visible');$('copy').textContent='Copy my score';canvas.focus({preventScroll:true});updateUI();}
function togglePause(){if(game.status==='playing'){pauseGame(game);stopControls();overlay('paused');}else if(game.status==='paused')begin();updateUI();}
$('start').addEventListener('click',begin);$('pause').addEventListener('click',togglePause);
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));if(sound)tone('catch');});
$('reduceMotion').addEventListener('change',event=>{reduced=event.target.checked;document.body.classList.toggle('reduced-motion',reduced);particles.length=0;});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`I served ${game.orders} donairs and scored ${game.score} in Donair Dash. Your shift starts here: https://donair.funapps.ca/`);$('copy').textContent='Score copied!';}catch{$('copy').textContent=`${game.score} points · ${game.orders} donairs`;}});
document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;const key=event.key.toLowerCase();if(['arrowleft','arrowright','a','d'].includes(key)&&game.status==='playing'){event.preventDefault();keys.add(key);}if(['p','escape'].includes(key)&&!event.repeat){event.preventDefault();togglePause();}});
document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
function stopControls(){keys.clear();heldDirections.clear();controlDirection=0;pointer=null;}
window.addEventListener('blur',()=>{stopControls();if(game.status==='playing'){pauseGame(game);overlay('paused');updateUI();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.status==='playing'){stopControls();pauseGame(game);overlay('paused');updateUI();}});
function aim(event){const rect=canvas.getBoundingClientRect();setPlayer(game,(event.clientX-rect.left)/rect.width);}
canvas.addEventListener('pointerdown',event=>{if(game.status!=='playing'||pointer!==null)return;pointer=event.pointerId;canvas.setPointerCapture(event.pointerId);aim(event);canvas.focus({preventScroll:true});});canvas.addEventListener('pointermove',event=>{if(pointer===event.pointerId&&game.status==='playing')aim(event);});for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{if(event.pointerId===pointer)pointer=null;});
for(const [id,direction] of [['left',-1],['right',1]]){
  const el=$(id);
  el.addEventListener('pointerdown',e=>{if(game.status==='playing'){
    e.preventDefault();heldDirections.set(e.pointerId,direction);
    controlDirection=Math.sign([...heldDirections.values()].reduce((sum,value)=>sum+value,0));
    setPlayer(game,game.playerX+direction*.03);el.setPointerCapture(e.pointerId);
  }});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>{
    heldDirections.delete(e.pointerId);
    controlDirection=Math.sign([...heldDirections.values()].reduce((sum,value)=>sum+value,0));
  });
  // Keyboard and assistive activation moves one step; releasing a held pointer never adds an extra jump.
  el.addEventListener('click',e=>{if(e.detail===0&&game.status==='playing')setPlayer(game,game.playerX+direction*.07);});
}
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);}
if(ctx){new ResizeObserver(resize).observe(canvas);resize();}else{$('overlayTitle').textContent='The game could not open.';$('overlayCopy').textContent='This browser needs Canvas 2D support. Try an up-to-date browser.';$('start').disabled=true;}
function frame(now){const dt=Math.min((now-(previous||now))/1000,.05);previous=now;if(game.status==='playing'){const direction=controlDirection+(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);if(direction)setPlayer(game,game.playerX+Math.sign(direction)*dt*.75);tick(game,dt);for(const event of game.events){if(event.type==='catch'){tone('catch');burst('#8ae5ca');toast(`+${event.points} · ${INGREDIENTS[event.ingredient].label}`);}if(event.type==='wrong'){tone('wrong');toast('Wrong topping! −2 seconds',true);}if(event.type==='serve'){tone('serve');burst('#ffc85c');toast(`ORDER UP! +${event.points}`);$('announce').textContent=`Order served. ${game.orders} donairs. ${game.score} points.`;}if(event.type==='end')overlay('over');}updateUI();}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt*1.8;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*.5;if(p.life<=0)particles.splice(i,1);}if(toastUntil&&now>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}
  if(ctx)render(ctx,width,height,game,{time:now/1000,reduced,particles});requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);
