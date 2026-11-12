import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='8058761290ce468f5e85f04198926473ee9b3a26';
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'dist'],{encoding:'utf8'}).trim().split('\n');
for(const file of files){if(['dist/index.html','dist/reading-experience.js','dist/reading-experience.css'].includes(file))continue;assert(fs.readFileSync(file).equals(execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:50*1024*1024})),`All existing deployed bytes except exact landing markup stay V75: ${file}`);}
let expected=execFileSync('git',['show',`${baseline}:dist/index.html`],{encoding:'utf8'});
for(const {before,after,count} of JSON.parse(fs.readFileSync('landing-black-v76.json','utf8'))){assert.equal(expected.split(before).length-1,count);expected=expected.split(before).join(after);}
assert.equal(fs.readFileSync('dist/index.html','utf8'),expected);
assert.equal(fs.readFileSync('index.html','utf8'),expected);
assert(fs.readFileSync('landing-black.css').equals(fs.readFileSync('dist/landing-black.css')));
console.log('PASS exact V75 production preservation except the two authorized landing HTML changes and new isolated stylesheet');

const original=file=>execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'});
assert.equal(fs.readFileSync('reading-experience.js','utf8'),original('reading-experience.js').replace("'golivescore','jobhunt'])", "'golivescore','jobhunt','engineering'])"));
const oldCSS=original('reading-experience.css'), css=fs.readFileSync('reading-experience.css','utf8');
const node=oldCSS.match(/\.reading-mode #engineering \.node\{background:linear-gradient[^}]+\}/)[0];
const expectedBase=oldCSS.replace(node,'/* Never transition inherited visibility: the complete Lab must leave with its chapter. */\n'+node.slice(0,-1)+';transition:background-color .25s,border-color .25s,box-shadow .25s}');
assert.equal(css.slice(0,css.indexOf('/* Fit the desktop Lab')).trimEnd(),expectedBase.trimEnd(),'Existing Reading CSS changes only by explicit Lab node transition scope');
for(const file of ['reading-experience.js','reading-experience.css'])assert(fs.readFileSync(file).equals(fs.readFileSync('dist/'+file)));
console.log('PASS combined Lab controller/CSS scope alongside approved landing theme');
