import test from 'node:test';
import assert from 'node:assert/strict';
import {newReception,startReception,stepReception,togglePause,signalTarget,signalQuality,liveScore,receptionAccuracy,DOT_HOLD,ROUND_SECONDS} from '../web/arcade-engine.js';
test('attract mode never spends time or receives dots',()=>{const s=newReception();assert.equal(stepReception(s,100,{dx:1}),s);assert.equal(s.elapsed,0);});
test('kite steers and stays within the flight area',()=>{let s=startReception();for(let i=0;i<800;i++)s=stepReception(s,.02,{dx:-1,dy:-1});assert.equal(s.x,90);assert.equal(s.y,85);});
test('three held signal locks receive S and finish with a score',()=>{let s=startReception();for(let i=0;i<2000&&s.phase==='playing';i++)s=stepReception(s,.02,{target:signalTarget(s)});assert.equal(s.phase,'won');assert.equal(s.dots,3);assert.ok(s.score>300);assert.ok(s.elapsed<15);assert.equal(stepReception(s,.05),s);});
test('leaving the glow leaks charge but preserves received dots',()=>{let s={...startReception(),dots:1,charge:1,x:90,y:85};s=stepReception(s,.05);assert.equal(s.dots,1);assert.ok(s.charge<1);assert.ok(s.charge>0);});
test('pause freezes the complete simulation and resume continues',()=>{let s=stepReception(startReception(),.05,{dx:1});const elapsed=s.elapsed;s=togglePause(s);assert.equal(s.phase,'paused');assert.equal(stepReception(s,.05,{dx:1}),s);s=togglePause(s);assert.equal(s.phase,'playing');assert.ok(stepReception(s,.05).elapsed>elapsed);});
test('dt is bounded after suspension; invalid dt is ignored',()=>{const s=startReception();assert.equal(stepReception(s,NaN),s);assert.equal(stepReception(s,-4),s);assert.equal(stepReception(s,100).elapsed,.05);});
test('missed reception ends the round and restarting clears progress',()=>{let s={...startReception(),x:90,y:85};for(let i=0;i<1000&&s.phase==='playing';i++)s=stepReception(s,.05,{target:{x:90,y:85}});assert.equal(s.phase,'ended');assert.equal(s.elapsed,ROUND_SECONDS);assert.equal(s.dots,0);const fresh=startReception();assert.equal(fresh.elapsed,0);assert.equal(fresh.dots,0);assert.equal(fresh.charge,0);assert.equal(fresh.score,0);});

function track(offset=0,dt=.02){
 let s=startReception();
 for(let i=0;i<10000&&s.phase==='playing';i++){
  const t=signalTarget({...s,elapsed:s.elapsed+dt});
  s=stepReception(s,dt,{target:{x:t.x+offset,y:t.y}});
 }
 return s;
}
test('central alignment earns substantially more than an equally successful edge reception',()=>{
 const centre=track(),edge=track(80);
 assert.equal(centre.phase,'won');assert.equal(edge.phase,'won');
 assert.equal(centre.dots,3);assert.equal(edge.dots,3);
 assert.ok(centre.score-edge.score>800,`${centre.score} versus ${edge.score}`);
 assert.ok(receptionAccuracy(centre)>90);assert.ok(receptionAccuracy(edge)<25);
 assert.ok(centre.lastDotScore>450);assert.ok(edge.lastDotScore<200);
 assert.ok(centre.score<=1900);assert.ok(edge.score<=1900);
});
test('quality decreases continuously from the centre to the signal boundary',()=>{
 const s=startReception(),t=signalTarget(s);
 assert.equal(signalQuality({...s,x:t.x,y:t.y}),1);
 assert.ok(Math.abs(signalQuality({...s,x:t.x+t.radius/2,y:t.y})-.5)<1e-10);
 assert.ok(signalQuality({...s,x:t.x+t.radius*.8,y:t.y})<.21);
 assert.equal(signalQuality({...s,x:t.x+t.radius+1,y:t.y}),0);
});
test('precision scoring is stable across ordinary frame rates',()=>{
 const at50=track(22,.02),at100=track(22,.01);
 assert.equal(at50.phase,'won');assert.equal(at100.phase,'won');
 assert.ok(Math.abs(at50.score-at100.score)<=6,`${at50.score} versus ${at100.score}`);
 assert.ok(Math.abs(receptionAccuracy(at50)-receptionAccuracy(at100))<=1);
});
test('losing and rebuilding an unfinished signal cannot farm banked points',()=>{
 let s=startReception();
 for(let cycle=0;cycle<3;cycle++){
  for(let i=0;i<75;i++)s=stepReception(s,.02,{target:signalTarget({...s,elapsed:s.elapsed+.02})});
  assert.equal(s.dots,0);assert.equal(s.score,0);assert.ok(liveScore(s)>0);
  for(let i=0;i<300;i++)s=stepReception(s,.02,{target:{x:90,y:85}});
  assert.equal(s.charge,0);assert.equal(s.precision,0);assert.equal(liveScore(s),0);
 }
 assert.equal(s.score,0);assert.equal(s.precisionSum,0);
});
test('paused, finished and reset receptions cannot add precision or points',()=>{
 let s=track();const wonScore=s.score;
 for(let i=0;i<100;i++)s=stepReception(s,.05,{target:signalTarget(s)});
 assert.equal(s.score,wonScore);assert.equal(liveScore(s),wonScore);
 const working={...startReception(),charge:1,precision:.8};const paused=togglePause(working);
 assert.equal(stepReception(paused,.05),paused);assert.equal(liveScore(paused),liveScore(working));
 assert.equal(liveScore({...working,phase:'ended'}),0);
 const reset=startReception();assert.equal(reset.precision,0);assert.equal(reset.precisionSum,0);assert.equal(reset.lastDotScore,0);assert.equal(reset.timeBonus,0);assert.equal(liveScore(reset),0);
});
test('the final scoring step is capped to the remaining dot progress',()=>{
 const initial=startReception(),t=signalTarget({...initial,elapsed:.05});
 const s=stepReception({...initial,x:t.x,y:t.y,charge:DOT_HOLD-.01,precision:DOT_HOLD-.01},.05,{target:t});
 assert.equal(s.dots,1);assert.equal(s.lastDotScore,500);assert.equal(s.score,500);assert.equal(s.charge,0);assert.equal(s.precision,0);
});
