import {createApp} from 'vue';
const planner=new URLSearchParams(location.search).get('mode')==='planner';
if(planner){Promise.all([import('./App.vue'),import('./style.css')]).then(([{default:App}])=>createApp(App).mount('#app'));}
else{import('./QuickPlay.vue').then(({default:App})=>createApp(App).mount('#app'));}
