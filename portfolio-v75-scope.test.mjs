import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {applyCopyChanges}=createRequire(import.meta.url)('./copy-cleanup-v75.cjs');
const baseline='676b7dbbcfc9a3c736edc6fbe5b1535a7c58cf3c';
const allowed=new Set(['dist/reading-experience.js','dist/reading-experience.css','dist/chapter-refinement.css','dist/index.html']);
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'dist'],{encoding:'utf8'}).trim().split('\n');
for(const file of files){if(!allowed.has(file))assert(fs.readFileSync(file).equals(execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:50*1024*1024})),`Unrelated deployed bytes stay exactly V74: ${file}`);}
for(const file of allowed)assert(fs.readFileSync(file).equals(fs.readFileSync(file.slice(5))),`Source/dist parity: ${file}`);
assert.equal(fs.readFileSync('dist/index.html','utf8'),applyCopyChanges(execFileSync('git',['show',`${baseline}:dist/index.html`],{encoding:'utf8'})),'HTML contains only the exact 23 authorized copy/block/order operations');
console.log('PASS V75 scope: exact requested copy/block/order changes, mobile Experience CSS and Reading order only; remaining V74 bytes unchanged');
