import {mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
await rm('web',{recursive:true,force:true});await mkdir('web/vendor',{recursive:true});
for(const file of ['index.html','planner.html','style.css','game.js','engine.mjs','quick.css','quick.js','quick-engine.mjs'])await copyFile('src/'+file,'web/'+file);
// p5 asks for the browser's full locale (such as en-CA), while its pinned
// release ships extracted diagnostic dictionaries for English and Simplified Chinese.
const translations = 'web/vendor/translations';
await mkdir(translations, {recursive: true});
for (const locale of ['en', 'zh-CN']) {
  await copyFile(`node_modules/p5/translations/${locale}/extracted.json`, `${translations}/${locale}.json`);
}
const upstream = await readFile('node_modules/p5/lib/p5.esm.js', 'utf8');
const lookup = 'fetch(`./${defaultLanguage}.json`)';
if (!upstream.includes(lookup)) throw Error('Review the p5 locale lookup before upgrading.');
const localLookup = 'fetch(new URL(/^zh(?:-cn|-hans|$)/i.test(defaultLanguage) ? "./translations/zh-CN.json" : "./translations/en.json", import.meta.url))';
await writeFile('web/vendor/p5.esm.js', upstream.replace(lookup, localLookup));
const license=await readFile('node_modules/p5/license.txt','utf8');
await writeFile('web/THIRD-PARTY-LICENSES.txt','Prairie Windrider uses p5.js version 2.4.0.\nUpstream: https://github.com/processing/p5.js/tree/v2.4.0\nPackage: https://www.npmjs.com/package/p5/v/2.4.0\nCopyright p5.js contributors. Licensed under GNU LGPL 2.1.\n\nThe complete, unminified upstream ESM distribution is provided separately at vendor/p5.esm.js. It is directly imported by the application, may be replaced with a compatible modified version, and retains upstream dependency notices in its source. The application source and build instructions are maintained in the FunApps repository. The local release points the diagnostic dictionary lookup at the bundled translations.\n\n'+license);
const library=await readFile('web/vendor/p5.esm.js','utf8');if(/^import\s/m.test(library))throw Error('Unexpected unresolved import in p5 distribution');
console.log('Built Prairie Windrider: local p5 Canvas source, licence, and game assets.');
