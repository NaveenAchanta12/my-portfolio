import {createRequire} from 'node:module';
const {applyCopyChanges}=createRequire(import.meta.url)('./copy-cleanup-v75.cjs');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='816130d86702592c8da23c5d241abbd04d5c3468';
const allowed=new Set(['dist/reading-experience.js','dist/reading-experience.css','dist/chapter-refinement.css','dist/index.html']);
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'dist'],{encoding:'utf8'}).trim().split('\n');
for(const file of files){if(!allowed.has(file))assert(fs.readFileSync(file).equals(execFileSync('git',['show',`${baseline}:${file}`],{maxBuffer:50*1024*1024})),`Unrelated deployed bytes must stay V73: ${file}`);}
for(const file of allowed)assert(fs.readFileSync(file).equals(fs.readFileSync(file.slice(5))),`Reading source/dist parity: ${file}`);
console.log('PASS exact V73 production scope: only Reading presentation changes, all City/input/layout/content bytes retained');

assert.equal(fs.readFileSync('dist/index.html','utf8'),applyCopyChanges(execFileSync('git',['show',`${baseline}:dist/index.html`],{encoding:'utf8'})),'V73 HTML changes only by the exact authorized V75 operations');
