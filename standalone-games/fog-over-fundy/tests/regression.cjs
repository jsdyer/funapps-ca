const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness}=require('./harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const exportCode=`globalThis.api={startGame,togglePause,update,Enemy,Boss,Bullet,player:()=>player,state:()=>({running,paused,choosing,wave,waveTransition,score,keys,touchMove,touchFire,mouse,deferred}),set:(v)=>{if(v.entities)entities=v.entities;if(v.bullets)bullets=v.bullets;if(v.boss!==undefined)boss=v.boss;if(v.wave!==undefined)wave=v.wave;if(v.waveKills!==undefined)waveKills=v.waveKills;if(v.killsNeeded!==undefined)killsNeeded=v.killsNeeded}};`;
const setup=()=>harness(html,exportCode);
test('blocked storage/audio do not prevent start; restart and pause keep one animation loop',()=>{
 const h=setup(),a=h.ctx.api;assert.equal(h.rafs.size,1);a.startGame();a.startGame();a.togglePause();a.togglePause();assert.equal(h.rafs.size,1);assert.equal(a.state().running,true);h.frame(16);assert.equal(h.rafs.size,1);
});
test('aim uses first pointer coordinates; keyboard and cancelled touch clear on pause',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();h.node('game').dispatch('pointerdown',{clientX:750,clientY:150});assert.equal(a.state().mouse.x,750);assert.equal(a.state().mouse.y,150);
 h.event('keydown',{code:'KeyD'});assert.equal(a.state().keys.KeyD,true);a.togglePause();assert.equal(Object.keys(a.state().keys).length,0);assert.equal(a.state().mouse.down,false);a.togglePause();
 h.node('stick').dispatch('pointerdown',{pointerId:8,clientX:600,clientY:270});assert.notEqual(a.state().touchMove.x,0);h.node('stick').dispatch('pointercancel',{pointerId:8});assert.equal(a.state().touchMove.x,0);
 h.node('fireBtn').dispatch('pointerdown');assert.equal(a.state().touchFire,true);h.node('fireBtn').dispatch('lostpointercapture');assert.equal(a.state().touchFire,false);
});
test('piercing flare damages a target once across overlapping frames',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();const e=new a.Enemy('trap',500,300);e.speed=0;e.shootCD=100;const b=new a.Bullet(500,300,0,10,0,3);a.set({entities:[e],bullets:[b]});const hp=e.hp;a.update(.001);a.update(.001);assert.equal(e.hp,hp-10);assert.equal(b.pierce,2);
});
test('boss death advances exactly once after gameplay time and never leaks into restart',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();a.set({wave:4,killsNeeded:10,waveKills:9});const boss=new a.Boss();a.set({boss});boss.kill();const e=new a.Enemy('gull',0,0);e.kill();a.update(.4);assert.equal(a.state().wave,4);a.togglePause();a.update(10);assert.equal(a.state().wave,4);a.togglePause();a.update(.51);assert.equal(a.state().wave,5);assert.equal(a.state().choosing,true);a.startGame();assert.equal(a.state().waveTransition,0);assert.equal(a.state().deferred.length,0);assert.equal(a.state().wave,1);
});
test('touch fire aims toward the closest enemy; blur pauses',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();const p=a.player();const e=new a.Enemy('trap',p.x+100,p.y);e.speed=0;a.set({entities:[e]});h.node('fireBtn').dispatch('pointerdown');a.update(.001);assert.ok(Math.abs(p.angle)<.001);h.event('blur');assert.equal(a.state().paused,true);assert.equal(a.state().touchFire,false);
});
