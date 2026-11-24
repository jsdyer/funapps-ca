export const FOODS = [
  {id:'bread',en:'Bread',fr:'Pain',colour:'#e5a348'},
  {id:'coffee',en:'Coffee',fr:'Café',colour:'#5d456d'},
  {id:'apple',en:'Apple',fr:'Pomme',colour:'#ed6c67'}
];
export const SHIFT_SECONDS = 60;
export function initialCafe() {
  return {status:'ready',remaining:SHIFT_SECONDS,score:0,served:0,missed:0,combo:0,nextId:4,spawnIn:1.8,customers:[
    {id:1,food:'bread',patience:12,maxPatience:12,lane:0},
    {id:2,food:'coffee',patience:13,maxPatience:13,lane:1},
    {id:3,food:'apple',patience:14,maxPatience:14,lane:2}
  ],feedback:'Match the picture. Tap the food.',lastFood:null};
}
export function startCafe(){return {...initialCafe(),status:'playing',feedback:'The café is open!'};}
export function pauseCafe(state){return state.status==='playing'?{...state,status:'paused'}:state;}
export function resumeCafe(state){return state.status==='paused'?{...state,status:'playing'}:state;}
export function serveCafe(state,food){
  if(state.status!=='playing'||!FOODS.some(f=>f.id===food))return state;
  const customer=state.customers.find(c=>c.food===food);
  if(!customer)return {...state,combo:0,lastFood:food,feedback:'Check the order pictures!'};
  const combo=state.combo+1;
  return {...state,customers:state.customers.filter(c=>c.id!==customer.id),combo,score:state.score+100+Math.min(combo-1,10)*10,served:state.served+1,lastFood:food,spawnIn:Math.min(state.spawnIn,.65),feedback:`Merci! +${100+Math.min(combo-1,10)*10}`};
}
export function tickCafe(state,dt,random=.5){
  if(state.status!=='playing'||!Number.isFinite(dt)||dt<=0)return state;
  const elapsed=Math.min(dt,.1,state.remaining);
  const remaining=Math.max(0,state.remaining-elapsed);
  if(remaining<=1e-8)return {...state,remaining:0,status:'finished',feedback:'Merci, neighbour! Your shift is done.'};
  const missed=state.customers.filter(c=>c.patience<=elapsed).length;
  let customers=state.customers.filter(c=>c.patience>elapsed).map(c=>({...c,patience:c.patience-elapsed}));
  let spawnIn=state.spawnIn-elapsed,nextId=state.nextId;
  if(spawnIn<=0&&customers.length<3){
    const lane=[0,1,2].find(i=>!customers.some(c=>c.lane===i));
    const safeRandom=Math.min(.999999,Math.max(0,Number.isFinite(random)?random:.5));
    const patience=11-(SHIFT_SECONDS-remaining)/30;
    customers=[...customers,{id:nextId++,food:FOODS[Math.floor(safeRandom*3)].id,patience,maxPatience:patience,lane}];
    spawnIn=1.65;
  }
  return {...state,remaining,customers,spawnIn,nextId,missed:state.missed+missed,combo:missed?0:state.combo,feedback:missed?'A neighbour had to go. Next order!':state.feedback};
}
