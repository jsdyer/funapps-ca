export type Stop = { id:string; name:string; region:string; x:number; y:number; type:'coast'|'mountain'|'prairie'|'city'|'forest'; title:string; detail:string; card:string; cardCost:number };
export const stops:Stop[] = [
{id:'vancouver',name:'Vancouver',region:'British Columbia',x:89,y:300,type:'coast',title:'The Pacific departure',detail:'A thermos, a notebook, and the ocean in your rear-view mirror. The whole country is ahead.',card:'Pacific beginnings',cardCost:0},
{id:'revelstoke',name:'Revelstoke',region:'British Columbia',x:180,y:273,type:'mountain',title:'Between the mountains',detail:'Evergreen slopes frame a mountain-town main street. Stretch your legs before the next pass.',card:'Mountain morning',cardCost:30},
{id:'jasper',name:'Jasper',region:'Alberta',x:231,y:197,type:'mountain',title:'Take the northern branch',detail:'The Rockies deserve more than a glance through the windscreen. A quiet mountain afternoon is on offer.',card:'Rocky Mountain light',cardCost:45},
{id:'banff',name:'Banff',region:'Alberta',x:255,y:290,type:'mountain',title:'A postcard around every bend',detail:'A mountain-town stop trades a little time and money for a memory that lasts.',card:'Peaks & turquoise dreams',cardCost:50},
{id:'saskatoon',name:'Saskatoon',region:'Saskatchewan',x:363,y:221,type:'prairie',title:'Wide sky, river city',detail:'The northern prairie route brings a riverside pause and a sky that seems to go on forever.',card:'Living skies',cardCost:20},
{id:'regina',name:'Regina',region:'Saskatchewan',x:367,y:316,type:'prairie',title:'The prairie rhythm',detail:'Fields give way to a city break. Keep rolling or slow down and find a local lunch.',card:'Prairie picnic',cardCost:25},
{id:'winnipeg',name:'Winnipeg',region:'Manitoba',x:467,y:318,type:'city',title:'Meet in the middle',detail:'Two prairie branches meet here. This is a good place to take stock before the long lakes-and-forest stretch.',card:'Rivers meeting',cardCost:30},
{id:'thunderbay',name:'Thunder Bay',region:'Ontario',x:564,y:306,type:'forest',title:'Along the great lake',detail:'Rock, pine, and blue water. The next choice is a quicker inland line or a city detour to the south.',card:'Superior blue',cardCost:25},
{id:'sudbury',name:'Sudbury',region:'Ontario',x:645,y:323,type:'forest',title:'Shield country',detail:'Northern rock and forest set the pace. The quieter route saves a little time for the Atlantic.',card:'Rock & pine',cardCost:20},
{id:'toronto',name:'Toronto',region:'Ontario',x:660,y:405,type:'city',title:'Trade the trail for the skyline',detail:'The southern detour costs extra time, but the city has its own kind of road-trip energy.',card:'Big-city interlude',cardCost:60},
{id:'ottawa',name:'Ottawa',region:'Ontario',x:725,y:331,type:'city',title:'A capital pause',detail:'A canal-side stroll is a welcome change from the driver’s seat. Québec is just ahead.',card:'Capital afternoon',cardCost:35},
{id:'montreal',name:'Montréal',region:'Québec',x:765,y:312,type:'city',title:'A change of rhythm',detail:'A bakery stop, a neighbourhood walk, and a new page in the notebook.',card:'Bonjour, Montréal',cardCost:45},
{id:'quebec',name:'Québec City',region:'Québec',x:806,y:260,type:'city',title:'Streets worth getting lost in',detail:'The road trip becomes a walking trip for an afternoon. The river carries the eye east.',card:'Old-city wander',cardCost:40},
{id:'fredericton',name:'Fredericton',region:'New Brunswick',x:862,y:323,type:'forest',title:'The Atlantic chapter',detail:'A river-city rest before the final branch: an island detour, or straight on to Nova Scotia.',card:'River-country welcome',cardCost:25},
{id:'charlottetown',name:'Charlottetown',region:'Prince Edward Island',x:919,y:300,type:'coast',title:'The island detour',detail:'Red-earth roads and a slower afternoon. The detour adds a province to your travel journal.',card:'Island time',cardCost:30},
{id:'halifax',name:'Halifax',region:'Nova Scotia',x:912,y:373,type:'coast',title:'Salt on the breeze',detail:'You have reached the Atlantic mainland. Save a little fuel, money, and time for the Newfoundland leg.',card:'Harbour evening',cardCost:35},
{id:'stjohns',name:'St. John’s',region:'Newfoundland & Labrador',x:1034,y:245,type:'coast',title:'An ocean at each end',detail:'You made it. From a Pacific departure to an Atlantic finish, the story is in the stops you chose.',card:'The Atlantic finish',cardCost:0}
];
export type Route = {from:string;to:string;days:number;fuel:number;cost:number;wear:number;label:string};
const r=(from:string,to:string,days:number,fuel:number,cost:number,wear:number,label:string):Route=>({from,to,days,fuel,cost,wear,label});
export const routes:Route[]=[
r('vancouver','revelstoke',2,26,35,9,'Into the mountains'),r('revelstoke','jasper',2,28,35,10,'Northern mountain route'),r('revelstoke','banff',1,22,25,8,'Southern mountain route'),r('jasper','saskatoon',2,30,35,9,'Across the northern prairies'),r('banff','regina',2,32,35,9,'Across the southern prairies'),r('saskatoon','winnipeg',2,30,35,8,'Prairie river route'),r('regina','winnipeg',2,26,30,8,'Straight across the plains'),r('winnipeg','thunderbay',2,30,35,10,'Lakes and forest'),r('thunderbay','sudbury',2,26,35,8,'The northern line'),r('thunderbay','toronto',3,34,55,10,'The big-city detour'),r('sudbury','ottawa',1,20,25,6,'Toward the capital'),r('toronto','ottawa',1,22,35,6,'City to city'),r('ottawa','montreal',1,12,20,5,'Across to Québec'),r('montreal','quebec',1,14,20,5,'Follow the river'),r('quebec','fredericton',2,28,35,9,'Into the Maritimes'),r('fredericton','charlottetown',1,20,35,6,'The island detour'),r('fredericton','halifax',1,22,30,6,'The mainland route'),r('charlottetown','halifax',1,20,30,6,'Back to Nova Scotia'),r('halifax','stjohns',3,30,120,8,'Drive, ferry, and island road')];
export const stopById=(id:string)=>stops.find(s=>s.id===id)!;
export const options=(id:string)=>routes.filter(r=>r.from===id);
export type State={location:string;days:number;fuel:number;money:number;condition:number;energy:number;visited:string[];cards:string[];journal:string[];status:'ready'|'active'|'won'|'ended';message:string};
export const newGame=():State=>({location:'vancouver',days:32,fuel:100,money:1500,condition:100,energy:5,visited:['vancouver'],cards:['vancouver'],journal:['Vancouver · The Pacific departure.'],status:'ready',message:'Choose your first destination. Every route shows its costs before you drive.'});
export const score=(s:State)=>s.cards.length*100+new Set(s.visited.map(id=>stopById(id).region)).size*45+Math.max(0,s.days)*12+Math.floor(s.money/10)+(s.status==='won'?500:0);
export const reason=(s:State,r:Route)=>s.status!=='active'?'Start your trip first.':r.from!==s.location?'That road starts at another stop.':s.days<r.days?'Not enough days for this leg.':s.fuel<r.fuel?'Top up the tank before this leg.':s.money<r.cost?'Not enough money for road costs.':s.condition<r.wear?'Repair the van before this leg.':s.energy<1?'Rest before another drive.':'';
export function travel(s:State,r:Route):State {
 const block=reason(s,r); if(block)return {...s,message:block};
 const dest=stopById(r.to);const won=r.to==='stjohns';
 return {...s,location:r.to,days:s.days-r.days,fuel:s.fuel-r.fuel,money:s.money-r.cost,condition:s.condition-r.wear,energy:s.energy-1,visited:[...s.visited,r.to],cards:won?[...s.cards,'stjohns']:s.cards,journal:[`${dest.name} · ${r.label}.`,...s.journal],status:won?'won':s.days===r.days?'ended':'active',message:won?'Atlantic reached. Your road trip is complete!':`Welcome to ${dest.name}. Collect a postcard, replenish supplies, or choose the next road.`};
}
export type Action='fuel'|'rest'|'repair'|'postcard';
export function actionReason(s:State,a:Action):string {
 if(s.status!=='active')return 'Trip is not active.';
 if(a==='fuel')return s.fuel>=100?'Tank is full.':s.money<Math.min(40,(100-s.fuel)*2)?'Not enough money.':'';
 if(a==='rest')return s.energy>=5?'You are fully rested.':s.days<1?'No days left.':s.money<20?'Not enough money.':'';
 if(a==='repair')return s.condition>=100?'The van needs no repair.':s.days<1?'No days left.':s.money<80?'Not enough money.':'';
 return s.cards.includes(s.location)?'Postcard already collected.':s.days<1?'No days left.':s.money<stopById(s.location).cardCost?'Not enough money.':'';
}
export function act(s:State,a:Action):State{
 const block=actionReason(s,a); if(block)return {...s,message:block};
 const n={...s}; const stop=stopById(s.location);
 if(a==='fuel'){const amount=Math.min(20,100-s.fuel);n.fuel+=amount;n.money-=amount*2;n.message=`Added ${amount} fuel for $${amount*2}.`;}
 if(a==='rest'){n.days--;n.money-=20;n.energy=5;n.message='A quiet night. Ready for five more road legs.';}
 if(a==='repair'){n.days--;n.money-=80;n.condition=Math.min(100,n.condition+50);n.message='The van is ready for more road. Condition restored by up to 50.';}
 if(a==='postcard'){n.days--;n.money-=stop.cardCost;n.cards=[...s.cards,s.location];n.message=`Postcard collected: ${stop.card}.`;n.journal=[`${stop.name} · ${stop.card}.`,...s.journal];}
 if(n.days===0)n.status='ended';
 return n;
}
