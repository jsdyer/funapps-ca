export const MENU = {
  coffee:{id:'coffee',en:'Coffee',fr:'Un café'},
  bread:{id:'bread',en:'Bread',fr:'Du pain'},
  soup:{id:'soup',en:'Soup',fr:'Une soupe'},
  water:{id:'water',en:'Water',fr:'De l’eau'},
  cake:{id:'cake',en:'Cake',fr:'Une part de gâteau'},
  bill:{id:'bill',en:'The bill',fr:'L’addition'}
};
const please=id=>`${MENU[id].fr}, s’il vous plaît.`;
const pleaseEnglish=id=>`${MENU[id].en}, please.`;
const want=id=>`Je voudrais ${MENU[id].fr.toLowerCase()}.`;
const wantEnglish=id=>`I’d like ${MENU[id].en.toLowerCase()}.`;
export const REQUESTS = [
  {item:'coffee',choices:['bread','coffee','soup'],kind:'please',chapter:'Start with a little please',server:'Bonjour! Vous désirez?',translation:'Hello! What would you like?',reply:'Bien sûr! Voici votre café.',replyEnglish:'Of course! Here is your coffee.'},
  {item:'bread',choices:['bread','water','cake'],kind:'please',chapter:'One more with “please”',server:'Et avec ça?',translation:'And with that?',reply:'Voilà votre pain. Bon appétit!',replyEnglish:'Here is your bread. Enjoy!'},
  {item:'soup',choices:['coffee','soup','bread'],kind:'want',chapter:'Try “I would like…”',server:'Pour le repas?',translation:'What would you like to eat?',reply:'Une soupe, très bien!',replyEnglish:'A soup, very good!'},
  {item:'water',choices:['cake','coffee','water'],kind:'please',chapter:'Something to drink',server:'Vous voulez autre chose à boire?',translation:'Would you like anything else to drink?',reply:'Un verre d’eau, avec plaisir.',replyEnglish:'A glass of water, with pleasure.'},
  {item:'cake',choices:['cake','water','bread'],kind:'want',chapter:'A little dessert',server:'Un dessert?',translation:'Would you like dessert?',reply:'Voici votre gâteau!',replyEnglish:'Here is your cake!'},
  {item:'bill',choices:['water','bill','coffee'],kind:'please',chapter:'Finish with a useful phrase',server:'Tout s’est bien passé?',translation:'Was everything good?',reply:'Voici l’addition. Merci et bonne journée!',replyEnglish:'Here is the bill. Thank you and have a good day!'}
];
export function optionsFor(step){
  const request=REQUESTS[step];if(!request)return [];
  return request.choices.map(id=>({id,fr:request.kind==='want'?want(id):please(id),en:request.kind==='want'?wantEnglish(id):pleaseEnglish(id)}));
}
export function initialVisit(){return{status:'ready',step:0,score:0,ordered:[],mistakes:0,attempts:0,delivery:0,shownItem:null,correct:false,feedback:'You’re the customer. Choose what to say.',reply:'Bonjour! Bienvenue!',replyEnglish:'Hello! Welcome!'};}
export function beginVisit(){return{...initialVisit(),status:'playing',reply:REQUESTS[0].server,replyEnglish:REQUESTS[0].translation};}
export function choosePhrase(s,id){
  if(s.status!=='playing'||s.delivery>0)return s;
  const request=REQUESTS[s.step];if(!request||!request.choices.includes(id))return s;
  if(id!==request.item)return{...s,attempts:s.attempts+1,mistakes:s.mistakes+1,shownItem:id,correct:false,reply:`${MENU[id].fr}?`,replyEnglish:`That means ${MENU[id].en.toLowerCase()}.`,feedback:`You wanted ${MENU[request.item].en.toLowerCase()}. Have another try!`};
  return{...s,attempts:s.attempts+1,score:s.score+100,ordered:[...s.ordered,id],shownItem:id,correct:true,delivery:1.35,reply:request.reply,replyEnglish:request.replyEnglish,feedback:'That’s it! Your order is on its way.'};
}
export function tickVisit(s,dt){
  if(s.status!=='playing'||s.delivery<=0||!Number.isFinite(dt)||dt<=0)return s;
  const delivery=Math.max(0,s.delivery-Math.min(.1,dt));
  if(delivery>1e-8)return{...s,delivery};
  if(s.step===REQUESTS.length-1)return{...s,status:'finished',delivery:0,feedback:'You ordered your whole meal in French!'};
  const step=s.step+1;return{...s,step,delivery:0,shownItem:null,correct:false,reply:REQUESTS[step].server,replyEnglish:REQUESTS[step].translation,feedback:step===2?'Try without English, or switch English help on.':'Choose the phrase for your next request.'};
}
export function pauseVisit(s){return s.status==='playing'?{...s,status:'paused'}:s;}
export function resumeVisit(s){return s.status==='paused'?{...s,status:'playing'}:s;}
