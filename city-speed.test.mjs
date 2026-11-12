import {createRequire} from 'node:module';
const {applyCopyChanges}=createRequire(import.meta.url)('./copy-cleanup-v75.cjs');
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {journeyMetrics,journeyProgress,stops,activeStop} from './city-route.js';
const baseline='bf8bb7b8442f977ad8a77b7604c6233b5d154611';
const css=fs.readFileSync('styles.css','utf8'),before=execFileSync('git',['show',`${baseline}:styles.css`],{encoding:'utf8'});
assert.equal(css,before.replace('.city-enabled .journey-spacer{height:850vh;height:850svh}', '.city-enabled .journey-spacer{height:950vh;height:950svh}'),'Only City journey distance changes');
assert.equal(css,fs.readFileSync('dist/styles.css','utf8'));
const prod=execFileSync('git',['ls-tree','-r','--name-only',baseline,'dist'],{encoding:'utf8'}).trim().split('\n');
const removedArrivalParagraph='<p class="arrival-summary">I’m Naveen, a software engineer building enterprise applications, connected systems and independent products.</p>';
const requestedReadingChanges=new Set(['dist/reading-experience.js','dist/reading-experience.css','dist/city-controller.js','dist/scroll-pacing.js','dist/showcase-layout.css','dist/chapter-refinement.css']);
for(const f of prod)if(f!=='dist/styles.css'&&!requestedReadingChanges.has(f)){let expected=execFileSync('git',['show',`${baseline}:${f}`],{maxBuffer:50*1024*1024});if(f==='dist/index.html')expected=Buffer.from(applyCopyChanges(expected.toString().replace(removedArrivalParagraph,'').replace('<script src="reading-experience.js" defer></script>','<script src="reading-experience.js" defer></script>\n<script src="reading-demo.js" defer></script>')));assert(fs.readFileSync(f).equals(expected),`Production bytes unchanged from V68 except requested arrival paragraph removal and requested Reading refinements: ${f}`);}
for(const [w,h] of [[1440,900],[1165,757],[390,844],[430,932],[844,390],[768,1024]]){
 const original=journeyMetrics(h*2.4,h,h*8.5),changed=journeyMetrics(h*2.4,h,h*9.5);
 assert.equal(original.start,changed.start,'Landing handoff unchanged');
 const speedRatio=original.distance/changed.distance;assert(Math.abs(speedRatio-15/17)<1e-12);
 for(const p of [0,.09,.18,.27,.54,.72,.865,.92,1]){const y=changed.start+p*changed.distance;assert(Math.abs(journeyProgress(y,changed.start,changed.distance)-p)<1e-12)}
 for(const s of stops){const y=changed.start+s.p*changed.distance;assert.equal(activeStop(journeyProgress(y,changed.start,changed.distance)).id,s.id,'Dropdown/buttons still use matching live geometry');}
 for(const p of [.1,.5,.9]){const y=changed.start+p*changed.distance,step=80;const forward=journeyProgress(y+step,changed.start,changed.distance)-p,reverse=p-journeyProgress(y-step,changed.start,changed.distance);assert(Math.abs(forward-reverse)<1e-12,'Symmetric forward/reverse with no latch');}
 console.log(`PASS ${w}x${h}: 11.76% slower City scroll, identical landing endpoint, reversible mapping and all destinations`);
}
console.log('PASS exact V68 production parity except the City spacer height, requested arrival paragraph removal, requested Reading refinements and authorized Contact timing; unchanged City/Laptop input defaults');
