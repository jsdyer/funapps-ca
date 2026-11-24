import p5 from './vendor/p5.esm.js';
import {fresh,begin,pause,resume,target,steer,tick,ROUND_SECONDS,PLAYER_Y,windAt,stars} from './quick-engine.mjs';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state=tick(fresh(),.01),best=0,previousMode='',uiClock=0,held={left:false,right:false};
try{best=Number(localStorage.getItem('funapps:prairie:quick-best'))||0;}catch{}
function announce(s){$('announce').textContent=s;}
function start(){state=begin();held={left:false,right:false};update();announce('Mail run started. Steer into gold envelopes; avoid red hay bales.');$('canvas').focus({preventScroll:true});}
function togglePause(){if(state.mode==='playing'){state=pause(state);held={left:false,right:false};announce('Mail run paused.');}else if(state.mode==='paused'){state=resume(state);announce('Mail run resumed.');}update();}
function update(){
 $('mail').textContent=String(state.mode==='demo'?0:state.mail);$('score').textContent=String(state.mode==='demo'?0:state.score);$('time').textContent=String(Math.ceil(state.mode==='demo'?ROUND_SECONDS:ROUND_SECONDS-state.time));
 $('intro').hidden=state.mode!=='demo';$('pause-panel').hidden=state.mode!=='paused';$('result').hidden=state.mode!=='finished';$('pause').disabled=!['playing','paused'].includes(state.mode);$('pause').textContent=state.mode==='paused'?'Resume':'Pause';
 $('hint').hidden=['finished','paused'].includes(state.mode);$('hint').textContent=state.time<6||state.mode==='demo'?'Steer into the gold envelopes':state.invulnerable?'Just a bump. Keep sailing!':'Catch the post · Dodge the red bales';
 $('wind-arrow').textContent=windAt(state.time)>0?'≋ ›':'‹ ≋';
 if(state.mode==='finished'&&previousMode!=='finished'){
  best=Math.max(best,state.score);try{localStorage.setItem('funapps:prairie:quick-best',String(best));}catch{}
  $('medals').textContent='✦'.repeat(stars(state));$('medals').setAttribute('aria-label',`${stars(state)} of 3 stamps`);$('result-title').textContent=state.mail>=24?'The post is flying!':'A fine bit of sailing.';$('result-score').textContent=`${state.mail} postcards · ${state.score.toLocaleString()} points`;$('best').textContent=`Personal best ${best.toLocaleString()} · ${state.bumps} ${state.bumps===1?'bump':'bumps'}`;announce(`Round complete. ${state.mail} postcards, ${state.score} points and ${stars(state)} stamps.`);
 }
 previousMode=state.mode;
}
$('play').addEventListener('click',start);$('again').addEventListener('click',start);$('restart').addEventListener('click',start);$('resume').addEventListener('click',togglePause);$('pause').addEventListener('click',togglePause);
function pointer(e){const b=$('canvas').getBoundingClientRect();state=target(state,(e.clientX-b.left)/b.width);}
$('canvas').addEventListener('pointerdown',e=>{if(state.mode==='demo')start();if(state.mode!=='playing')return;pointer(e);$('canvas').setPointerCapture(e.pointerId);});
$('canvas').addEventListener('pointermove',e=>{if(state.mode==='playing'&&(e.pointerType==='mouse'||e.buttons))pointer(e);});
function applyHeld(){state=steer(state,Number(held.right)-Number(held.left));}
for(const [id,dir] of [['left','left'],['right','right']]){
 const b=$(id);b.addEventListener('click',()=>{if(state.mode==='demo')start();if(state.mode==='playing')state=target(state,state.x+(dir==='left'?-.12:.12));});b.addEventListener('pointerdown',e=>{if(state.mode==='demo')start();if(state.mode!=='playing')return;e.preventDefault();held[dir]=true;applyHeld();b.setPointerCapture(e.pointerId);});
 for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>{held[dir]=false;applyHeld();});
}
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey)return;const key=e.key.toLowerCase();
 if(['arrowleft','arrowright','a','d'].includes(key)){e.preventDefault();if(state.mode==='demo')start();if(state.mode!=='playing')return;held[key==='arrowleft'||key==='a'?'left':'right']=true;applyHeld();}
 if((key==='p'||key==='escape')&&!e.repeat){e.preventDefault();togglePause();}
 if(key===' '&&e.target===$('canvas')&&!e.repeat){e.preventDefault();if(['demo','finished'].includes(state.mode))start();else togglePause();}
});
document.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(['arrowleft','a'].includes(key))held.left=false;if(['arrowright','d'].includes(key))held.right=false;if(['arrowleft','arrowright','a','d'].includes(key))applyHeld();});
function suspend(){if(state.mode==='playing'){state=pause(state);held={left:false,right:false};update();announce('Mail run paused while you were away.');}}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
new p5(p=>{
 const W=1000,H=700;
 p.setup=()=>{const b=$('canvas').getBoundingClientRect();p.createCanvas(b.width,b.height,p.P2D).parent('canvas');p.pixelDensity(Math.min(window.devicePixelRatio||1,2));p.textFont('Arial');update();};
 p.windowResized=()=>{const b=$('canvas').getBoundingClientRect();p.resizeCanvas(b.width,b.height);};
 function yacht(x,y){p.push();p.translate(x,y);p.noStroke();p.fill('#304c3b30');p.ellipse(6,27,86,21);p.stroke('#173f43');p.strokeWeight(7);p.line(-35,13,35,13);p.line(0,15,0,-75);p.noStroke();p.fill('#163d41');p.ellipse(-31,20,13,24);p.ellipse(31,20,13,24);p.fill('#fff6d6');p.triangle(-5,-70,-5,8,-43,8);p.fill('#e46443');p.triangle(3,-62,3,5,37,5);p.fill('#ffdd74');p.rect(-20,2,41,16,7);p.fill('#183c42');p.circle(9,-6,17);p.fill('#f2b981');p.circle(9,-19,13);p.fill('#d95e40');p.arc(9,-22,16,14,Math.PI,2*Math.PI);p.pop();}
 function envelope(o){p.push();p.translate(o.x*W,o.y*H);p.rotate(Math.sin(state.time*4+o.id)*.08);p.noStroke();p.fill('#70532c27');p.ellipse(3,17,60,14);p.fill('#fff6c7');p.stroke('#d4982a');p.strokeWeight(3);p.rect(-26,-18,52,36,5);p.noFill();p.stroke('#d4982a');p.line(-24,-15,0,4);p.line(0,4,24,-15);p.stroke('#efbd4a');p.line(-23,14,-8,1);p.line(23,14,8,1);p.noStroke();p.fill('#eb984a');p.rect(12,-12,8,9,1);p.pop();}
 function bale(o){p.push();p.translate(o.x*W,o.y*H);p.noStroke();p.fill('#70532c33');p.ellipse(3,22,70,19);p.fill('#d86541');p.stroke('#a93c2a');p.strokeWeight(3);p.rect(-30,-23,60,46,7);p.stroke('#f2b16c');p.strokeWeight(2);for(let i=-15;i<20;i+=7)p.line(-24,i,24,i);p.stroke('#953b2a');p.strokeWeight(5);p.line(-15,-23,-15,23);p.line(15,-23,15,23);p.pop();}
 p.draw=()=>{
  if(!document.hidden&&!(reduced&&state.mode==='demo'))state=tick(state,p.deltaTime/1000);
  uiClock+=p.deltaTime;if(uiClock>90){update();uiClock=0;}
  p.push();p.scale(p.width/W,p.height/H);p.background('#e8c85e');p.noStroke();p.fill('#87cdd3');p.rect(0,0,W,110);p.fill('#b7dfd7');p.rect(0,86,W,38);p.fill('#f4db76');p.circle(820,45,65);
  p.fill('#f9f4d5a0');for(let i=0;i<4;i++){const x=(i*290+state.time*6)%1200-70;p.ellipse(x,38+i%2*30,130,22);p.ellipse(x+35,30+i%2*30,70,28);}
  p.fill('#6e9362');p.rect(0,110,W,24);p.fill('#bca64f');p.rect(0,134,W,10);
  p.fill('#a65536');p.rect(65,68,35,65);p.triangle(59,69,82,47,106,69);p.fill('#ffe4a1');p.rect(77,76,10,14);p.fill('#d89554');p.rect(100,97,33,36);p.fill('#4f6e4f');p.rect(882,84,38,50);p.triangle(877,85,902,65,925,85);
  p.fill('#dcc15c');p.rect(0,144,105,H);p.rect(895,144,105,H);p.stroke('#bda24666');p.strokeWeight(2);for(let x=20;x<W;x+=44)p.line(x,145,x,H);
  const drift=state.time*112;for(let i=0;i<23;i++){const y=145+(i*31+drift)%560;p.stroke('#fff2a441');p.strokeWeight(2);p.line(111,y,889,y);}
  for(let i=0;i<20;i++){const y=145+(i*87+drift)%560,x=i%2?930:62;p.stroke('#8e9847');p.strokeWeight(3);p.line(x,y,x-9,y-15);p.line(x,y-2,x+10,y-20);p.line(x,y,x,y-26);}
  p.stroke('#faf4c0aa');p.strokeWeight(3);p.drawingContext.setLineDash([12,16]);p.line(115,143,115,H);p.line(885,143,885,H);p.drawingContext.setLineDash([]);
  for(const o of state.objects)o.kind==='mail'?envelope(o):bale(o);
  if(state.flash){p.noFill();p.stroke('#fff0a4');p.strokeWeight(5);p.circle(state.x*W,PLAYER_Y*H,95+(1-state.flash/.25)*30);}
  if(!state.invulnerable||Math.floor(state.time*10)%2===0)yacht(state.x*W,PLAYER_Y*H);
  p.pop();
 };
});
