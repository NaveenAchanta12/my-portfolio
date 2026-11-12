const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const html=fs.readFileSync('index.html','utf8');
for(const id of ['codetrail','golivescore','lumicare','wishlist','jobhunt'])for(const re of [new RegExp('<section id="'+id+'".*?</section>','s'),new RegExp('<article[^>]+data-stop="'+id+'".*?</article>','s')]){const b=html.match(re)[0];assert(b.includes('project-showcase'));assert(b.includes('project-lede'));assert.equal(b.includes('project-actions'),id!=='jobhunt','Only available project actions are rendered');assert((b.match(/class="city-detail project-detail"/g)||[]).length>=2);assert(!b.includes('href="#"'));}
assert(html.indexOf('<section id="experience"')<html.indexOf('<section id="codetrail"'));
assert(html.includes('https://github.com/NaveenAchanta12/codetrail'));assert(!html.includes('https://github.com/Naveenachanta/NMAB'));assert(!html.includes('project-action-unavailable'),'Unavailable links are omitted without fabricated destinations');
let toggle;const item={dataset:{},open:false,querySelector:()=>({}),addEventListener:(event,fn)=>{assert.equal(event,'toggle');toggle=fn;}};
vm.runInNewContext(fs.readFileSync('project-details.js','utf8'),{document:{readyState:'complete',querySelectorAll:()=>[item]}});assert.equal(item.dataset.expanded,'false');item.open=true;toggle();assert.equal(item.dataset.expanded,'true');item.open=false;toggle();assert.equal(item.dataset.expanded,'false');
for(const f of ['index.html','project-details.css','project-details.js','city-route.js','city-route-v18.js'])assert.equal(fs.readFileSync(f,'utf8'),fs.readFileSync('dist/'+f,'utf8'));
console.log('PASS project stories, native disclosure expand/collapse, truthful actions, Experience order and dist parity');

assert.equal((html.match(/https:\/\/github.com\/Naveenachanta\/CRICKETLIVE/g)||[]).length,2);assert(!html.includes('initial Xcode app scaffold'));assert(!html.includes('CricketScores · Native iOS project'));

assert.equal((html.match(/https:\/\/github.com\/NaveenAchanta12\/mywishlistss/g)||[]).length,2);
