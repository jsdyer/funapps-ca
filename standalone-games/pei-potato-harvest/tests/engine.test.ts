import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, VARIETIES, WEATHER, ORDERS, plant, waterField, refill, compost, harvest, advance, deliver, orderAvailable, ready, expectedYield, result, sellSurplus } from '../src/engine.ts';
import type { State, Variety } from '../src/engine.ts';

test('planting spends exactly one action and leaves the previous state unchanged', () => {
  const s = initialState(), planted = plant(s, 0, 'russet');
  assert.equal(s.fields[0].crop, null); assert.equal(s.actions, 4); assert.equal(planted.actions, 3); assert.equal(planted.cash, 32);
  assert.equal(planted.fields[0].crop?.age, 0); assert.equal(plant(planted, 0, 'gold'), planted);
});
test('work budget and funds cannot go negative; late seeds are rejected', () => {
  let s = initialState();
  for (let i=0;i<4;i++) s = plant(s,i,'red');
  assert.equal(s.actions,0); assert.equal(refill(s), s); assert.equal(waterField(s,0), s);
  s = advance(s); s.cash = 0; s.fields[0].crop=null; assert.equal(plant(s,0,'gold'),s);
  s.cash = 100; s.day=10; assert.equal(plant(s,0,'red'),s);
});
test('forecast applies once per advance, with watering preventing dry stress', () => {
  let s = plant(initialState(), 0, 'gold'); s = advance(s); s = advance(s);
  assert.equal(s.day,3); assert.equal(s.fields[0].moisture,2);
  const dry = advance(s), watered = advance(waterField(s,0));
  assert.equal(dry.fields[0].crop?.health,80); assert.equal(watered.fields[0].crop?.health,100);
  assert.equal(watered.fields[0].moisture,2); assert.equal(watered.actions,4);
});
test('only mature crops can be harvested, grades reflect stress and soil depletes', () => {
  let s = plant(initialState(), 0, 'red'); assert.equal(harvest(s,0),s);
  for (let i=0;i<3;i++) s=advance(s);
  assert.ok(ready(s.fields[0])); assert.deepEqual(expectedYield(s.fields[0]),{regular:0,premium:4});
  s.fields[0].crop!.health=40; const harvested = harvest(s,0);
  assert.equal(harvested.stock.red.regular,2); assert.equal(harvested.stock.red.premium,0); assert.equal(harvested.fields[0].fertility,65);
  assert.equal(harvested.fields[0].crop,null); assert.equal(compost(harvested,0).fields[0].fertility,100);
});
test('orders consume regular crates first, award premium bonus and cannot double-pay', () => {
  let s=initialState(); s.stock.red={regular:2,premium:4}; s=deliver(s,'market');
  assert.deepEqual(s.stock.red,{regular:0,premium:2}); assert.equal(s.cash,82); assert.equal(s.actions,3); assert.equal(deliver(s,'market'),s);
  assert.equal(orderAvailable(s,'chef'),false);
});
test('chef order combines premium varieties without consuming regular stock', () => {
  let s=initialState(); s.stock.red={regular:4,premium:2};s.stock.gold.premium=2;s.stock.russet.premium=3;
  s=deliver(s,'chef'); assert.equal(s.cash,102); assert.equal(s.stock.red.regular,4); assert.equal(s.stock.russet.premium,1);
});
test('ripe crops lose grade after two waiting turns; harvested crates stay safe', () => {
  let s=plant(initialState(),0,'red');for(let i=0;i<3;i++)s=advance(s);
  const h=harvest(s,0); s=advance(s); assert.equal(s.fields[0].crop?.health,80); s=advance(s); assert.equal(s.fields[0].crop?.health,65);
  assert.equal(advance(advance(h)).stock.red.premium,4);
});
test('a weather-aware first season can complete all three community orders', () => {
  let s=initialState();const mix:Variety[]=['red','gold','russet','red'];for(let i=0;i<4;i++)s=plant(s,i,mix[i]);
  while(!s.finished){
    for(let i=0;i<4;i++)if(ready(s.fields[i]))s=harvest(s,i);
    for(const o of ORDERS)if(orderAvailable(s,o.id))s=deliver(s,o.id);
    for(let i=0;i<4;i++)if(s.fields[i].crop && !ready(s.fields[i]) && s.fields[i].moisture+WEATHER[s.day-1].moisture<=0){if(s.water<2)s=refill(s);s=waterField(s,i);}
    s=advance(s);
  }
  assert.equal(result(s).won,true);assert.equal(result(s).core,3);assert.equal(s.premiumHarvested,19);assert.equal(s.day,12);
});
test('season closing sells remaining crates exactly once, blocks further actions and scores failure honestly', () => {
  let s=initialState();s.day=12;s.stock.gold={regular:2,premium:1};s=advance(s);
  assert.equal(s.cash,61);assert.equal(s.finished,true);assert.equal(result(s).won,false);
  for(const next of [advance(s),refill(s),plant(s,0,'red'),waterField(s,0),sellSurplus(s,'gold')])assert.equal(next,s);
});
