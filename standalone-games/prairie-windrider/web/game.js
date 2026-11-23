import p5 from './vendor/p5.esm.js';
import {COURSES,HEADINGS,COLS,ROWS,initialState,preview,sail,wait,solve,stars,coordinate,windAt,windName} from './engine.mjs';
const $=id=>document.getElementById(id);
const STORAGE='funapps:prairie-windrider:v1';
let courseIndex=0,state=initialState(COURSES[0]),heading=2,power=3,history=[],sketch,canvasReady=false,hintCount=0;
let records=COURSES.map(()=>0);
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(Array.isArray(saved))records=records.map((_,i)=>Number.isInteger(saved[i])&&saved[i]>=0&&saved[i]<=3?saved[i]:0);}catch{}
const course=()=>COURSES[courseIndex];
const announcement=text=>{$('message').textContent=text;};
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(records));}catch{}}
function load(index){courseIndex=index;state=initialState(course());history=[];heading=2;power=3;hintCount=0;render();announcement(course().brief);}
function finishAction(next){if(next===state)return;history.push(state);state=next;if(state.status==='won'){records[courseIndex]=Math.max(records[courseIndex],stars(course(),state));persist();announcement(`Round complete. ${state.moves} sails and ${stars(course(),state)} of 3 stamps.`);}else if(state.status==='lost'){announcement('The afternoon post has closed. Undo a move or restart to find a shorter route.');}else{const delivered=state.delivered.filter(i=>!history.at(-1).delivered.includes(i));announcement(delivered.length?`Delivered at ${course().stations[delivered[0]].name}. A postcard is on its way.`:`Landed at ${coordinate(state)}. The next breeze pushes ${windName(windAt(course(),state)).toLowerCase()}.`);}render();}
function doSail(){finishAction(sail(course(),state,heading,power));}
function render(){
 const c=course(),p=preview(c,state,heading,power),w=windAt(c,state);
 $('courses').innerHTML=COURSES.map((c,i)=>`<button data-course="${i}" aria-pressed="${i===courseIndex}" aria-label="Round ${i+1}: ${c.name}, ${records[i]} of 3 stamps"><span class="course-no">ROUND ${String(i+1).padStart(2,'0')}</span><strong>${c.name}</strong><span class="stars" aria-hidden="true">${'✦'.repeat(records[i])}${'·'.repeat(3-records[i])}</span></button>`).join('');
 $('course-kicker').textContent=c.subtitle.toUpperCase();$('course-name').textContent=c.name;$('position').textContent=coordinate(state);$('moves').textContent=`${state.moves} / ${c.limit}`;$('deliveries').textContent=`${state.delivered.length} / ${c.stations.length}`;$('letter').textContent=c.letter;$('brief').textContent=c.brief;
 $('finish-note').textContent=`Finish at ${coordinate(c.finish)}. Stop directly on each white marker to deliver; sailing past it does not count.`;
 $('obstacle-note').textContent=['marsh','fence'].map(kind=>`${kind==='marsh'?'Wet ground':'Fences'}: ${c.obstacles.filter(o=>o.kind===kind).map(coordinate).join(', ')||'none'}.`).join(' ');
 $('wind').textContent=`Pushing ${windName(w)} · 1 space`;
 $('forecast').innerHTML=Array.from({length:4},(_,i)=>`<div><span>${i===0?'NOW':`SAIL +${i}`}</span><strong>${windName(c.wind[(state.moves+i)%c.wind.length])}</strong></div>`).join('');
 document.querySelectorAll('[data-dir]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.dir)===heading));b.disabled=state.status!=='playing';});
 document.querySelectorAll('[data-power]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.power)===power));b.disabled=state.status!=='playing';});
 $('landing').classList.toggle('bad',!p.valid);$('landing-title').textContent=p.target&&p.target.x>=0&&p.target.x<COLS&&p.target.y>=0&&p.target.y<ROWS?`${HEADINGS[heading].name} × ${power} · Landing ${coordinate(p.target)}`:'Landing outside the course';$('landing-note').textContent=p.reason;
 $('sail').disabled=!p.valid;$('sail').textContent=p.valid?`Set sail to ${coordinate(p.target)}`:'Choose a clear path';$('wait').disabled=state.status!=='playing';$('undo').disabled=history.length===0;$('hint').disabled=state.status!=='playing';
 $('active-controls').hidden=state.status!=='playing';$('result').hidden=state.status==='playing';
 if(state.status==='won')$('result').innerHTML=`<p class="eyebrow">ALL POSTCARDS DELIVERED</p><div class="medal" aria-label="${stars(c,state)} of 3 stamps">${'✦'.repeat(stars(c,state))}</div><h2>A fair wind,<br>a fine delivery.</h2><p>Finished in ${state.moves} sails. ${c.par} or fewer earns all three stamps.</p><p>${hintCount?`A little help from ${hintCount} sailor’s ${hintCount===1?'hint':'hints'}.`:'You read the sky beautifully.'}</p><button class="primary" id="next">${courseIndex===COURSES.length-1?'Sail the first round again':'Next delivery round'}</button>`;
 if(state.status==='lost')$('result').innerHTML='<p class="eyebrow">THE POST HAS CLOSED</p><h2>One more tack?</h2><p>The mail will wait for tomorrow. Undo a move to rethink your route, or begin this round again.</p><button class="primary" id="retry">Try this round again</button>';
 $('stations').innerHTML=c.stations.map((s,i)=>`<li class="${state.delivered.includes(i)?'done':''}"><span>POSTCARD ${i+1} · ${coordinate(s)}</span><strong>${s.name}</strong><small>${state.delivered.includes(i)?'✓ Delivered with care':'Waiting for your buggy'}</small></li>`).join('');
 if(canvasReady)sketch.redraw();
}
$('courses').addEventListener('click',e=>{const b=e.target.closest('[data-course]');if(b)load(Number(b.dataset.course));});
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>{heading=Number(b.dataset.dir);render();}));
document.querySelectorAll('[data-power]').forEach(b=>b.addEventListener('click',()=>{power=Number(b.dataset.power);render();}));
$('sail').addEventListener('click',doSail);$('wait').addEventListener('click',()=>finishAction(wait(course(),state)));
$('undo').addEventListener('click',()=>{if(history.length){state=history.pop();render();announcement('The last sail is undone. Try another tack.');}});
$('restart').addEventListener('click',()=>load(courseIndex));
$('result').addEventListener('click',e=>{if(e.target.closest('#next'))load((courseIndex+1)%COURSES.length);if(e.target.closest('#retry'))load(courseIndex);});
$('hint').addEventListener('click',()=>{const path=solve(course(),state);hintCount++;if(!path){announcement('There is no complete route left in this move budget. Undo a sail or restart the round.');return;}const next=path[0];if(next.wait)announcement(`Brake & wait for the next breeze. A ${path.length}-move route remains.`);else{heading=next.heading;power=next.power;render();announcement(`Try ${HEADINGS[heading].name} with sail ${power}. A ${path.length}-move route remains; the controls are set for the first move.`);}});
const welcome=$('welcome');$('how').addEventListener('click',()=>welcome.showModal());$('start').addEventListener('click',()=>welcome.close());
document.addEventListener('keydown',e=>{
 if(welcome.open||state.status!=='playing'||e.ctrlKey||e.metaKey||e.altKey)return;
 const tag=e.target.tagName;if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;
 const key=e.key.toLowerCase(),dirs={arrowup:0,arrowright:2,arrowdown:4,arrowleft:6,q:7,e:1,z:5,c:3};
 if(key in dirs){e.preventDefault();heading=dirs[key];render();}
 else if(['1','2','3'].includes(key)){e.preventDefault();power=Number(key);render();}
 else if(key===' '&&tag!=='BUTTON'&&tag!=='A'&&tag!=='SUMMARY'){e.preventDefault();doSail();}
});
render();welcome.showModal();
const X=x=>82+x*76,Y=y=>218+y*67;
function arrow(p,x,y,dx,dy,colour,width=3){p.stroke(colour);p.strokeWeight(width);p.line(x,y,x+dx,y+dy);const a=Math.atan2(dy,dx),len=10;p.line(x+dx,y+dy,x+dx-Math.cos(a-.5)*len,y+dy-Math.sin(a-.5)*len);p.line(x+dx,y+dy,x+dx-Math.cos(a+.5)*len,y+dy-Math.sin(a+.5)*len);}
function elevator(p,x,y,colour='#a64e39',kind='elevator',scale=1){p.push();p.translate(x,y);p.scale(scale);p.noStroke();p.fill('#65734436');p.ellipse(7,14,56,17);if(kind==='cafe'){p.fill('#faf4d9');p.rect(-24,-17,48,28,2);p.fill(colour);p.triangle(-29,-17,0,-37,29,-17);p.fill('#506d67');p.rect(-6,-7,12,18);p.fill('#cfad67');p.rect(-18,-9,8,9);p.rect(12,-9,8,9);}else{p.fill(colour);p.rect(-16,-43,33,54);p.fill('#6e4331');p.quad(-18,-43,0,-58,19,-43,19,-36);p.fill('#dabf79');p.rect(-3,-43,5,52);p.fill('#f4e6b8');p.rect(-12,-29,10,9);p.fill('#704c33');p.rect(-8,-4,17,15);p.fill('#bc7950');p.rect(17,-14,17,25);p.fill('#8a5639');p.triangle(15,-14,25,-23,37,-14);}p.pop();}
function buggy(p,x,y){p.push();p.translate(x,y);p.noStroke();p.fill('#5960413a');p.ellipse(5,16,52,18);p.stroke('#233e45');p.strokeWeight(4);p.line(-20,9,19,9);p.line(2,8,2,-45);p.noStroke();p.fill('#243e44');p.ellipse(-15,12,11,13);p.ellipse(17,12,11,13);p.fill('#e4dbc2');p.triangle(0,-43,0,1,-25,1);p.fill('#bb6344');p.triangle(5,-36,5,1,25,1);p.fill('#f0b45e');p.circle(0,-49,6);p.fill('#bb6344');p.rect(-10,2,28,7,3);p.pop();}
function drawMap(p){
 const c=course(),pred=preview(c,state,heading,power),w=windAt(c,state);
 p.background('#cbd9cb');p.noStroke();
 for(let y=0;y<165;y+=3){const k=y/165;p.fill(p.lerpColor(p.color('#9dcbd0'),p.color('#e9e4bf'),k));p.rect(0,y,1000,4);}
 p.fill('#f3db91');p.circle(810,65,61);p.fill('#f5f3d9d0');p.ellipse(184,66,145,22);p.ellipse(237,59,87,24);p.ellipse(640,96,113,15);p.fill('#a4b785');p.beginShape();p.vertex(0,151);p.bezierVertex(290,129);p.bezierVertex(510,157);p.bezierVertex(1000,143);p.vertex(1000,192);p.vertex(0,192);p.endShape(p.CLOSE);
 p.fill('#c6b56e');p.rect(0,164,1000,616);p.fill('#e5cf89');p.quad(0,164,1000,164,1000,192,0,211);
 p.stroke('#8fa07f');p.strokeWeight(1.5);for(let i=0;i<6;i++){const x=430+i*24;p.line(x,145,x,174);if(i<5)p.line(x,150,x+24,151);}elevator(p,105,153,'#a7764d','elevator',.54);elevator(p,146,156,'#7d8d6b','elevator',.43);
 p.noStroke();p.fill('#f3e4b2');p.rect(43,183,913,542,11);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  p.noStroke();p.fill((x+y)%2?'#d6c17c':'#ddca8a');p.rect(X(x)-35,Y(y)-30,70,61,3);
  p.stroke('#c3ac6252');p.strokeWeight(1);for(let n=0;n<4;n++)p.line(X(x)-27+n*17,Y(y)-24,X(x)-27+n*17,Y(y)+24);
 }
 p.textFont('Arial');p.textAlign(p.CENTER,p.CENTER);p.textSize(15);p.noStroke();p.fill('#736b45');for(let x=0;x<COLS;x++)p.text(String.fromCharCode(65+x),X(x),199);for(let y=0;y<ROWS;y++)p.text(y+1,27,Y(y));
 for(const o of c.obstacles){const x=X(o.x),y=Y(o.y);if(o.kind==='marsh'){p.noStroke();p.fill('#88b0aa');p.rect(x-35,y-30,70,61,9);p.fill('#739f9e');p.ellipse(x+4,y+3,55,33);p.stroke('#c8ddd1');p.strokeWeight(2);p.line(x-21,y-4,x-4,y-4);p.line(x+6,y+12,x+25,y+12);p.stroke('#677c4c');p.line(x-28,y-18,x-25,y-31);p.line(x+24,y+18,x+26,y+31);}else{p.stroke('#876646');p.strokeWeight(4);p.line(x-30,y-15,x+30,y-15);p.line(x-30,y+5,x+30,y+5);p.strokeWeight(7);for(let q=-25;q<=25;q+=25)p.line(x+q,y-26,x+q,y+25);}}
 if(state.trail.length){p.noFill();p.stroke('#746b463f');p.strokeWeight(4);for(const segment of state.trail)p.line(X(segment.from.x),Y(segment.from.y),X(segment.to.x),Y(segment.to.y));}
 for(let i=0;i<c.stations.length;i++){const s=c.stations[i],x=X(s.x),y=Y(s.y),done=state.delivered.includes(i);p.noStroke();p.fill(done?'#e2edcf':'#fff6d9');p.circle(x,y,53);p.stroke(done?'#699266':'#a78b51');p.strokeWeight(2);p.noFill();p.circle(x,y,53);elevator(p,x,y-4,i%2?'#6a8270':'#ad6146',s.kind,.55);p.noStroke();p.fill(done?'#456f51':'#4d5137');p.textSize(14);p.textStyle(p.BOLD);p.text(done?'✓':String(i+1),x+22,y-24);p.textStyle(p.NORMAL);}
 const f=c.finish;p.noFill();p.stroke('#fff9dd');p.strokeWeight(3);p.circle(X(f.x),Y(f.y),66);p.stroke('#456c5a');p.strokeWeight(2);p.circle(X(f.x),Y(f.y),61);p.noStroke();p.fill('#365e50');p.textSize(13);p.textStyle(p.BOLD);p.text('DEPOT',X(f.x),Y(f.y)+29);p.textStyle(p.NORMAL);
 if(pred.target&&state.status==='playing'){
  const tx=Math.max(-.35,Math.min(11.35,pred.target.x)),ty=Math.max(-.25,Math.min(7.3,pred.target.y));p.drawingContext.setLineDash([9,7]);p.stroke(pred.valid?'#b95c40':'#9f5a56');p.strokeWeight(3);p.line(X(state.x),Y(state.y),X(tx),Y(ty));p.drawingContext.setLineDash([]);p.noFill();p.strokeWeight(3);p.circle(X(tx),Y(ty),31);p.line(X(tx)-7,Y(ty),X(tx)+7,Y(ty));p.line(X(tx),Y(ty)-7,X(tx),Y(ty)+7);
 }
 buggy(p,X(state.x),Y(state.y));
 p.noStroke();p.fill('#6a6e4e');p.textAlign(p.LEFT,p.CENTER);p.textSize(13);p.text('IMAGINARY COURSE · STOP ON THE MARKERS',51,755);p.textAlign(p.RIGHT,p.CENTER);p.text(`WIND PUSHES ${windName(w).toUpperCase()}`,922,755);arrow(p,946,754,w.x*22,w.y*18,'#4d6b60',2);
}
sketch=new p5(p=>{p.setup=()=>{p.pixelDensity(Math.min(window.devicePixelRatio||1,2));const canvas=p.createCanvas(1000,780,p.P2D);canvas.parent('canvas-wrap');canvas.elt.setAttribute('aria-hidden','true');$('canvas-wrap').querySelector('.loading')?.remove();p.noLoop();canvasReady=true;};p.draw=()=>drawMap(p);});
