const $ = s => document.querySelector(s);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const intro=$('.intro'), laptop=$('.laptop'), lid=$('.lid'), name=$('.hero-name'), description=$('.hero-description');
const clamp = n => Math.max(0,Math.min(1,n));
const ease = t => t*t*(3-2*t);
document.body.classList.add('enhanced');
const portal=document.createElement('div'); portal.className='portal city-portal'; portal.setAttribute('aria-hidden','true'); portal.inert=true; portal.append(document.querySelector('#city-template').content.cloneNode(true)); document.body.append(portal);
document.body.classList.add('city-enabled');
const welcome=document.createElement('div');welcome.className='intro-welcome';welcome.innerHTML='<span class="welcome-kicker">NAVEEN ACHANTA · SOFTWARE ENGINEER</span><h2>Welcome to my portfolio.</h2><p>Scroll to learn more about me and the systems I’ve built.</p>';
$('.stage').append(welcome);
let ticking=false, entering=false, lastProgress=0, lastRenderKey=null;
function render(time){
 ticking=false;
 if(document.body.classList.contains('reading-mode')){lastRenderKey=null;return;}
 const reduced=motion.matches;
 document.body.classList.toggle('motion-off',reduced);
 const viewportHeight=$('.stage').offsetHeight;
 const distance=intro.offsetHeight-viewportHeight;
 const p=reduced?1:clamp(scrollY/Math.max(1,distance));
 const renderKey=[p,innerWidth,viewportHeight,reduced].join(':');
 if(renderKey===lastRenderKey)return;
 lastRenderKey=renderKey;
 window.introProgress=p; window.dispatchEvent(new Event('introprogress'));
 lastProgress=p;
 if(typeof window!=='undefined' && window.renderLaptop)window.renderLaptop(p);
 const turn=ease(clamp(p/.50)), open=ease(clamp((p-.06)/.44)), zoom=ease(clamp((p-.36)/.64));
 const identity=ease(clamp((p-.28)/.12));
 laptop.classList.toggle('face-on',turn>.08);
 const handoff=ease(clamp((p-.76)/.08)); portal.style.opacity=1; portal.inert=p<.95; portal.setAttribute('aria-hidden',String(p<.95));
 $('main').style.visibility=(p>=.95||reduced)?'visible':'hidden';
 $('.scene').style.opacity=1-handoff;
 const mobile=innerWidth<760;
 const board=$('.hero-artboard'), bw=board?.clientWidth||innerWidth, bh=board?.clientHeight||viewportHeight;
 const width=mobile?540:650, height=mobile?350:420;
 const sideScale=bw*.78/height;
 const portrait=innerWidth<760&&viewportHeight>innerWidth;
 const openScale=Math.min(bw*(portrait?.85:.45)/width,bh*(portrait?.70:.49)/height);
 const initialScale=sideScale+(openScale-sideScale)*ease(clamp(p/.50));
 const finalScale=Math.min(innerWidth/(width-30),viewportHeight/(height-30))*.99;
 const scale=initialScale+(finalScale-initialScale)*zoom;
 const openX=portrait?.50:.68;
 const hingeX=bw*(.12+(openX-.12)*turn)*(1-zoom)+bw*.5*zoom;
 const hingeY=bh*(.72+((portrait?.98:.70)-.72)*turn)*(1-zoom)+(bh+height*scale)*.5*zoom;
 $('.scene').style.perspective=`${50000*(1-turn)+2200*turn}px`;
 $('.scene').style.perspectiveOrigin=`${hingeX}px ${hingeY}px`;
 laptop.style.transform=`translate(${hingeX-width/2}px,${hingeY-height}px) rotateY(${87*(1-turn)}deg) scale3d(${scale},${scale},${scale})`;
 $('.screen').style.opacity=1;
 $('.screen-content').style.opacity=ease(clamp(turn/.3));
 const wallpaper=$('.screen-wallpaper');if(wallpaper)wallpaper.style.opacity=1-ease(clamp((p-.62)/.23));
 $('.screen-content').style.filter='none';
 $('.lid-back').style.opacity=1;
 $('.base').style.transform=`rotateX(${90-17*turn}deg)`;
 lid.style.transform=`rotateX(${-69*(1-open)}deg)`;
 name.style.opacity=1-ease(clamp((p-.08)/.20));name.style.transform='none';
 name.style.left='0px';name.style.width=bw+'px';name.style.top=(bh*.22)+'px';name.style.fontSize=(bw*.15)+'px';
 name.style.color='#48555f';name.style.webkitTextFillColor='#48555f';
 welcome.style.opacity=reduced?0:ease(clamp((p-.16)/.16))*(1-ease(clamp((p-.58)/.16)));
 welcome.style.transform=`translateY(${18*(1-ease(clamp((p-.16)/.16)))}px)`;
 welcome.setAttribute('aria-hidden',String(p<.16||p>.74||reduced));
 description.style.opacity=1-clamp(p/.18);
 $('.base').style.opacity=(turn>.08?.999:1)*(1-ease(clamp((p-.65)/.2)));
 $('.scroll-cue').style.opacity=1-ease(clamp((p-.40)/.10));
 $('.sequence-count').style.opacity=1-clamp((p-.85)/.15);
 $('.phase-label').textContent=p<.40?'SCROLL TO OPEN':'STEP INSIDE';
 $('#phase').textContent=p<.32?'01':p<.65?'02':'03';
 document.body.classList.toggle('entered',p>.95||reduced);
 if(window.syncCitySurface)window.syncCitySurface(p,typeof time==='number'?time:undefined);
 if(entering && p>=.999){ entering=false; $('#portfolio').focus({preventScroll:true}); }
}
function requestRender(){if(document.body.classList.contains('reading-mode')){lastRenderKey=null;return;}if(!ticking){ticking=true;requestAnimationFrame(render)}}
addEventListener('scroll',requestRender,{passive:true});addEventListener('resize',()=>{lastRenderKey=null;if(document.body.classList.contains('reading-mode'))return;if(lastProgress>0&&lastProgress<1&&!motion.matches){scrollTo({top:lastProgress*Math.max(1,intro.offsetHeight-$('.stage').offsetHeight),behavior:'instant'});}requestRender();});motion.addEventListener('change',render);render();
function enter(){ entering=true; scrollTo({top:motion.matches?0:intro.offsetTop+intro.offsetHeight-$('.stage').offsetHeight,behavior:motion.matches?'auto':'smooth'}); if(motion.matches){$('#portfolio').focus({preventScroll:true}); entering=false;} }
$('.skip-link').addEventListener('click',e=>{e.preventDefault();enter();});
$('.skip').addEventListener('click',enter);
$('.replay').addEventListener('click',()=>{scrollTo({top:0,behavior:motion.matches?'instant':'smooth'});$('.skip').focus({preventScroll:true});});
const projects={codetrail:{title:'CodeTrail',category:'LEARNING EXPERIENCE',description:'A coding-learning experience presented as CodeTrail by SWOT & Study. The interface focuses on moving from a first line of code toward the next step.',features:['Lesson preview and entry points','Ask CodeTrail assistant entry point','Sign-in and learning navigation']},lumicare:{title:'Lumicare',category:'COMMERCE EXPERIENCE',description:'A skincare storefront with a strong visual identity and clear paths to explore products and collections.',features:['Featured products and collections','Shopping bag and account entry points','Chat With Amaya assistant entry point']},wishlist:{title:'MyWishlist',category:'SOCIAL EXPERIENCE',description:'A personal wishlist experience connecting wishes, occasions, family, and people.',features:['Wishes and occasions','Family, people, and messaging navigation','Profile privacy and timezone controls']}};
let trigger;
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{trigger=button;const p=projects[button.dataset.project];$('#dialog-title').textContent=p.title;$('#dialog-category').textContent=p.category;$('#dialog-description').textContent=p.description;$('#dialog-features').replaceChildren(...p.features.map(text=>{const li=document.createElement('li');li.textContent=text;return li}));$('#project-dialog').showModal()}));
$('.close').addEventListener('click',()=>$('#project-dialog').close());$('#project-dialog').addEventListener('click',e=>{if(e.target===$('#project-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});$('#project-dialog').addEventListener('close',()=>trigger?.focus());
const pause=ms=>new Promise(r=>setTimeout(r,ms));
$('#run').addEventListener('click',async()=>{const mode=$('#scenario').value;$('#run').disabled=true;$('#scenario').disabled=true;const nodes=[...document.querySelectorAll('.node')];nodes.forEach(n=>n.classList.remove('active','error'));try{for(let i=0;i<4;i++){nodes[i].classList.add('active');$('#demo-status').textContent=['Browser → Sending request…','API → Validating request…','Service → Processing request…','Data → Returning result…'][i];await pause(motion.matches?100:mode==='slow'?1100:450);if(mode==='error'&&i===2){nodes[i].classList.add('error');$('#demo-status').textContent='503 · Service unavailable. The interface preserves its state and offers a safe retry.';$('#run').innerHTML='Retry request <span>↗</span>';return}}$('#demo-status').textContent=mode==='slow'?'200 · Completed after simulated latency. Loading state remained visible.':'200 · Request completed. Validation, processing, and result delivered.';$('#run').innerHTML='Run again <span>↗</span>'}finally{$('#run').disabled=false;$('#scenario').disabled=false}});
const answers={backend:'Naveen’s résumé includes C#/.NET, ASP.NET MVC, REST APIs, relational data, and asynchronous processing across enterprise roles at Deloitte and Prudential.',projects:'Selected personal projects here are CodeTrail, Lumicare, and MyWishlist. Open a project card to see the interface capabilities visible in the supplied references.',cloud:'His résumé lists Azure, Terraform, CI/CD, testing, and Prometheus, alongside production support. This prototype does not invent performance metrics or project architectures.'};
document.querySelectorAll('.guide-q').forEach(b=>b.addEventListener('click',()=>{$('#guide-answer').textContent=answers[b.dataset.answer]}));

// Pacing changes the input, not the laptop/city handoff geometry. Explicit
// Enter/replay/navigation, keyboard, reduced motion and reverse stay available.
const introPacing=window.PortfolioScroll?.create({
 active:()=>!motion.matches&&!document.body.classList.contains('reading-mode')&&scrollY<Math.max(1,intro.offsetHeight-$('.stage').offsetHeight)-1,
 stops:()=>[0,Math.max(1,intro.offsetHeight-$('.stage').offsetHeight)],
 gain:.55,speed:()=>Math.max(360,Math.min(850,innerHeight*.85)),onScroll:requestRender
});
