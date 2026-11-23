import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSES,HEADINGS,initialState,preview,sail,wait,solve,stars,coordinate,windAt} from '../src/engine.mjs';

test('every course has a full three-stamp solution within its published par',()=>{
 for(const c of COURSES){const solution=solve(c);assert.ok(solution,c.name);let s=initialState(c);for(const a of solution)s=a.wait?wait(c,s):sail(c,s,a.heading,a.power);assert.equal(s.status,'won',c.name);assert.equal(s.delivered.length,c.stations.length);assert.ok(s.moves<=c.par,c.name);assert.equal(stars(c,s),3);}
});
test('first-course walkthrough delivers two postcards in three sails',()=>{
 const c=COURSES[0];let s=initialState(c);
 for(const [heading,power] of [[2,3],[0,1],[1,3]])s=sail(c,s,heading,power);
 assert.deepEqual([s.x,s.y,s.moves,s.status],[10,2,3,'won']);assert.deepEqual(s.delivered,[0,1]);
});
test('wind is added to heading rather than replacing it',()=>{
 const c=COURSES[0],s=initialState(c);assert.deepEqual(preview(c,s,2,3).target,{x:5,y:6});assert.deepEqual(preview(c,s,0,1).target,{x:2,y:5});
});
test('crossing a blocked square is rejected even with a clear landing',()=>{
 const c={...COURSES[0],start:{x:1,y:3},obstacles:[{x:3,y:3,kind:'marsh'}]};const s=initialState(c),p=preview(c,s,2,3);assert.equal(p.valid,false);assert.match(p.reason,/wet ground/);assert.equal(sail(c,s,2,3),s);assert.equal(s.moves,0);
});
test('out-of-bounds and wind-cancelled sails leave the state unchanged',()=>{
 const c=COURSES[0],s=initialState(c);assert.equal(sail(c,s,6,3),s);assert.equal(sail(c,s,6,1),s);assert.equal(sail(c,s,8,1),s);assert.equal(sail(c,s,2,0),s);assert.equal(sail(c,s,2,1.5),s);
});
test('wait uses one move and advances the forecast without changing position',()=>{
 const c=COURSES[1],s=initialState(c),n=wait(c,s);assert.deepEqual([n.x,n.y],[s.x,s.y]);assert.equal(n.moves,1);assert.notDeepEqual(windAt(c,n),windAt(c,s));assert.equal(s.moves,0);
});
test('deliveries require landing at a station, not crossing it',()=>{
 const c={...COURSES[0],stations:[{x:3,y:6,name:'Between'}],obstacles:[]};const s=sail(c,initialState(c),2,3);assert.deepEqual(s.delivered,[]);
});
test('move budget creates a loss, and ended states reject further input',()=>{
 const c={...COURSES[0],limit:1};const s=wait(c,initialState(c));assert.equal(s.status,'lost');assert.equal(wait(c,s),s);assert.equal(sail(c,s,2,3),s);assert.equal(stars(c,s),0);assert.equal(solve(c,s),null);
});
test('finishing on the last allowed sail is a win, not a loss',()=>{
 const c={...COURSES[0],limit:3};let s=initialState(c);for(const [h,p] of [[2,3],[0,1],[1,3]])s=sail(c,s,h,p);assert.equal(s.status,'won');assert.equal(wait(c,s),s);
});
test('moves are immutable and station deliveries cannot be duplicated',()=>{
 const c=COURSES[0],s=initialState(c),n=sail(c,s,2,3);assert.deepEqual(s.delivered,[]);assert.deepEqual(s.trail,[]);assert.equal(n.delivered.length,1);const again={...n,moves:0,x:1,y:6};assert.equal(sail(c,again,2,3).delivered.length,1);
});
test('coordinate labels match the chart axes',()=>{assert.equal(coordinate({x:0,y:0}),'A1');assert.equal(coordinate({x:11,y:7}),'L8');assert.equal(HEADINGS.length,8);});
