/** Original, dependency-free Canvas artwork for Clams & Chips.
 * Clams are breaded, deep-fried clam meat: no shells, shellfish icons or steam.
 */
const PALETTE = Object.freeze({
  ink:'#173e43', teal:'#2d7978', mint:'#a5d4bd', coral:'#e96750',
  cream:'#fff4d8', steel:'#b7c9c5', steelLight:'#e0e8dc', oil:'#ba7727',
  fried:'#dd982f', friedLight:'#f5bd55', friedDark:'#9b5927',
});
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const seeded = (seed, i) => {
  const n=Math.sin(seed*19.83+i*74.17)*4731.153;
  return n-Math.floor(n);
};

function rounded(c,x,y,w,h,r,fill,stroke,width=2){
  c.beginPath();c.roundRect(x,y,w,h,r);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function ellipse(c,x,y,rx,ry,fill,stroke,width=2){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function poly(c,points,fill,stroke,width=2){
  c.beginPath();c.moveTo(...points[0]);
  for(const point of points.slice(1))c.lineTo(...point);
  c.closePath();if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function prepare(canvas){
  if(!canvas?.getContext)return null;
  const c=canvas.getContext('2d');if(!c)return null;
  const box=canvas.getBoundingClientRect();
  const w=box.width||canvas.clientWidth||520,h=box.height||canvas.clientHeight||300;
  const dpr=clamp(globalThis.devicePixelRatio||1,1,2);
  const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const scale=Math.min(w/520,h/300);
  c.translate((w-520*scale)/2,(h-300*scale)/2);c.scale(scale,scale);
  c.lineCap='round';c.lineJoin='round';
  return c;
}

/** One battered clam bite/strip. A lumpy elongated profile, never a shell. */
export function drawClam(c,x,y,size=22,angle=0,seed=1,burnt=false,light=false){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size/22,size/22);
  const outline=[],highlight=[];
  for(let i=0;i<18;i++){
    const a=i/18*TAU,r=0.82+seeded(seed,i)*0.29;
    const px=Math.cos(a)*27*r,py=Math.sin(a)*15*r;
    outline.push([px,py]);highlight.push([px*.78-2,py*.65-3]);
  }
  poly(c,outline,burnt?'#563b26':light?'#e8c278':PALETTE.fried,burnt?'#342c22':'#9d612e',2.1);
  poly(c,highlight,burnt?'#795133':light?'#f6dfaa':PALETTE.friedLight);
  // Fine breading flecks follow the irregular meat surface.
  for(let i=0;i<22;i++){
    const px=(seeded(seed,i+20)-.5)*40,py=(seeded(seed,i+60)-.5)*19;
    const r=.9+seeded(seed,i+90)*1.5;
    c.fillStyle=burnt?(i%3?'#473121':'#a37540'):(i%3?'#b7772e':'#ffe4a0');
    c.beginPath();c.arc(px,py,r,0,TAU);c.fill();
  }
  c.restore();
}

/** A thick-cut, deep-fried potato chip with browned edges. */
export function drawChip(c,x,y,length=59,angle=0,seed=1,burnt=false,light=false){
  c.save();c.translate(x,y);c.rotate(angle);
  const width=11+seeded(seed,1)*5;
  poly(c,[[-width/2,-length/2+4],[width/2-2,-length/2],[width/2,length/2-3],[-width/2+1,length/2]],burnt?'#70451f':light?'#f3d998':'#e9ad3b',burnt?'#482d1a':'#a96a25',1.8);
  poly(c,[[-width/2+3,-length/2+7],[width/2-4,-length/2+4],[width/2-3,length/2-7],[-width/2+4,length/2-5]],burnt?'#93612c':light?'#ffebba':'#ffdb79');
  for(let i=0;i<5;i++){
    c.fillStyle=burnt?'#3d2d1c':'#b77d30';
    c.fillRect((seeded(seed,i+4)-.5)*width*.65,(seeded(seed,i+14)-.5)*length*.75,1.7,2.5);
  }
  c.restore();
}

function mesh(c,x,y,w,h){
  c.save();c.beginPath();c.roundRect(x,y,w,h,14);c.clip();
  c.strokeStyle='#e8cf7d69';c.lineWidth=1.3;
  for(let i=-h;i<w;i+=14){c.beginPath();c.moveTo(x+i,y);c.lineTo(x+i+h,y+h);c.stroke();}
  for(let i=0;i<w+h;i+=14){c.beginPath();c.moveTo(x+i,y);c.lineTo(x+i-h,y+h);c.stroke();}
  c.restore();
}
function fryerFood(c,type,phase,lift){
  const burnt=phase==='burnt',light=phase==='cooking';
  const places=type==='clams'
    ?[[144,119,.16],[207,107,-.3],[272,120,.4],[336,108,-.3],[365,145,.6],[309,161,-.3],[244,152,.2],[181,164,-.45],[132,155,.35]]
    :[[140,135,-.4],[174,126,.3],[207,141,-.15],[240,125,.25],[274,140,-.3],[307,127,.25],[340,141,-.1],[369,125,.3]];
  for(let i=0;i<places.length;i++){
    const [x,y,a]=places[i];
    if(type==='clams')drawClam(c,x,y-lift,19+(i%3)*2,a,i+7,burnt,light);
    else drawChip(c,x,y-lift,62+(i%3)*7,a,i+31,burnt,light);
  }
}

export function drawFryer(canvas,type,fryer,{time=0,reduced=false}={}){
  const c=prepare(canvas);if(!c)return;
  const phase=fryer?.phase||'empty',foodType=type==='chips'?'chips':'clams';
  const cooking=phase==='cooking',ready=phase==='ready',burnt=phase==='burnt';
  const lift=ready?13:0;
  // Small counter shadow grounds the chunky illustrated machine.
  ellipse(c,260,257,194,15,'#173e431a');
  rounded(c,80,37,360,55,12,PALETTE.steelLight,PALETTE.ink,3);
  rounded(c,98,51,108,27,5,PALETTE.ink);
  c.font='800 11px Arial';c.textAlign='center';c.fillStyle=PALETTE.cream;
  c.fillText(foodType==='clams'?'MARITIME CLAMS':'THICK-CUT CHIPS',152,69);
  ellipse(c,397,65,14,14,'#819f9c',PALETTE.ink,2.5);
  c.strokeStyle=PALETTE.cream;c.lineWidth=3;c.beginPath();c.moveTo(397,65);c.lineTo(402,57);c.stroke();
  ellipse(c,367,65,5,5,burnt?'#e96750':ready?'#6fae78':cooking?'#f0af37':'#6c8887');
  poly(c,[[74,83],[446,83],[463,211],[444,243],[76,243],[57,211]],'#8daaa7',PALETTE.ink,3);
  rounded(c,58,78,405,143,21,'#c9d7cd',PALETTE.ink,3);
  rounded(c,77,91,367,109,17,'#243f3b','#718d85',3);
  const oil=c.createLinearGradient(0,95,0,195);oil.addColorStop(0,burnt?'#654221':'#9c5d22');oil.addColorStop(1,burnt?'#96702c':'#e4a83c');
  rounded(c,88,99,345,94,14,oil,'#f3d27c',2);
  if(cooking&&!reduced){
    for(let i=0;i<22;i++){
      const x=101+seeded(4,i)*315,y=109+seeded(20,i)*71;
      const pulse=(time*1.6+seeded(30,i))%1;
      c.globalAlpha=.75-pulse*.6;ellipse(c,x,y,2+pulse*4,1.5+pulse*2,null,'#ffe4a1',1.6);
    }c.globalAlpha=1;
  }
  // Wire basket lifts from the amber oil when the batch is golden.
  rounded(c,105,96-lift,309,93,13,phase==='empty'?'#b2863b33':null,'#d4d7a7',3);
  mesh(c,109,100-lift,301,83);
  if(phase!=='empty')fryerFood(c,foodType,phase,lift);
  else{
    // Empty means empty: the food badge identifies what this fryer makes.
    c.font='700 12px Arial';c.fillStyle='#ffe5ac';c.textAlign='center';c.fillText('BASKET READY',260,149);
  }
  c.strokeStyle='#e6e2bb';c.lineWidth=5;c.beginPath();c.moveTo(229,186-lift);c.lineTo(229,229-lift);c.lineTo(292,229-lift);c.lineTo(292,186-lift);c.stroke();
  rounded(c,217,225-lift,87,24,8,foodType==='clams'?PALETTE.coral:PALETTE.teal,PALETTE.ink,2.5);
  rounded(c,231,231-lift,58,5,3,'#fff4d852');
  c.strokeStyle='#6c8a84';c.lineWidth=2;c.beginPath();c.moveTo(84,230);c.lineTo(193,230);c.moveTo(328,230);c.lineTo(436,230);c.stroke();
  if(ready){
    const pulse=reduced?1:.8+Math.sin(time*5)*.2;
    c.globalAlpha=pulse;c.strokeStyle='#ffe3a0';c.lineWidth=2.5;
    for(const [x,y] of [[87,89],[434,78],[432,175]]){c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke();}c.globalAlpha=1;
  }
}

export function drawTray(canvas,stock,{time=0,reduced=false}={}){
  const c=prepare(canvas);if(!c)return;
  // The paper boat is lined with a coral gingham sheet, never a seafood shell.
  ellipse(c,260,249,221,17,'#173e431c');
  const boat=[[37,97],[481,97],[453,227],[66,227]];
  poly(c,boat,PALETTE.cream,PALETTE.ink,3);
  c.save();c.beginPath();c.moveTo(...boat[0]);for(const p of boat.slice(1))c.lineTo(...p);c.closePath();c.clip();
  c.fillStyle='#e9675034';
  for(let x=20;x<500;x+=28)c.fillRect(x,97,14,135);
  for(let y=100;y<235;y+=28)c.fillRect(20,y,480,14);
  c.restore();
  poly(c,[[37,97],[66,227],[47,210],[24,114]],'#e3d1aa',PALETTE.ink,2);
  poly(c,[[481,97],[453,227],[473,210],[496,114]],'#e3d1aa',PALETTE.ink,2);
  const clams=clamp(Number(stock?.clams)||0,0,12),chips=clamp(Number(stock?.chips)||0,0,12);
  if(clams){
    const count=Math.min(16,clams*3+1);
    for(let i=0;i<count;i++){
      const x=106+seeded(53,i)*119,y=125+seeded(34,i)*70;
      drawClam(c,x,y,17+seeded(67,i)*7,(seeded(48,i)-.5)*1.9,i+41);
    }
  }else{
    c.font='700 12px Arial';c.fillStyle='#8d7b69';c.textAlign='center';c.fillText('CLAM TRAY',155,155);c.font='12px Arial';c.fillText('waiting for a golden batch',155,176);
  }
  if(chips){
    const count=Math.min(18,chips*3+2);
    for(let i=0;i<count;i++){
      const x=293+seeded(82,i)*119,y=140+seeded(27,i)*49;
      drawChip(c,x,y,47+seeded(39,i)*25,(seeded(93,i)-.5)*1.6,i+80);
    }
  }else{
    c.font='700 12px Arial';c.fillStyle='#8d7b69';c.textAlign='center';c.fillText('CHIP TRAY',365,155);c.font='12px Arial';c.fillText('fresh from the fryer',365,176);
  }
  // Folded front lip and a pair of grease-paper folds.
  poly(c,[[66,208],[453,208],[453,227],[66,227]],'#f7e7c4',PALETTE.ink,2);
  c.strokeStyle='#c4b58f';c.lineWidth=1.5;c.beginPath();c.moveTo(75,215);c.lineTo(111,215);c.moveTo(409,215);c.lineTo(445,215);c.stroke();
  c.font='800 11px Arial';c.textAlign='center';c.fillStyle=PALETTE.ink;c.fillText('HOT. GOLDEN. GONE.',260,222);
}
