import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,travel,act,routes,reason,actionReason,options,score, type State} from './engine.ts';
const shortest=['revelstoke','banff','regina','winnipeg','thunderbay','sudbury','ottawa','montreal','quebec','fredericton','halifax','stjohns'];
function tour(path:string[],collect:string[]) {
 let s:State={...newGame(),status:'active'};
 for(const to of path){
  if(collect.includes(s.location))s=act(s,'postcard');
  const r=routes.find(r=>r.from===s.location&&r.to===to)!;assert.ok(r);
  if(s.energy===0)s=act(s,'rest');
  if(s.condition<r.wear)s=act(s,'repair');
  while(s.fuel<r.fuel){const old=s.fuel;s=act(s,'fuel');assert.ok(s.fuel>old,'Fuel affordable');}
  assert.equal(reason(s,r),'',JSON.stringify({s,r}));s=travel(s,r);
 }
 return s;
}
test('Coast-to-coast main route wins with seven optional postcards and supplies remaining',()=>{
 const s=tour(shortest,['revelstoke','banff','regina','winnipeg','ottawa','quebec','halifax']);
 assert.equal(s.status,'won');assert.equal(s.cards.length,9);assert.ok(s.days>=0);assert.ok(s.money>0);assert.ok(score(s)>1500);
});
test('Longer northern, Toronto, and PEI detours are all viable in one winning trip',()=>{
 const s=tour(['revelstoke','jasper','saskatoon','winnipeg','thunderbay','toronto','ottawa','montreal','quebec','fredericton','charlottetown','halifax','stjohns'],['jasper','toronto','charlottetown']);
 assert.equal(s.status,'won');assert.ok(s.visited.includes('charlottetown'));assert.ok(s.days>0);
});
test('Blocked travel never spends resources or moves the player',()=>{
 let s:State={...newGame(),status:'active',fuel:0};const r=options(s.location)[0];const after=travel(s,r);
 assert.equal(after.location,s.location);assert.equal(after.money,s.money);assert.equal(after.days,s.days);assert.match(after.message,/tank/);
 s={...s,fuel:100,energy:0};assert.match(reason(s,r),/Rest/);
 s={...s,energy:5,condition:0};assert.match(reason(s,r),/Repair/);
 s={...s,condition:100,days:0};assert.match(reason(s,r),/days/);
});
test('Fuel charges only what fits, repair caps, and full supplies cannot be purchased',()=>{
 let s:State={...newGame(),status:'active',fuel:95,condition:80};s=act(s,'fuel');assert.equal(s.fuel,100);assert.equal(s.money,1490);
 const before=s.money;s=act(s,'fuel');assert.equal(s.money,before);
 s=act(s,'repair');assert.equal(s.condition,100);assert.equal(s.days,31);assert.equal(s.money,before-80);
});
test('Postcards cost a day and cannot be farmed repeatedly',()=>{
 let s:State={...newGame(),status:'active',location:'banff'};s=act(s,'postcard');const first=s;
 assert.equal(s.days,31);assert.equal(s.money,1450);assert.ok(s.cards.includes('banff'));
 s=act(s,'postcard');assert.equal(s.cards.length,first.cards.length);assert.equal(s.days,first.days);assert.equal(s.money,first.money);
});
test('Arrival wins on the last day; exhausting days at an intermediate stop ends the trip',()=>{
 let s:State={...newGame(),status:'active',location:'halifax',days:3};s=travel(s,options('halifax')[0]);assert.equal(s.status,'won');assert.equal(s.days,0);
 s={...newGame(),status:'active',days:2};s=travel(s,options('vancouver')[0]);assert.equal(s.status,'ended');assert.equal(s.days,0);
 assert.ok(actionReason(s,'fuel'));assert.ok(reason(s,options(s.location)[0]));
});
