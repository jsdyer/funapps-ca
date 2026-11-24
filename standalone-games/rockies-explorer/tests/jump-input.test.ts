import test from 'node:test';import assert from 'node:assert/strict';
import {createJumpInput} from '../src/jump-input.ts';
import {newRun,jump,tickRun,GROUND} from '../src/quick-engine.ts';

test('pointer press launches before release and moves on the very next frame',()=>{
 let state=newRun(),activations=0,prevented=false;
 const input=createJumpInput(()=>{activations++;state=jump(state);});
 input.pointerDown({button:0,isPrimary:true,preventDefault(){prevented=true;}});
 assert.equal(activations,1);assert.equal(state.vy,-650);assert.equal(prevented,true);
 state=tickRun(state,1/60);
 assert.ok(state.y<GROUND-9,'the first rendered frame must already show upward travel');
 // Keeping the mouse/finger down does not hold back the jump or start extra ones.
 for(let i=0;i<59;i++)state=tickRun(state,1/60);
 assert.equal(state.y,GROUND);
 input.click({detail:1});
 assert.equal(activations,1,'release/click must not trigger a second jump');
 assert.equal(state.vy,0);
});

test('focused Space and Enter launch on keydown and suppress release activation',()=>{
 for(const code of ['Space','Enter']){
  let state=newRun(),activations=0,prevented=0;
  const input=createJumpInput(()=>{activations++;state=jump(state);});
  const press={code,repeat:false,preventDefault(){prevented++;}};
  input.keyDown(press);
  assert.equal(activations,1);assert.equal(state.vy,-650);assert.equal(prevented,1);
  state=tickRun(state,1/60);assert.ok(state.y<GROUND-9);
  for(let i=0;i<20;i++)input.keyDown({...press,repeat:true});
  assert.equal(activations,1,'holding a key must not create repeated jumps');
 }
});

test('assistive click activation remains available without pointer events',()=>{
 let state=newRun(),activations=0;
 const input=createJumpInput(()=>{activations++;state=jump(state);});
 input.click({detail:0});
 assert.equal(activations,1);assert.equal(state.vy,-650);
});

test('secondary pointers, non-left buttons and unrelated keys do not activate jump',()=>{
 let activations=0,prevented=0;
 const input=createJumpInput(()=>activations++),preventDefault=()=>{prevented++;};
 input.pointerDown({button:2,isPrimary:true,preventDefault});
 input.pointerDown({button:0,isPrimary:false,preventDefault});
 input.keyDown({code:'Escape',repeat:false,preventDefault});
 input.keyDown({code:'Tab',repeat:false,preventDefault});
 assert.equal(activations,0);assert.equal(prevented,0);
});
