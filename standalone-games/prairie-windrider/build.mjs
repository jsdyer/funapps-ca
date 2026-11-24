import {mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
await rm('web',{recursive:true,force:true});await mkdir('web/vendor',{recursive:true});
for(const file of ['index.html','planner.html','style.css','game.js','engine.mjs','quick.css','quick.js','quick-engine.mjs'])await copyFile('src/'+file,'web/'+file);
await copyFile('node_modules/p5/lib/p5.esm.js','web/vendor/p5.esm.js');
const license=await readFile('node_modules/p5/license.txt','utf8');
await writeFile('web/THIRD-PARTY-LICENSES.txt','Prairie Windrider uses p5.js version 2.4.0.\nUpstream: https://github.com/processing/p5.js/tree/v2.4.0\nPackage: https://www.npmjs.com/package/p5/v/2.4.0\nCopyright p5.js contributors. Licensed under GNU LGPL 2.1.\n\nThe complete, unminified upstream ESM distribution is provided separately at vendor/p5.esm.js. It is directly imported by the application, may be replaced with a compatible modified version, and retains upstream dependency notices in its source. The application source and build instructions are maintained in the FunApps repository. No p5 library modifications have been made.\n\n'+license);
const library=await readFile('web/vendor/p5.esm.js','utf8');if(/^import\s/m.test(library))throw Error('Unexpected unresolved import in p5 distribution');
console.log('Built Prairie Windrider: local p5 Canvas source, licence, and game assets.');
