import React from 'react';
import {createRoot} from 'react-dom/client';
const planner=new URLSearchParams(location.search).get('mode')==='planner';
const {default:App}=await (planner?import('./Planner.tsx'):import('./Quick.tsx'));
createRoot(document.getElementById('root')!).render(<App/>);
