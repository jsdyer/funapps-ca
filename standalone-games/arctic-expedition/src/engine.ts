export type Location = {id:string;name:string;kind:'base'|'camp'|'survey'|'postcard';x:number;y:number;terrain:string;title:string;description:string;note:string};
export const locations:Location[]=[
{id:'base',name:'Harbour base',kind:'base',x:475,y:550,terrain:'coast',title:'A familiar bit of shoreline',description:'A radio, a warm bunk, and the sea. Your expedition begins and ends here.',note:'Salt air at both ends of the journey. Some things travel well.'},
{id:'shelter',name:'Canvas shelter',kind:'camp',x:475,y:395,terrain:'plain',title:'A little shelter goes a long way',description:'A camp already set up by the research team. Rest here, or use it as a sheltered overnight stop.',note:'It is no kitchen party, but a warm mug still improves the conversation.'},
{id:'lake',name:'Mirror lake',kind:'postcard',x:245,y:465,terrain:'lake',title:'A sky caught in still water',description:'An optional landscape stop. Spend an action to add a lake sketch to your journal.',note:'No tide to wait for here. Just a very patient reflection.'},
{id:'upland',name:'Tundra garden',kind:'survey',x:250,y:285,terrain:'tundra',title:'Small things in a big landscape',description:'Record the tiny patches of plant life from the marked observation point. One of your three research stops.',note:'Back home, the spruce get all the attention. Up here, you learn to look closer.'},
{id:'station',name:'Weather ridge',kind:'survey',x:475,y:220,terrain:'mountain',title:'Read what the sky is saying',description:'Check the team’s weather instrument and record its fictional readings. One of your three research stops.',note:'You knew the Atlantic could change its mind. This sky has its own opinions.'},
{id:'ridge',name:'Glacier lookout',kind:'survey',x:700,y:380,terrain:'glacier',title:'A slow river of ice',description:'Make a landscape observation from the established lookout. One of your three research stops.',note:'You brought a notebook. The view really called for a bigger notebook.'},
{id:'fjord',name:'Quiet inlet',kind:'postcard',x:705,y:205,terrain:'coast',title:'A small movement across the water',description:'An optional quiet observation stop. Add a distant seabird sighting to your journal without approaching it.',note:'A seabird over cold water. For a moment, the north feels a little like home.'}
];
export const edges=[['base','shelter'],['base','lake'],['lake','upland'],['upland','shelter'],['upland','station'],['station','shelter'],['station','ridge'],['station','fjord'],['ridge','shelter'],['ridge','fjord']];
export const weather=[
{name:'Clear horizon',icon:'☀',cold:1,night:1,detail:'Gentle travel conditions. Every move uses 1 warmth.'},
{name:'Sea fog',icon:'≋',cold:2,night:2,detail:'The coast disappears into grey. Every move uses 2 warmth.'},
{name:'Blue-sky break',icon:'☀',cold:1,night:1,detail:'A good day to cover some ground. Every move uses 1 warmth.'},
{name:'Crosswind',icon:'↝',cold:2,night:2,detail:'A bracing stretch of weather. Every move uses 2 warmth.'},
{name:'Snow flurries',icon:'✳',cold:2,night:3,detail:'Sheltered nights are especially useful. Moves use 2 warmth.'},
{name:'A clear way home',icon:'☀',cold:1,night:1,detail:'The last day of your survey window. Bring your notes home.'}
];
export const required=['upland','station','ridge'];
export const place=(id:string)=>locations.find(n=>n.id===id)!;
export const adjacent=(id:string)=>edges.filter(e=>e.includes(id)).map(e=>e[0]===id?e[1]:e[0]);
export type State={at:string;day:number;actions:number;energy:number;warmth:number;rations:number;kits:number;camps:string[];observations:string[];visited:string[];journal:string[];status:'ready'|'active'|'won'|'ended';message:string;reason:string};
export const initialState=():State=>({at:'base',day:1,actions:3,energy:10,warmth:10,rations:8,kits:2,camps:['base','shelter'],observations:[],visited:['base'],journal:['Harbour base · A Maritimer heads north. Good mittens packed, notebook open.'],status:'ready',message:'Choose a connected trail. The map shows every route.',reason:''});
export function start(s:State):State{return s.status==='ready'?{...s,status:'active'}:s}
function validate(s:State):State{
 if(s.energy<=0)return {...s,status:'ended',reason:'Your energy ran out. The team calls the trip early.',message:'A safe return is arranged. Your next expedition can use more rest stops.'};
 if(s.warmth<=0)return {...s,status:'ended',reason:'Your warmth ran out. The team calls the trip early.',message:'A safe return is arranged. Try a camp before the colder stretch.'};
 return s;
}
export const currentWeather=(s:State)=>weather[s.day-1];
export function moveReason(s:State,id:string):string{
 if(s.status!=='active')return 'Start an expedition first.';
 if(s.actions<1)return 'Your three actions are used. Make camp for the night.';
 if(!adjacent(s.at).includes(id))return 'Choose a connected trail.';
 return '';
}
export function move(s:State,id:string):State{
 const why=moveReason(s,id);if(why)return {...s,message:why};
 return validate({...s,at:id,actions:s.actions-1,energy:s.energy-2,warmth:s.warmth-currentWeather(s).cold,visited:s.visited.includes(id)?s.visited:[...s.visited,id],message:`Arrived at ${place(id).name}. ${place(id).description}`,journal:[`${place(id).name} · Arrived on day ${s.day}.`,...s.journal]});
}
export type Action='observe'|'camp'|'rest';
export function actionReason(s:State,a:Action):string{
 if(s.status!=='active')return 'The expedition is not active.';
 if(s.actions<1)return 'No actions remain today.';
 if(a==='observe')return !['survey','postcard'].includes(place(s.at).kind)?'No observation to record here.':s.observations.includes(s.at)?'Already in your notebook.':'';
 if(a==='camp')return s.camps.includes(s.at)?'A camp is already here.':s.kits<1?'Both camp kits are deployed.':s.rations<1?'A camp setup needs one ration.':'';
 return s.rations<1?'Rest needs one ration.':s.energy===10&&s.warmth===10?'You are fully rested and warm.':'';
}
export function act(s:State,a:Action):State{
 const why=actionReason(s,a);if(why)return {...s,message:why};
 const n={...s,actions:s.actions-1};
 if(a==='observe'){n.energy--;n.warmth--;n.observations=[...s.observations,s.at];n.journal=[`${place(s.at).name} · ${place(s.at).note}`,...s.journal];n.message=`Recorded: ${place(s.at).name}. ${place(s.at).note}`;}
 if(a==='camp'){n.kits--;n.rations--;n.camps=[...s.camps,s.at];n.message='Camp established. Future rests and nights here restore more energy and warmth.';n.journal=[`${place(s.at).name} · A small camp, ready for a quieter night.`,...s.journal];}
 if(a==='rest'){const amount=s.camps.includes(s.at)?5:3;n.rations--;n.energy=Math.min(10,s.energy+amount);n.warmth=Math.min(10,s.warmth+amount);n.message=`${s.camps.includes(s.at)?'Sheltered':'Trailside'} rest: up to +${amount} energy and warmth. One ration used.`;}
 return validate(n);
}
export function night(s:State):State{
 if(s.status!=='active')return s;
 if(s.day>=6)return {...s,status:'ended',reason:'The six-day survey window has closed.',message:'Your team heads home. Try a shorter route or save an optional stop for another expedition.'};
 if(s.rations<1)return {...s,status:'ended',reason:'Your last ration has been used.',message:'The expedition ends early. Pack your route around fewer overnight stops next time.'};
 const sheltered=s.camps.includes(s.at),n={...s,day:s.day+1,actions:3,rations:s.rations-1,energy:Math.min(10,s.energy+(sheltered?5:3)),warmth:sheltered?Math.min(10,s.warmth+5):s.warmth-currentWeather(s).night,message:sheltered?'A sheltered night. Energy and warmth restored by up to five.':'An exposed night. Energy restored by up to three; warmth falls with the weather.'};
 return validate(n);
}
export const complete=(s:State)=>required.every(id=>s.observations.includes(id));
export function finish(s:State):State{
 if(s.status!=='active'||s.at!=='base'||!complete(s))return {...s,message:'Return to Harbour base with all three research observations.'};
 return {...s,status:'won',message:'Notebook full. Team home. A very good expedition.'};
}
export const points=(s:State)=>required.filter(id=>s.observations.includes(id)).length*250+s.observations.filter(id=>!required.includes(id)).length*150+(s.status==='won'?300:0)+(6-s.day)*45+s.energy*8+s.warmth*8+s.rations*15;
