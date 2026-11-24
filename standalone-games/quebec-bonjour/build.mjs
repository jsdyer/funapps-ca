import {build} from 'esbuild';
import {mkdir,rm,copyFile,readFile,writeFile} from 'node:fs/promises';
await rm('web',{recursive:true,force:true});await mkdir('web',{recursive:true});
await build({entryPoints:['src/cafe.js'],outfile:'web/game.js',bundle:true,minify:true,target:'es2020',legalComments:'eof'});
await build({entryPoints:['src/main.js'],outfile:'web/classic.js',bundle:true,minify:true,target:'es2020',legalComments:'eof'});
for(const file of ['index.html','classic.html','style.css','cafe.css'])await copyFile('src/'+file,'web/'+file);
const licenses=[];for(const pkg of ['alpinejs','@vue/reactivity','@vue/shared']){let text;for(const filename of ['LICENSE','LICENSE.md']){try{text=await readFile('node_modules/'+pkg+'/'+filename,'utf8');break}catch{}}if(text)licenses.push(pkg+'\n'+text)}
await writeFile('web/THIRD-PARTY-LICENSES.txt',licenses.join('\n\n'));
console.log('Built Quebec adventure into web/.');
