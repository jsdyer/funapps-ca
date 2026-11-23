import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,initialBoard,simulate,rotate,hint,ports,stars,type Level} from './engine.ts';

test('All six designed charts solve with exact target allocations and no lost water',()=>{
 assert.equal(LEVELS.length,6);
 for(const l of LEVELS){const b=Object.fromEntries(l.tiles.map(t=>[t.id,t.solution]));const f=simulate(l,b);assert.equal(f.won,true,l.title);assert.deepEqual(f.delivered,l.goals.map(g=>g.need));assert.equal(f.spill+f.trapped,0);assert.equal(f.delivered.reduce((a,b)=>a+b,0),12);assert.equal(simulate(l,initialBoard(l)).won,false,l.title+' starts as a puzzle');}
});
test('First chart is solved by rotating B2 once and C3 once',()=>{
 const l=LEVELS[0];let b=initialBoard(l);b=rotate(l,b,5);assert.equal(simulate(l,b).won,false);b=rotate(l,b,10);assert.equal(simulate(l,b).won,true);assert.equal(l.par,2);
});
test('Rotation is immutable, wraps correctly and leaves fixed or missing channels alone',()=>{
 const l=LEVELS[0],b=initialBoard(l),before=structuredClone(b);let n=b;for(let i=0;i<4;i++)n=rotate(l,n,5);assert.deepEqual(n,b);assert.deepEqual(b,before);assert.equal(rotate(l,b,l.source),b);assert.equal(rotate(l,b,999),b);assert.deepEqual(ports('bend',1),[1,2]);assert.deepEqual(ports('split',3),[0,1,3]);
});
test('Preview conserves all water for hundreds of scrambled orientations',()=>{
 for(const l of LEVELS)for(let seed=0;seed<80;seed++){const b=Object.fromEntries(l.tiles.map(t=>[t.id,(seed*(t.id+3)+t.id)%4]));const f=simulate(l,b);assert.equal(f.delivered.reduce((a,b)=>a+b,0)+f.spill+f.trapped,l.water);assert.ok(f.delivered.every(n=>Number.isInteger(n)&&n>=0));}
});
test('Chart hints make steady progress to a known valid arrangement',()=>{
 for(const l of LEVELS){let b=initialBoard(l);for(let i=0;i<=l.tiles.length;i++){const h=hint(l,b);if(!h)break;assert.notDeepEqual(h.board,b);b=h.board;}assert.equal(simulate(l,b).won,true,l.title);assert.equal(hint(l,b),null);}
});
test('A looping channel network terminates and accounts for trapped water',()=>{
 const l:Level={title:'loop',note:'',letter:'',width:2,height:2,source:0,water:12,par:0,goals:[],tiles:[{id:0,x:0,y:0,kind:'split',solution:0,initial:0,fixed:false},{id:1,x:1,y:0,kind:'bend',solution:2,initial:2,fixed:false},{id:2,x:0,y:1,kind:'bend',solution:0,initial:0,fixed:false},{id:3,x:1,y:1,kind:'bend',solution:3,initial:3,fixed:false}]};
 const f=simulate(l,initialBoard(l));assert.equal(f.trapped,6);assert.equal(f.spill,6);assert.equal(f.won,false);
});
test('Malformed orientation safely spills instead of producing invalid allocations',()=>{
 const l=LEVELS[0],b=initialBoard(l);for(const bad of [-1,5,NaN,.5]){const f=simulate(l,{...b,[l.source]:bad});assert.equal(f.spill,12);assert.equal(f.won,false);}
});
test('Medals reward efficient unaided play while preserving a finish with hints',()=>{
 const l=LEVELS[0];assert.equal(stars(l,2,0),3);assert.equal(stars(l,4,1),2);assert.equal(stars(l,20,5),1);
});
