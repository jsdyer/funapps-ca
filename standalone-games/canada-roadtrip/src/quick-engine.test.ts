import {test} from 'node:test';import assert from 'node:assert/strict';
import {fresh,advance,snap,viewX,pause,resume,duration,views} from './quick-engine.ts';
test('each view can be photographed once with precise centre timing',()=>{let s=fresh('playing');for(let i=0;i<views.length;i++){s={...s,time:i*4.3+600/175-1.2,cooldown:0};assert.ok(Math.abs(viewX(i,s.time)-500)<.001);s=snap(s);assert.equal(s.cards.length,i+1);assert.equal(s.score,(i+1)*200);s=snap({...s,cooldown:0});assert.equal(s.cards.length,i+1);} });
test('misses do not consume a view or subtract points',()=>{const s=snap(fresh('playing'));assert.equal(s.cards.length,0);assert.equal(s.score,0);});
test('demo cannot earn score and does not run out',()=>{assert.deepEqual(snap(fresh()),fresh());const s=advance({...fresh(),time:duration-.01},.1);assert.equal(s.phase,'demo');assert.ok(s.time<1);});
test('pause freezes simulation and resume preserves progress',()=>{const s={...fresh('playing'),time:8,score:100,cards:[0]};const p=pause(s);assert.deepEqual(advance(p,1),p);assert.deepEqual(snap(p),p);assert.deepEqual(resume(p),s);});
test('large frame gaps are bounded and invalid delta is ignored',()=>{assert.equal(advance(fresh('playing'),100).time,.1);assert.equal(advance(fresh('playing'),NaN).time,0);});
test('trip ends at duration; fresh restart clears score/cards',()=>{const s=advance({...fresh('playing'),time:duration-.05,score:200,cards:[0]},.1);assert.equal(s.phase,'done');assert.equal(s.time,duration);assert.deepEqual(snap(s),s);assert.deepEqual(fresh('playing').cards,[]);});
