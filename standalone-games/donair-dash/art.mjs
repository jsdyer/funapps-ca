// Original Canvas artwork. All coordinates are relative to the current viewport.
const C={cream:'#fff2cf',mint:'#8ae5ca',gold:'#ffc85c',coral:'#ff7864'};
function round(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function oval(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=2;c.strokeStyle=stroke;c.stroke();}}
export function topping(c,type,x,y,size=32,rotation=0){
  c.save();c.translate(x,y);c.rotate(rotation);c.scale(size/32,size/32);c.lineJoin='round';
  if(type==='beef'){
    c.fillStyle='#8b4c36';c.strokeStyle='#5b3027';c.lineWidth=2;c.beginPath();c.moveTo(-27,-7);c.lineTo(-9,-13);c.lineTo(9,-8);c.lineTo(23,-13);c.lineTo(29,0);c.lineTo(12,10);c.lineTo(-5,6);c.lineTo(-23,13);c.closePath();c.fill();c.stroke();c.strokeStyle='#c38a59';c.lineWidth=3;c.beginPath();c.moveTo(-18,-4);c.lineTo(3,-1);c.lineTo(18,-5);c.moveTo(-13,6);c.lineTo(6,3);c.stroke();
  }else if(type==='tomato'){
    oval(c,0,0,26,20,'#e7544a','#a13b3e');oval(c,0,0,21,15,'#ff8170');
    for(let a=0;a<Math.PI*2;a+=Math.PI/3){c.save();c.rotate(a);oval(c,11,0,4,2,'#ffe2a0');c.restore();}oval(c,0,0,5,4,'#f9c5a1');
  }else if(type==='onion'){
    c.lineWidth=5;c.strokeStyle='#d6b4e9';c.beginPath();c.ellipse(-4,0,21,15,-.15,0,Math.PI*2);c.stroke();c.strokeStyle='#9b73ba';c.lineWidth=2;c.beginPath();c.ellipse(-4,0,25,19,-.15,0,Math.PI*2);c.stroke();c.strokeStyle='#eee1f5';c.lineWidth=4;c.beginPath();c.ellipse(7,4,17,12,.2,0,Math.PI*2);c.stroke();
  }else if(type==='sauce'){
    c.fillStyle='#fff2cf';c.strokeStyle='#cbbda0';c.lineWidth=2;c.beginPath();c.moveTo(0,-25);c.bezierCurveTo(1,-12,18,-4,18,7);c.bezierCurveTo(18,26,-18,26,-18,7);c.bezierCurveTo(-18,-4,-2,-14,0,-25);c.fill();c.stroke();c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-9,6);c.quadraticCurveTo(-12,14,-3,16);c.stroke();
  }else if(type==='lettuce'){
    c.fillStyle='#78bd66';c.strokeStyle='#3c774a';c.lineWidth=2;c.beginPath();c.moveTo(-25,2);c.bezierCurveTo(-36,-8,-18,-23,-9,-16);c.bezierCurveTo(0,-31,17,-20,17,-12);c.bezierCurveTo(33,-17,33,6,23,11);c.bezierCurveTo(18,27,-2,20,-9,17);c.bezierCurveTo(-30,24,-35,10,-25,2);c.fill();c.stroke();c.strokeStyle='#c4e79c';c.beginPath();c.moveTo(-10,19);c.lineTo(9,-15);c.moveTo(-3,8);c.lineTo(-18,-4);c.moveTo(2,0);c.lineTo(21,-3);c.stroke();
  }else{
    c.fillStyle='#f6c559';c.strokeStyle='#bb883c';c.lineWidth=2;
    for(let i=0;i<3;i++){c.save();c.translate(i*12-12,0);c.rotate((i-1)*.35);c.beginPath();c.ellipse(0,0,10,24,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#e0ac42';for(let j=-12;j<=12;j+=8){c.beginPath();c.moveTo(-6,j);c.lineTo(6,j);c.stroke();}c.restore();}
  }c.restore();
}
export function pita(c,x,y,stack,scale=1){
  c.save();c.translate(x,y);c.scale(scale,scale);oval(c,0,19,64,10,'#08132055');
  oval(c,0,2,61,21,'#b27e4c','#6f503d');oval(c,0,-1,60,21,'#efd091','#c39358');oval(c,0,-2,50,14,'#d9ad6e');
  for(let i=0;i<stack.length;i++)topping(c,stack[i],(i%2?6:-4),-8-i*7,26,.09*(i-1));
  c.fillStyle='#f4dbab';c.strokeStyle='#c79865';c.lineWidth=2;c.beginPath();c.moveTo(-60,0);c.quadraticCurveTo(0,28,60,0);c.quadraticCurveTo(41,34,0,33);c.quadraticCurveTo(-43,33,-60,0);c.fill();c.stroke();
  [[-38,13],[-20,23],[6,18],[28,14],[35,24],[-7,27]].forEach(([a,b],i)=>oval(c,a,b,3+i%2,1.5,'#cf9d64'));
  c.restore();
}
function scenery(c,w,h){
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#253654');sky.addColorStop(1,'#344b5c');c.fillStyle=sky;c.fillRect(0,0,w,h);
  // View across the harbour: moon, windows, and a row of narrow houses.
  const wy=h*.13,wh=h*.48;
  round(c,28,wy,w-56,wh,6,'#14253d','#4d6677');
  oval(c,w*.82,wy+wh*.2,17,17,'#f6dfa0');oval(c,w*.83+5,wy+wh*.17,16,16,'#14253d');
  for(let i=0;i<22;i++){const sx=45+((i*89)%Math.max(70,w-92)),sy=wy+12+(i*17)%(wh*.47);c.fillStyle=i%3?'#7e99b2':'#e3cda2';c.fillRect(sx,sy,1.5,1.5);}
  const colors=['#3a5e68','#675760','#52676b','#6a5a4b','#4d626c','#61556a','#45605f'];
  const houseW=(w-66)/7;
  for(let i=0;i<7;i++){let x=34+i*houseW,y=wy+wh*.53+(i%3)*12,hh=wy+wh-y;c.fillStyle=colors[i];c.fillRect(x,y,houseW-4,hh);c.beginPath();c.moveTo(x-3,y);c.lineTo(x+houseW/2-2,y-25);c.lineTo(x+houseW,y);c.closePath();c.fill();c.fillStyle='#14253d';c.fillRect(x+houseW*.39,y+hh*.65,houseW*.22,hh*.35);for(let j=0;j<4;j++){c.fillStyle=(i+j)%3?'#e4b96799':'#182c43';c.fillRect(x+houseW*(j%2?.60:.15),y+14+Math.floor(j/2)*30,houseW*.2,17);}}
  c.fillStyle='#101d33';c.fillRect(26,wy+wh-6,w-52,10);c.fillStyle='#465e70';c.fillRect(w/2-3,wy,6,wh);c.fillRect(28,wy+wh*.45,w-56,5);
  // Tiled wall and checkerboard counter.
  c.fillStyle='#284252';c.fillRect(0,h*.66,w,h*.34);c.strokeStyle='#3b5560';c.lineWidth=1;for(let x=0;x<w;x+=48){c.beginPath();c.moveTo(x,h*.66);c.lineTo(x,h);c.stroke();}for(let y=h*.66;y<h;y+=36){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  c.fillStyle='#d7c9ad';c.fillRect(0,h*.91,w,h*.09);c.fillStyle='#223445';for(let i=0;i<w/18;i++)if(i%2===0)c.fillRect(i*18,h*.91,18,9);c.fillStyle='#a18c76';c.fillRect(0,h*.91+10,w,3);
  // Lamps and the little sign stay outside the busy falling path.
  for(const x of [w*.10,w*.90]){c.strokeStyle='#0b172a';c.lineWidth=3;c.beginPath();c.moveTo(x,0);c.lineTo(x,h*.075);c.stroke();c.fillStyle='#bfa56c';c.beginPath();c.moveTo(x-20,h*.095);c.lineTo(x-10,h*.065);c.lineTo(x+10,h*.065);c.lineTo(x+20,h*.095);c.closePath();c.fill();}
  round(c,w/2-65,h*.68,130,25,4,'#182e40','#59747b');c.fillStyle='#a3c9bb';c.textAlign='center';c.font='700 10px Arial';c.fillText('EXTRA SAUCE, ALWAYS',w/2,h*.68+16);
}
export function render(c,w,h,state,{time=0,reduced=false,particles=[]}={}){
  c.clearRect(0,0,w,h);scenery(c,w,h);
  const s=Math.min(w/650,1.16),needed=state.recipe[state.recipeIndex];
  const items=state.status==='ready'?[{type:'tomato',x:.13,y:.37,spin:.2},{type:'onion',x:.88,y:.49,spin:-.2},{type:'beef',x:.74,y:.20,spin:.1},{type:'sauce',x:.25,y:.66,spin:0}]:state.items;
  for(const item of items){const x=item.x*w,y=item.y*h; c.save();c.translate(x,y);let bob=state.status==='ready'&&!reduced?Math.sin(time*1.5+item.x*4)*5:0;c.translate(0,bob);
    if(item.type===needed&&state.status==='playing'){oval(c,0,3,38*s,30*s,'#8ae5ca1c');c.strokeStyle='#8ae5ca77';c.lineWidth=1.5;c.beginPath();c.ellipse(0,3,38*s,30*s,0,0,Math.PI*2);c.stroke();}
    topping(c,item.type,0,0,28*s,reduced?0:(item.spin||0));c.restore();
  }
  pita(c,state.playerX*w,h*.84,state.status==='ready'?['beef','tomato','onion','sauce']:state.stack,s);
  if(state.status==='playing'){c.fillStyle='#e2d1aa99';c.textAlign='center';c.font='700 10px Arial';c.fillText('YOUR PITA',state.playerX*w,h*.84+48*s);}
  if(!reduced)for(const p of particles){c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.color;c.beginPath();c.arc(p.x*w,p.y*h,p.size,0,Math.PI*2);c.fill();}c.globalAlpha=1;
}
