import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,TIDES,initialState,connections,move,shortestSolution,stars} from '../web/engine.js';
for (const level of LEVELS) {
  test(`${level.name}: the par route completes every delivery and returns home`,()=>{
    let state=initialState(level);
    const solution=shortestSolution(level);
    assert.ok(solution,'Every authored round must be solvable');
    assert.equal(solution.length,level.par,'The three-lantern target is achievable');
    for(const action of solution){const before=structuredClone(state);state=move(level,state,action);assert.equal(state.turn,before.turn+1);}
    assert.equal(state.status,'won');
    assert.equal(state.at,level.start);
    assert.ok(state.cargo.every(x=>x===2));
    assert.equal(stars(level,state),3);
  });
}
test('flooded or unconnected crossings leave the state unchanged',()=>{
  const l=LEVELS[0],s={...initialState(l),phase:3};
  assert.equal(move(l,s,'g'),s);
  assert.equal(move(l,s,'b'),s);
  assert.equal(move(l,s,'nonexistent'),s);
});
test('waiting progresses the tide exactly once and wraps to low water',()=>{
  const l=LEVELS[0],s={...initialState(l),phase:5};
  const n=move(l,s,'wait');
  assert.equal(n.at,s.at);assert.equal(n.phase,0);assert.equal(n.turn,1);assert.deepEqual(n.cargo,s.cargo);
});
test('automatic loading, delivery, and return-home condition',()=>{
  const l=LEVELS[0];let s=initialState(l);
  assert.deepEqual(s.cargo,[1]);
  s=move(l,s,'g');s=move(l,s,'b');
  assert.deepEqual(s.cargo,[2]);assert.equal(s.status,'playing');
  s=move(l,s,'g');s=move(l,s,'wait');s=move(l,s,'wait');s=move(l,s,'h');
  assert.equal(s.status,'won');
});
test('a last-turn arrival wins before deadline failure',()=>{
  const l={...LEVELS[0],limit:6};let s=initialState(l);
  for(const action of shortestSolution(l))s=move(l,s,action);
  assert.equal(s.turn,6);assert.equal(s.status,'won');
});
test('deadline stops the round and cannot be bypassed',()=>{
  const l=LEVELS[0];let s=initialState(l);
  for(let i=0;i<l.limit;i++)s=move(l,s,'wait');
  assert.equal(s.status,'lost');assert.equal(move(l,s,'wait'),s);assert.equal(shortestSolution(l,s),null);
});
test('all tide phases leave the high bridge open',()=>{
  const l=LEVELS[2];
  for(let phase=0;phase<TIDES.length;phase++)assert.equal(connections(l,{...initialState(l),at:'n',phase}).find(e=>e.to==='b').open,true);
});
test('actions never mutate prior states, allowing reliable undo',()=>{
  const l=LEVELS[0],s=initialState(l),copy=structuredClone(s);
  move(l,s,'g');assert.deepEqual(s,copy);
  const won={...s,status:'won'};assert.equal(move(l,won,'wait'),won);
});
test('hint solver returns a valid recovery route after an unplanned wait',()=>{
  for(const l of LEVELS){let s=move(l,initialState(l),'wait');const route=shortestSolution(l,s);assert.ok(route);for(const action of route)s=move(l,s,action);assert.equal(s.status,'won');}
});
