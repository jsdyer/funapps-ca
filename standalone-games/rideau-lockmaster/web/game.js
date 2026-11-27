(() => {
  'use strict';
  const $=id=>document.getElementById(id),ctx=$('board').getContext('2d');
  const passages=[
    {name:'Morning at the lower reach',entry:1,exit:3,initial:1},
    {name:'Down to the village wharf',entry:3,exit:0,initial:2},
    {name:'The last evening passage',entry:0,exit:4,initial:3}
  ];
  let level=0,water,boat,gate,steps;
  function draw(){
    const p=passages[level],surface=n=>285-38*n;
    ctx.fillStyle='#b8d8d7';ctx.fillRect(0,0,680,400);
    ctx.fillStyle='#edcb83';ctx.beginPath();ctx.arc(565,70,34,0,7);ctx.fill();
    ctx.fillStyle='#6b978b';ctx.beginPath();ctx.moveTo(0,165);[[110,90],[290,160],[465,92],[590,137],[680,104],[680,290],[0,290]].forEach(([x,y])=>ctx.lineTo(x,y));ctx.fill();
    for(const [x,n,w] of [[0,p.entry,203],[203,water,274],[477,p.exit,203]]){
      const y=surface(n);ctx.fillStyle='#528e91';ctx.fillRect(x,y,w,400-y);ctx.fillStyle='#bfe6d8';ctx.fillRect(x,y,w,5);
      ctx.fillStyle='#81b4b2';for(let k=0;k<3;k++)ctx.fillRect(x+20+35*k,y+22+12*k,24,2);
    }
    [[201,'entry'],[476,'exit']].forEach(([x,name])=>{
      const open=gate===name;ctx.fillStyle='#675741';ctx.fillRect(x-6,open?322:115,12,open?51:258);
      ctx.fillStyle='#f1d9a5';ctx.fillRect(x-9,open?319:111,18,6);
    });
    const x=[95,335,566][boat],y=surface([p.entry,water,p.exit][boat]);
    ctx.fillStyle='#934333';ctx.beginPath();ctx.moveTo(x-47,y-5);ctx.lineTo(x+49,y-5);ctx.lineTo(x+32,y+12);ctx.lineTo(x-32,y+12);ctx.fill();
    ctx.fillStyle='#f9e7b7';ctx.fillRect(x-16,y-26,32,21);ctx.fillStyle='#244e57';ctx.fillRect(x-9,y-22,16,10);
    ctx.fillStyle='#173f48';ctx.fillRect(0,365,680,35);ctx.fillStyle='#ffefcf';ctx.textAlign='center';ctx.font='bold 17px system-ui';
    ['Entry','Chamber','Exit'].forEach((s,i)=>ctx.fillText(s,[95,335,566][i],389));
  }
  function render(note){
    const p=passages[level],done=boat===2,which=boat===0?'entry':'exit',match=water===p[which];
    $('stage').textContent=(level+1)+'/3 · '+p.name;
    $('moves').textContent=steps+' moves · Boat '+['at entry','in chamber','at exit'][boat];
    $('levels').textContent='Entry '+p.entry+' · Chamber '+water+' · Exit '+p.exit;
    $('gate').textContent=gate?'Close '+gate+' gate':'Open '+which+' gate';
    $('fill').disabled=done||!!gate||water===4;$('drain').disabled=done||!!gate||water===0;
    $('gate').disabled=done||(!gate&&!match);
    $('move').disabled=done||gate!==which;
    $('next').hidden=!done;$('next').textContent=level===2?'Play all passages again':'Next passage';
    $('message').textContent=note||(gate?(gate===which?'Gate open. Move the boat through.':'Close the gate behind the boat.'):match?'The water is level. Open the '+which+' gate.':'Match the chamber to level '+p[which]+' to open the '+which+' gate.');
    draw();
  }
  function restart(){water=passages[level].initial;boat=0;gate=null;steps=0;render();}
  $('fill').onclick=()=>{water++;steps++;render();};$('drain').onclick=()=>{water--;steps++;render();};
  $('gate').onclick=()=>{gate=gate?null:(boat===0?'entry':'exit');steps++;render();};
  $('move').onclick=()=>{boat++;steps++;const p=passages[level],best=5+Math.abs(p.initial-p.entry)+Math.abs(p.entry-p.exit);render(boat===2?'Passage complete in '+steps+' moves. Shortest route: '+best+'.':'');};
  $('reset').onclick=restart;$('next').onclick=()=>{level=(level+1)%passages.length;restart();};restart();
})();
