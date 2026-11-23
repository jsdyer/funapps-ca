const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness}=require('./harness.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const exportCode=`globalThis.api={startGame,playGame,setPaused,stopRun,GAMES,state:()=>({S,cur,active,paused,transition}),startRound};`;
const setup=()=>harness(html,exportCode);
test('all ten microgames initialize with keyboard targets or a stage action',()=>{
 for(const id of ['chips','donair','shovel','gulls','cod','moose','timmies','berries','foghorn','flies']){
  const h=setup(),a=h.ctx.api;a.startGame();a.playGame(a.GAMES.find(g=>g.id===id));h.frame(300);const c=a.state().cur;assert.ok(c.actions.length||c.stageAction,id);assert.equal(c.done,false,id);
 }
});
test('pause preserves prompt delay and prevents round expiry',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();h.advance(200);const remaining=a.state().transition.due-1200;a.setPaused(true);h.advance(10000);assert.equal(a.state().cur,null);a.setPaused(false);h.advance(remaining+1);assert.ok(a.state().cur);const round=a.state().cur,elapsed=h.run('performance.now()')-round.t0;a.setPaused(true);h.frame(20000);assert.equal(round.done,false);a.setPaused(false);h.frame(16);assert.equal(round.done,false);assert.equal(h.run('performance.now()')-round.t0,elapsed+16);
});
test('berry taps cannot count one berry twice and paused actions do nothing',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();a.playGame(a.GAMES.find(g=>g.id==='berries'));const c=a.state().cur,action=c.actions[0];const event={stopPropagation(){}};a.setPaused(true);action.run(event);assert.equal(action.target.classList.contains('pick'),false);a.setPaused(false);action.run(event);action.run(event);for(let i=1;i<5;i++)c.actions[i].run(event);assert.equal(c.done,false);c.actions[5].run(event);assert.equal(c.done,true);
});
test('numeric keyboard targets and Space stage actions work; restart cancels prior frame',()=>{
 const h=setup(),a=h.ctx.api;a.startGame();a.playGame(a.GAMES.find(g=>g.id==='cod'));h.event('document:keydown',{code:'Digit1'});assert.equal(a.state().cur.done,true);a.startGame();a.playGame(a.GAMES.find(g=>g.id==='shovel'));for(let i=0;i<10;i++)h.event('document:keydown',{code:'Space',target:h.node('stage')});assert.equal(a.state().cur.done,true);const old=a.state().cur;a.startGame();assert.equal(old.ac.signal.aborted,true);assert.equal(h.rafs.size,0);
});
