const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('showcase-layout.js','utf8'),css=fs.readFileSync('showcase-layout.css','utf8');
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.className='';this._text='';const self=this;this.classList={contains:c=>self.className.split(/\s+/).includes(c),add:c=>{if(!self.classList.contains(c))self.className+=' '+c;},toggle:(c,on)=>{self.className=self.className.split(/\s+/).filter(x=>x!==c).join(' ');if(on)self.classList.add(c);}};}
 set textContent(s){this._text=s;}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 append(...nodes){for(const node of nodes){if(node.parentNode)node.parentNode.children=node.parentNode.children.filter(n=>n!==node);this.children.push(node);node.parentNode=this;}}
 replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}addEventListener(event,fn){this.events[event]=fn;}
 querySelector(selector){if(selector==='summary')return this.children.find(n=>n.tagName==='summary');throw Error(selector);}
 querySelectorAll(selector){if(selector===':scope > details')return this.children.filter(n=>n.tagName==='details');if(selector==='.verified-tools > span')return this.tools;if(selector===':scope > .city-kicker,:scope > h2,:scope > p')return this.children.filter(n=>['h2','p'].includes(n.tagName));throw Error(selector);}
}
const markup=[html.match(/<section id="skills"[^>]*>(.*?)<\/section>/s)[1],html.match(/<article[^>]*data-stop="skills"[^>]*>(.*?)<\/article>/s)[1]];
const sections=markup.map((s,i)=>{const section=new Element(i?'article':'section');for(const tag of ['h2','p']){const n=new Element(tag);n.textContent=decode(s.match(new RegExp('<'+tag+'[^>]*>(.*?)</'+tag+'>','s'))[1]);section.append(n);}for(const [,body] of s.matchAll(/<details[^>]*>(.*?)<\/details>/gs)){const detail=new Element('details'),summary=new Element('summary');summary.textContent=decode(body.match(/<summary>(.*?)<\/summary>/s)[1]);detail.append(summary);detail.tools=[...body.matchAll(/<span>(.*?)<\/span>/gs)].map(([,t])=>{const n=new Element('span');n.textContent=decode(t);return n;});section.append(detail);}return section;});
const originals=sections.map(s=>s.children.filter(n=>n.tagName==='details'));
const context={document:{readyState:'complete',createElement:t=>new Element(t),querySelectorAll:s=>s==='#skills,.city-stop[data-stop="skills"]'?sections:[]}};vm.runInNewContext(source,context);
function find(node,cls){if(node.classList.contains(cls))return node;for(const child of node.children){const match=find(child,cls);if(match)return match;}}
const grids=[];
sections.forEach((section,i)=>{
 const atlas=find(section,'skill-atlas'),filters=find(section,'atlas-filters'),grid=find(section,'atlas-grid'),status=find(section,'atlas-status');grids.push(grid);
 assert.equal(grid.tagName,'ul');assert.equal(grid.children.length,10);assert.equal(filters.children.length,7);assert(grid.children.some(tile=>tile.children[1].textContent==='AWS'),'AWS is visible in the overview');assert.equal(find(section,'atlas-more'),undefined,'Requested bottom disclosure is removed');
 for(const original of originals[i])assert(!section.children.includes(original),'No duplicate disclosures remain in the enhanced view');
 assert.equal(section.children.length,1);
 assert(!source.includes('Full toolkit & engineering practices'));
 assert.equal((markup[i].match(/<details/g)||[]).length,originals[i].length,'Source retains the no-JavaScript fallback');
 for(const tile of grid.children){assert.equal(tile.tagName,'li');assert.equal(find(tile,'toolkit-icon').attributes['aria-hidden'],'true');if(find(tile,'toolkit-icon').children.length)assert.equal(find(tile,'toolkit-icon').children[0].alt,'');assert(tile.children[1].textContent.length);}
 for(const b of filters.children){assert.equal(b.tagName,'button');assert.equal(b.type,'button');assert.equal(b.attributes['aria-controls'],grid.id);b.events.click();assert.equal(b.attributes['aria-pressed'],'true');assert.equal(filters.children.filter(x=>x.attributes['aria-pressed']==='true').length,1);assert(grid.children.length>0);if(b.textContent!=='All tools')assert(grid.children.every(tile=>tile.dataset.family===b.textContent));}
 filters.children.find(b=>b.textContent==='Cloud & DevOps').events.click();assert(grid.children.some(tile=>tile.children[1].textContent==='AWS'));assert(grid.children.some(tile=>tile.children[1].textContent==='Kubernetes'));assert.equal(status.attributes.role,'status');filters.children[1].events.click();assert.equal(grid.children.length,8,'All listed languages are shown');assert.equal(grid.children[0].children[1].textContent,'C#');
 assert.equal(atlas.children[0].children[0].tagName,'h2');
});
assert.notEqual(grids[0].id,grids[1].id,'Reading and city filters control distinct grids');
vm.runInNewContext(source,context);assert.equal(sections[0].children.filter(n=>n.classList.contains('skill-atlas')).length,1,'Enhancement is idempotent');
for(const file of ['showcase-layout.js','showcase-layout.css'])assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync('dist/'+file,'utf8'));
for(const file of fs.readdirSync('assets/technology-marks'))assert.equal(fs.readFileSync('assets/technology-marks/'+file,'utf8'),fs.readFileSync('dist/assets/technology-marks/'+file,'utf8'));
assert.match(css,/atlas-grid-overview.*nth-child\(1\).*grid-column:3/);assert.match(css,/rgba\(232,239,243,\.13\)/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/prefers-reduced-transparency/);assert.match(css,/button:focus-visible/);assert.match(css,/@media\(max-width:440px\)/);
// A board spans both desktop rows. Auto-sized rows split its extra height and
// move the filters when a category has more cards. Only the second row may grow.
const atlasRule=css.match(/\.engineering-toolkit \.skill-atlas\{([^}]+)\}/)[1];
assert.match(atlasRule,/grid-template-rows:max-content 1fr(?:;|$)/,'Category menu is anchored directly below its content-sized heading');
assert.match(atlasRule,/grid-template-areas:"heading board" "filters board"/,'Keep the existing two-column layout');
assert.match(atlasRule,/align-items:start/,'Keep the category menu at the start of its row');
assert.match(css,/@media\(max-width:700px\).*?\.engineering-toolkit \.skill-atlas\{display:flex;flex-direction:column/s,'Small layouts still use the natural vertical flow');
assert.match(css,/\.city-portal \.city-stop\.engineering-toolkit\{[^}]*overflow:auto/,'Long categories remain scrollable rather than clipped');
assert(!/setInterval|requestAnimationFrame|fetch\(/.test(source),'Toolkit adds no animation loops or network services');
console.log('PASS: ten verified overview tools including AWS, six complete discipline filters, unique accessible controls, live status, native buttons, decorative logos, removed duplicate full-toolkit disclosure with intact source fallback, idempotence, content-anchored category rows, responsive glass styling and dist parity.');
