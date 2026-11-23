import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, curveAt, canPhotograph, takePhoto, continueTour, recover, LENGTH, STOPS, score } from './web/engine.js';

test('the intro and paused tour do not consume daylight or move the car', () => {
  const s = createGame();
  step(s, {}, .05);
  assert.equal(s.z, 0); assert.equal(s.daylight, 330);
  s.status = 'paused'; step(s, { accelerate: true }, .05);
  assert.equal(s.z, 0); assert.equal(s.daylight, 330);
});

test('cruise lets the player travel without holding an accelerator', () => {
  const s = createGame(); s.status = 'driving';
  for(let i = 0; i < 200; i++) step(s, {}, .05);
  assert.ok(s.z > 390); assert.equal(s.speed, 46);
});

test('brake comes to a full stop and photography requires a slow right-side approach', () => {
  const s = createGame(); s.status = 'driving';s.z=STOPS[0].z;s.speed=46;s.x=.65;
  assert.equal(canPhotograph(s), false);
  for(let i=0;i<22;i++) step(s,{brake:true},.05);
  assert.equal(s.speed,0); assert.equal(canPhotograph(s),true);
  s.x=-.5;assert.equal(canPhotograph(s),false);
  s.x=.65;const stop=takePhoto(s);assert.equal(stop.id,STOPS[0].id);
  assert.equal(s.status,'photo');assert.equal(s.photos.length,1);
  assert.equal(takePhoto(s),null); // no duplicated score from a second click
  continueTour(s);assert.equal(s.z,STOPS[0].z+270);assert.equal(s.status,'driving');
});

test('a complete four-postcard tour is achievable before sunset', () => {
  const s=createGame();s.status='driving';
  // Feedback driver uses only the same discrete steering/brake controls as the UI.
  for(let i=0;i<330*60 && s.status==='driving';i++) {
    const stop=STOPS.find(stop=>!s.photos.includes(stop.id) && stop.z+260>s.z);
    const approaching=stop && Math.abs(stop.z-s.z)<210;
    const targetX=approaching?.65:.32;
    const input={left:s.x>targetX+.012,right:s.x<targetX-.012,brake:approaching,accelerate:false};
    step(s,input,1/60);
    if(canPhotograph(s)){takePhoto(s);continueTour(s);}
  }
  assert.equal(s.status,'won');assert.equal(s.photos.length,4);assert.equal(s.z,LENGTH);
  assert.ok(s.comfort>95);assert.ok(s.daylight>70);assert.ok(score(s)>5000);
});

test('missing lookoffs still permits a completed tour', () => {
  const s=createGame();s.status='driving';s.z=LENGTH-1;s.speed=46;
  step(s,{},.05);assert.equal(s.status,'won');assert.equal(s.photos.length,0);
});

test('offroad driving loses comfort and provides checkpoint recovery without losing photos', () => {
  const s=createGame();s.status='driving';s.z=STOPS[0].z;s.x=.65;s.speed=0;
  takePhoto(s);continueTour(s);s.x=1.6;s.comfort=.2;
  step(s,{right:true},.05);assert.equal(s.status,'lost');
  recover(s);assert.equal(s.status,'driving');assert.equal(s.comfort,100);assert.equal(s.daylight,330);
  assert.equal(s.z,STOPS[0].z+270);assert.deepEqual(s.photos,[STOPS[0].id]);assert.equal(s.recovery,true);
});

test('sunset ends the drive and a long hidden-tab frame cannot jump the route', () => {
  const s=createGame();s.status='driving';s.daylight=.01;step(s,{},.05);assert.equal(s.status,'lost');
  const t=createGame();t.status='driving';t.speed=46;step(t,{},60);
  assert.ok(t.z<=3);assert.ok(t.daylight>329);
});

test('physics remain consistent across 30 and 60 fps', () => {
  const run=dt=>{const s=createGame();s.status='driving';s.speed=46;for(let t=0;t<8-1e-8;t+=dt)step(s,{},dt);return s;};
  const a=run(1/30),b=run(1/60);
  assert.ok(Math.abs(a.z-b.z)<.01);assert.ok(Math.abs(a.x-b.x)<.001);assert.ok(Math.abs(a.daylight-b.daylight)<.001);
});

test('lookoff approaches are gentler than highland bends', () => {
  for(const stop of STOPS)assert.ok(Math.abs(curveAt(stop.z))<.2);
});
