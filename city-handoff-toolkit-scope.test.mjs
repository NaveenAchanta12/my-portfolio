import {createRequire} from 'node:module';
const {applyCopyChanges}=createRequire(import.meta.url)('./copy-cleanup-v75.cjs');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='fbfe6805273e818e7889d6dfe55855ccc28dff68';
const allowed=new Set(['dist/city-controller.js','dist/showcase-layout.css','dist/reading-experience.js','dist/reading-experience.css','dist/scroll-pacing.js','dist/index.html','dist/chapter-refinement.css']);
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'dist'],{encoding:'utf8'}).trim().split('\n');
for(const file of files){
 if(allowed.has(file))continue;
 assert(fs.readFileSync(file).equals(execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:50*1024*1024})),`Unrelated deployed bytes stay exactly V72: ${file}`);
}
for(const file of allowed)assert(fs.readFileSync(file).equals(fs.readFileSync(file.slice(5))),`Source/dist parity: ${file}`);
const before=execFileSync('git',['show',`${baseline}:dist/index.html`],{encoding:'utf8'});
assert.equal(fs.readFileSync('dist/index.html','utf8'),applyCopyChanges(before.replace('<script src="reading-experience.js" defer></script>','<script src="reading-experience.js" defer></script>\n<script src="reading-demo.js" defer></script>')),'Only requested V75 copy/order changes affect existing HTML');
assert(fs.readFileSync('dist/reading-demo.js').equals(fs.readFileSync('reading-demo.js')));
console.log('PASS V72 unrelated deployed bytes preserved, existing HTML content unchanged, requested Reading/Contact/menu changes scoped');
