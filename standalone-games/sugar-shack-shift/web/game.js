(() => {
  'use strict';
  const $=id=>document.getElementById(id),c=$('board').getContext('2d');
  const winds=[0,2,1,0,1,2,2,0,1,0,2,1],weather=['calm','a breeze','a gust'];
  let turn,heat,syrup,logs,bottles,points;
  function poly(points,fill){c.fillStyle=fill;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function paint(){
    const grad=c.createLinearGradient(0,0,0,400);grad.addColorStop(0,'#e9a26d');grad.addColorStop(.8,'#f4d9a9');c.fillStyle=grad;c.fillRect(0,0,650,400);
    c.fillStyle='#ffe7ac';c.beginPath();c.arc(495,78,38,0,7);c.fill();
    poly([[0,173],[110,102],[252,168],[390,88],[553,147],[650,110],[650,245],[0,245]],'#788974');
    poly([[0,199],[145,151],[305,193],[430,141],[650,170],[650,269],[0,269]],'#466b61');
    c.fillStyle='#ead7ae';c.fillRect(0,246,650,154);
    c.fillStyle='#9b6550';c.fillRect(58,188,238,112);poly([[32,192],[162,116],[317,192]],'#613e36');
    c.fillStyle='#533e32';c.fillRect(86,222,42,78);c.fillStyle='#f2be75';c.fillRect(183,224,58,38);
    c.fillStyle='#533e32';c.fillRect(210,115,17,34);
    for(let i=0;i<3;i++){c.fillStyle='rgba(252,240,208,.72)';c.beginPath();c.ellipse(222+i*12,103-i*16,8+i*3,8,0,0,7);c.fill();}
    c.fillStyle='#443b37';c.fillRect(323,239,249,91);c.fillStyle='#5e5147';c.fillRect(306,225,277,28);
    c.fillStyle=syrup>64?'#ab5124':'#ce8848';c.fillRect(311,226,266,9);
    c.fillStyle='#221f1c';c.fillRect(353,267,92,48);
    for(let i=0;i<Math.ceil(heat/2);i++){const x=360+10*i;poly([[x,310],[x+5,280+(i%3)*5],[x+13,310]],i%2?'#e77836':'#fac467');}
    c.strokeStyle='#fff5d2';c.lineWidth=4;
    for(let i=0;i<Math.ceil(heat/3);i++){const x=360+i*32;c.beginPath();c.moveTo(x,214);c.bezierCurveTo(x-20,200,x+15,195,x,179);c.stroke();}
    c.fillStyle='#eee0bf';c.fillRect(0,351,650,49);c.fillStyle='#4b352c';c.textAlign='center';c.font='bold 19px system-ui';c.fillText('HEAT '+heat+'/12       •       LOGS '+logs+'       •       BOTTLES '+bottles,325,383);
  }
  function update(note){
    const done=turn>=12;$('day').textContent=done?'Shift complete':'Turn '+(turn+1)+' of 12';
    $('reading').textContent=syrup+'/100';$('needle').style.left='calc('+Math.min(100,syrup)+'% - 2px)';
    $('tally').textContent=bottles+' bottled · '+points+' points';$('forecast').textContent=done?'The sugarhouse is closed.':'Next boil: '+weather[winds[turn]]+'. Heat '+heat+'/12. '+logs+' logs left.';
    $('stoke').disabled=done||logs===0;$('simmer').disabled=done;$('draw').disabled=done;
    $('message').textContent=(note||'The first pan is warming. Add a log to get it moving.')+(done?' Shift finished with '+bottles+' bottles and '+points+' points.':'');paint();
  }
  function action(kind){
    if(turn>=12)return;
    let note;
    if(kind==='draw'){
      if(syrup>=65&&syrup<=85){
        bottles++;const grade=30-Math.abs(75-syrup);points+=grade;note='Amber batch bottled for '+grade+' points.';
      }else{note=syrup<65?'Too thin to bottle. Fresh sap goes into the pan.':'The pan ran too dark. Try drawing earlier.';}
      syrup=26;heat=Math.max(1,heat-2);
    }else{
      if(kind==='stoke'){if(!logs)return;logs--;heat=Math.min(12,heat+5);}
      syrup+=Math.max(4,Math.round(heat*2.3));heat=Math.max(1,heat-1-winds[turn]);
      note=syrup>=65&&syrup<=85?'Amber band! Draw now to bottle this batch.':'The pan is at '+syrup+'.';
      if(syrup>95){note='That batch scorched. A fresh pan is on.';syrup=26;heat=2;}
    }
    turn++;update(note);
  }
  ['stoke','simmer','draw'].forEach(k=>$(k).onclick=()=>action(k));
  function reset(){turn=0;heat=3;syrup=30;logs=6;bottles=0;points=0;update();}
  $('reset').onclick=reset;reset();
})();
