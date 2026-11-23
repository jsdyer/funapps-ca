import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('web',{recursive:true});
await build({entryPoints:['src/main.js'],bundle:true,minify:true,outfile:'web/game.js',platform:'browser',target:'es2020',legalComments:'eof'});
await Promise.all(['index.html','style.css','THIRD-PARTY-LICENSES.txt'].map(name=>copyFile('src/'+name,'web/'+name)));
