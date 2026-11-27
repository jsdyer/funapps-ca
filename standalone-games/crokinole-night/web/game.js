(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ctx = $('board').getContext('2d');
  const centre = 310, radius = 258, discRadius = 11;
  const colours = ['#b84932', '#263f45'];
  const names = ['Red', 'Blue'];
  const pegs = Array.from({length: 8}, (_, i) => {
    const angle = (i + 0.5) * Math.PI / 4;
    return {x: centre + 83 * Math.cos(angle), y: centre + 83 * Math.sin(angle)};
  });
  let discs, bank, shots, rolling, frame, last, elapsed, lastResult;
  function circle(x, y, r, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();}
  }
  function launch() {
    const position = Number($('position').value) * Math.PI / 180;
    const angle = position + Number($('aim').value) * Math.PI / 180;
    return {x: centre + 215 * Math.sin(position), y: centre + 215 * Math.cos(position), dx: -Math.sin(angle), dy: -Math.cos(angle)};
  }
  function paint() {
    ctx.fillStyle = '#28463e'; ctx.fillRect(0,0,620,620);
    circle(centre,centre,291,'#614332','#412e23',5);
    circle(centre,centre,279,'#3f3028','#d09c61',3);
    const wood = ctx.createRadialGradient(280,255,10,310,310,265);
    wood.addColorStop(0,'#f9dca3'); wood.addColorStop(.7,'#eac28b'); wood.addColorStop(1,'#dcb17c');
    circle(centre,centre,radius,wood,'#a57545',3);
    for (const r of [83,162,216]) circle(centre,centre,r,null,'#805b3d',2);
    for(let i=0;i<4;i++){
      const a=Math.PI/4 + i*Math.PI/2;
      ctx.beginPath();ctx.moveTo(centre+Math.cos(a)*216,centre+Math.sin(a)*216);
      ctx.lineTo(centre+Math.cos(a)*radius,centre+Math.sin(a)*radius);ctx.stroke();
    }
    ctx.textAlign='center';ctx.font='bold 15px Georgia';ctx.fillStyle='#835e41';
    [[120,'10'],[189,'5'],[54,'15']].forEach(([x,label])=>ctx.fillText(label,centre+x,centre+5));
    circle(centre,centre,16,'#443328','#bd8f59',5);
    pegs.forEach(p=>{circle(p.x+2,p.y+3,5,'#a57a50');circle(p.x,p.y,5,'#65432c','#f2cc94',1);});
    const drawDisc=(d,colour)=>{circle(d.x+1,d.y+2,discRadius+1,'#875f4599');circle(d.x,d.y,discRadius,colour,'#fff2c9',1.6);circle(d.x,d.y,6,null,'#ffffff55');};
    discs.forEach(d=>drawDisc(d,colours[d.player]));
    if (!rolling && shots<12) {
      const s=launch();
      ctx.setLineDash([7,7]);ctx.strokeStyle='#5b492b';ctx.lineWidth=3;ctx.beginPath();
      ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.dx*(48+7*Number($('power').value)),s.y+s.dy*(48+7*Number($('power').value)));ctx.stroke();ctx.setLineDash([]);
      drawDisc(s,colours[shots%2]);
    }
  }
  function scores() {
    const total=[...bank];
    for (const d of discs) {
      const distance=Math.hypot(d.x-centre,d.y-centre);
      total[d.player]+=distance<=83?15:distance<=162?10:distance<=216?5:0;
    }
    return total;
  }
  function update() {
    const total=scores();
    $('turn').textContent=shots===12?'Round complete':names[shots%2]+' to shoot';
    $('score').textContent='Red '+total[0]+' · Blue '+total[1]+' · '+shots+'/12 shots';
    $('shoot').disabled=rolling||shots===12;
    for(const id of ['position','aim','power']) $(id).disabled=rolling||shots===12;
    if (shots===12) $('message').textContent=(total[0]===total[1]?'A tie':names[Number(total[1]>total[0])]+' wins')+'! Start a new round to play again.';
  }
  function tick() {
    for(const d of discs) {
      d.x+=d.vx; d.y+=d.vy; d.vx*=.976; d.vy*=.976;
      if (Math.hypot(d.vx,d.vy)<.068) {d.vx=0;d.vy=0;}
      for(const p of pegs){
        const dx=d.x-p.x,dy=d.y-p.y,dist=Math.hypot(dx,dy);
        if(dist>=16||dist===0) continue;
        const nx=dx/dist,ny=dy/dist,along=d.vx*nx+d.vy*ny;
        d.x=p.x+nx*16;d.y=p.y+ny*16;
        if(along<0){d.vx-=1.65*along*nx;d.vy-=1.65*along*ny;}
      }
    }
    for(let i=0;i<discs.length;i++)for(let j=i+1;j<discs.length;j++){
      const a=discs[i],b=discs[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);
      if(dist>=discRadius*2) continue;
      const nx=dist?dx/dist:1,ny=dist?dy/dist:0,over=(discRadius*2-dist)/2;
      a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;
      const speed=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
      if(speed>0){const kick=.88*speed;a.vx-=kick*nx;a.vy-=kick*ny;b.vx+=kick*nx;b.vy+=kick*ny;}
    }
    discs=discs.filter(d=>{
      const distance=Math.hypot(d.x-centre,d.y-centre);
      if(distance<10 && Math.hypot(d.vx,d.vy)<5){bank[d.player]+=20;lastResult=names[d.player]+' pocketed a 20!';return false;}
      if(distance>radius+discRadius){lastResult=names[d.player]+' went into the ditch.';return false;}
      return true;
    });
  }
  function animate(now){
    elapsed+=Math.min(64,now-last);last=now;
    while(elapsed>=1000/60){tick();elapsed-=1000/60;}
    if(discs.some(d=>d.vx||d.vy)){paint();frame=requestAnimationFrame(animate);return;}
    rolling=false;shots++;
    $('message').textContent=(lastResult||'The discs have settled.')+' Pass the board.';
    update();paint();
  }
  $('shoot').addEventListener('click',()=>{
    if(rolling||shots>=12) return;
    const s=launch(),speed=2.05+Number($('power').value)*.75;
    if(discs.some(d=>Math.hypot(s.x-d.x,s.y-d.y)<discRadius*2)){ $('message').textContent='A disc is in that starting spot. Slide the position control.';return;}
    discs.push({x:s.x,y:s.y,vx:s.dx*speed,vy:s.dy*speed,player:shots%2});
    rolling=true;lastResult='';elapsed=0;last=performance.now();$('message').textContent='Disc in motion…';update();frame=requestAnimationFrame(animate);
  });
  ['position','aim','power'].forEach(id=>$(id).addEventListener('input',paint));
  function reset(){cancelAnimationFrame(frame);discs=[];bank=[0,0];shots=0;rolling=false;$('position').value=0;$('aim').value=0;$('power').value=5;$('message').textContent='Aim along the dotted line. A straight medium flick can sink the first disc.';update();paint();}
  $('reset').addEventListener('click',reset);reset();
})();
