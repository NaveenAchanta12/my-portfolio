import {createArrivalIdentity} from './arrival-identity.mjs';
import {createContactTyping} from './contact-typing.mjs';
import {createCity} from './city-route-v18.js';
import {journeyMetrics,journeyProgress,sceneProgress,stationFor,smoother,stops,activeStop,nextStop} from './city-route.js';
import {drawCityFallback} from './city-fallback.js';
const $=s=>document.querySelector(s),body=document.body,portal=$('.city-portal'),canvas=$('#city-canvas'),fallback=$('#city-fallback'),status=$('#city-render-status'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
// The laptop hosts the actual live city surface, not a bitmap thumbnail or replica.
const screenHost=$('.screen-content');screenHost.replaceChildren(portal);
let settledSurfaceKey='',lastSurfaceKey='';
function syncCitySurface(p=window.introProgress||0){
 if(body.classList.contains('reading-mode'))return;
 const viewportKey=[innerWidth,innerHeight,reduced.matches].join(':');
 const surfaceKey=p+':'+viewportKey;
 if(surfaceKey===lastSurfaceKey)return;
 lastSurfaceKey=surfaceKey;
 if(p>=.985&&settledSurfaceKey===viewportKey&&portal.dataset.surface==='viewport')return;
 settledSurfaceKey=p>=.985?viewportKey:'';
 const vw=innerWidth,vh=$('.stage').offsetHeight||innerHeight;
 const release=.76,finish=.985,t=smoother(Math.max(0,Math.min(1,(p-release)/(finish-release))));
 const embedded=p<release&&!reduced.matches;
 if(embedded&&portal.parentNode!==screenHost)screenHost.append(portal);
 if(!embedded&&portal.parentNode!==body)body.append(portal);
 const baseW=Math.max(650,vw),baseH=baseW*screenHost.clientHeight/Math.max(1,screenHost.clientWidth),r=screenHost.getBoundingClientRect();
 const scale=embedded?screenHost.clientWidth/baseW:reduced.matches?1:r.width/baseW*(1-t)+t;
 const surfaceW=embedded?baseW:reduced.matches?vw:(r.width*(1-t)+vw*t)/scale;
 const surfaceH=embedded?baseH:reduced.matches?vh:(r.height*(1-t)+vh*t)/scale;
 portal.style.setProperty('position',embedded?'absolute':'fixed','important');
 portal.style.setProperty('width',surfaceW+'px','important');portal.style.setProperty('height',surfaceH+'px','important');
 portal.style.setProperty('transform-origin','0 0');
 portal.style.setProperty('transform',embedded?`scale(${scale})`:reduced.matches?'none':`translate(${r.left*(1-t)}px,${r.top*(1-t)}px) scale(${scale})`,'important');
 portal.style.opacity='1';portal.style.filter=`brightness(${.34+.66*smoother(Math.max(0,Math.min(1,(p-.65)/.30)))})`;
 portal.dataset.surface=embedded?'laptop':t<1?'expanding':'viewport';
 // One renderer changes its projection continuously as the physical screen becomes the viewport.
 const rw=Math.round(surfaceW),rh=Math.round(surfaceH);
 if(width!==rw||height!==rh){width=rw;height=rh;if(city)city.resize(width,height);fallback.width=Math.round(width*Math.min(devicePixelRatio,1.5));fallback.height=Math.round(height*Math.min(devicePixelRatio,1.5));}
}
// Surface geometry, backing-store changes and redraw are one synchronous transaction.
// A scroll RAF must never leave a newly resized (cleared) canvas until the next RAF.
function renderCitySurface(p=window.introProgress||0,time=performance.now()){
 if(reading||document.hidden)return;
 if(p<1)current=target=0;
 syncCitySurface(p);draw(time);
}
window.syncCitySurface=renderCitySurface;

let city=null,width=innerWidth,height=innerHeight,frame=0,last=0,current=0,target=0,navigation=null,reading=false,savedProgress=0;
function metrics(){return journeyMetrics($('.intro').offsetHeight,$('.stage').offsetHeight,$('.journey-spacer').offsetHeight)}
function readTarget(){const m=metrics();target=(window.introProgress||0)<1?0:journeyProgress(scrollY,m.start,m.distance);return target}
try{city=createCity(canvas,{onTexturesReady:wake});status.textContent='Interactive city · First route preview';body.classList.add('city-webgl');}catch(error){canvas.hidden=true;fallback.hidden=false;status.textContent='Simplified 2D preview · 3D rendering unavailable in this browser';body.classList.add('city-fallback');console.info('City fallback:',error.message)}
function resize(event){settledSurfaceKey='';lastSurfaceKey='';if(event?.type==='resize'&&(window.introProgress||0)>=.95&&!reading){const m=metrics();navigation=null;scrollTo({top:m.start+target*m.distance,behavior:'instant'});current=target;}readTarget();renderCitySurface();wake()}
let fallbackDrawKey='',lastCityDrawKey='';
function draw(time){if(city){const key=[time,current,width,height,window.introProgress].join(':');if(key===lastCityDrawKey)return;lastCityDrawKey=key;city.setProgress(sceneProgress(current));city.render(time)}else{const key=[current,width,height,fallback.width,fallback.height].join(':');if(key===fallbackDrawKey)return;fallbackDrawKey=key;const ctx=fallback.getContext('2d');ctx.setTransform(fallback.width/width,0,0,fallback.height/height,0,0);drawCityFallback(ctx,sceneProgress(current),width,height)}

}
// One visual identity moves from the existing header into the final Contact scene.
const headerIdentity=$('.wordmark'),contactIdentity=document.createElement('div');
contactIdentity.className='contact-identity';contactIdentity.setAttribute('aria-hidden','true');contactIdentity.innerHTML='<strong>Naveen Achanta</strong><span>Software Engineer</span><p class="contact-statement"><i></i><b aria-hidden="true">|</b></p>';document.body.append(contactIdentity);
const arrivalIdentity=createArrivalIdentity({header:headerIdentity,heading:$('.arrival-identity-title'),introduction:$('.city-introduction'),body});
const contactTyper=createContactTyping(contactIdentity.querySelector('.contact-statement i'));
const typingControl=document.createElement('button');typingControl.className='contact-typing-control';typingControl.textContent='Pause text animation';typingControl.setAttribute('aria-pressed','false');typingControl.hidden=true;$('.city-stop[data-stop="contact"]').append(typingControl);
const statementSummary=document.createElement('p');statementSummary.className='sr-only';statementSummary.textContent='I build software with purpose. I take ownership from idea to delivery. I keep learning and improving.';$('.city-stop[data-stop="contact"]').append(statementSummary);
let contactTypingPaused=false;typingControl.addEventListener('click',()=>{contactTypingPaused=!contactTypingPaused;contactTyper.setPaused(contactTypingPaused);typingControl.setAttribute('aria-pressed',String(contactTypingPaused));typingControl.textContent=contactTypingPaused?'Resume text animation':'Pause text animation';});
// Begin as AI leaves its station window and finish at the Contact destination.
// Contact selection arrives with the identity fully in place, without extra travel.
const contactStop=stops.find(stop=>stop.id==='contact'),contactIdentityStart=stops.find(stop=>stop.id==='ai').p+.027,contactIdentityEnd=contactStop.p;
function updateContactIdentity(){
 const raw=Math.max(0,Math.min(1,(current-contactIdentityStart)/(contactIdentityEnd-contactIdentityStart))),t=reduced.matches?(raw>0?1:0):smoother(raw);
 const visible=t>0&&!reading&&(window.introProgress||0)>=.95;
 const statementVisible=visible&&t>.85;contactIdentity.querySelector('.contact-statement').style.opacity=statementVisible?'1':'0';typingControl.hidden=!statementVisible||reduced.matches;contactTyper.update(performance.now(),statementVisible,reduced.matches);
 contactIdentity.style.display=visible?'block':'none';headerIdentity.style.opacity=visible?'0':'1';headerIdentity.style.pointerEvents=visible?'none':'';headerIdentity.tabIndex=visible?-1:0;
 if(!visible)return;
 const r=headerIdentity.getBoundingClientRect(),name=headerIdentity.querySelector('strong'),role=headerIdentity.querySelector('span'),style=getComputedStyle(name),roleStyle=getComputedStyle(role),portrait=innerWidth<760&&innerHeight>innerWidth;
 const targetX=innerWidth*(portrait?.12:.14),targetY=innerHeight*(portrait?.27:.42),targetFont=portrait?Math.min(42,innerWidth*.10):Math.min(70,innerWidth*.042),targetRole=portrait?14:Math.min(22,innerWidth*.0175);
 const font=parseFloat(style.fontSize),small=parseFloat(roleStyle.fontSize),spacing=parseFloat(roleStyle.letterSpacing)||0;
 contactIdentity.style.transform=`translate(${r.left+(targetX-r.left)*t}px,${r.top+(targetY-r.top)*t}px)`;
 contactIdentity.style.textShadow=`0 2px 12px rgba(7,16,31,${t*.5})`;
 const contactName=contactIdentity.querySelector('strong'),contactRole=contactIdentity.querySelector('span');
 contactName.style.fontFamily=style.fontFamily;contactName.style.fontWeight=style.fontWeight;
 contactRole.style.fontFamily=roleStyle.fontFamily;contactRole.style.fontWeight=roleStyle.fontWeight;
 contactName.style.fontSize=`${font+(targetFont-font)*t}px`;
 contactName.style.lineHeight=`${parseFloat(style.lineHeight)+(targetFont*1.15-parseFloat(style.lineHeight))*t}px`;
 contactName.style.letterSpacing=`${(parseFloat(style.letterSpacing)||0)+(-targetFont*.035-(parseFloat(style.letterSpacing)||0))*t}px`;
 contactRole.style.lineHeight=`${parseFloat(roleStyle.lineHeight)+(targetRole*1.3-parseFloat(roleStyle.lineHeight))*t}px`;
 contactIdentity.querySelector('span').style.fontSize=`${small+(targetRole-small)*t}px`;
 contactIdentity.querySelector('span').style.letterSpacing=`${spacing+(1.6-spacing)*t}px`;
}
let lastStation='',lastUIProgress=null,lastUIReading=null;
function updateUI(){arrivalIdentity.update({progress:current,introProgress:window.introProgress||0,reading,reduced:reduced.matches});updateContactIdentity();if(current===lastUIProgress&&reading===lastUIReading)return;lastUIProgress=current;lastUIReading=reading;const station=stationFor(current),active=activeStop(current),next=nextStop(current);portal.dataset.station=station;
 document.querySelectorAll('.city-stop').forEach(panel=>{const visible=panel.dataset.stop===active?.id;panel.classList.toggle('active',visible);panel.inert=!visible||reading;panel.setAttribute('aria-hidden',String(!visible||reading));});
 $('.city-introduction').inert=current>.07||reading;$('.city-introduction').setAttribute('aria-hidden',String(current>.07||reading));$('.city-introduction').style.opacity=current>.07?'0':'1';
 $('#city-progress-fill').style.width=`${current*100}%`;$('#city-phase').textContent=active?`${active.label.toUpperCase()} / ${stops.indexOf(active)+1} OF ${stops.length}`:station==='arrival'?'ARRIVAL / THE CITY':`ON THE WAY / ${next.label.toUpperCase()}`;
 $('#city-instruction').textContent=active?.id==='contact'?'Journey complete':active?'Scroll onward when you’re ready':`Follow the street toward ${next.label}`;
 $('.city-road-label b').textContent=next.label;$('.city-road-label').style.opacity=active||current<.04?'0':'1';
 const previous=[...stops].reverse().find(stop=>stop.p<current-.027);$('.city-previous').hidden=!previous;
 const following=stops.find(stop=>stop.p>current+.027);$('.city-next').hidden=!following;$('.city-next').textContent=following?`Next: ${following.label} →`:'';
 if(station!==lastStation){if(active)$('#city-destination').value=String(active.p);else if(station==='arrival')$('#city-destination').value='0';lastStation=station;$('#city-destination').dispatchEvent(new Event('destinationchange'));}
}
function tick(time){frame=0;if(document.hidden||reading)return;const dt=Math.min((time-last)/1000,.05)||.016;last=time;
 if(navigation){const t=Math.min(1,(time-navigation.time)/navigation.duration);const m=metrics();const p=navigation.from+(navigation.to-navigation.from)*smoother(t);scrollTo({top:m.start+p*m.distance,behavior:'instant'});if(t>=1)navigation=null;}
 readTarget();if((window.introProgress||0)<1)current=0;current=reduced.matches?target:current+(target-current)*(1-Math.exp(-18*dt));if(Math.abs(current-target)<.00005)current=target;renderCitySurface(window.introProgress||0,time);updateUI();
 if(!reduced.matches&&((window.introProgress||0)>.001||navigation||Math.abs(current-target)>.00005))frame=requestAnimationFrame(tick);
}
function wake(){if(!frame&&!reading&&!document.hidden)frame=requestAnimationFrame(tick)}
function travel(to){if(reading)setReading(false);const m=metrics();if(reduced.matches){scrollTo({top:m.start+to*m.distance,behavior:'instant'});current=target=to;draw(0);updateUI();return}navigation={from:readTarget(),to,time:performance.now(),duration:800+Math.abs(to-target)*2400};wake()}
function setReading(value){if(value&&!reading)savedProgress=readTarget();reading=value;body.classList.toggle('reading-mode',value);arrivalIdentity.invalidate();if(value){arrivalIdentity.update({progress:current,introProgress:window.introProgress||0,reading,reduced:reduced.matches});updateContactIdentity();}document.querySelectorAll('.reading-toggle').forEach(b=>{b.textContent=value?'Return to city':'Reading mode';b.setAttribute('aria-pressed',String(value))});$('.reading-view').inert=!value;$('.reading-view').setAttribute('aria-hidden',String(!value));portal.inert=value;portal.setAttribute('aria-hidden',String(value));if(value){cancelAnimationFrame(frame);frame=0;navigation=null;scrollTo({top:0,behavior:'instant'});$('#about').setAttribute('tabindex','-1');$('#about').focus({preventScroll:true})}else{requestAnimationFrame(()=>{const m=metrics();scrollTo({top:m.start+savedProgress*m.distance,behavior:'instant'});wake()})}}
$('.city-previous').addEventListener('click',()=>{const previous=[...stops].reverse().find(stop=>stop.p<current-.027);if(previous)travel(previous.p)});
$('#city-destination').addEventListener('change',event=>{const destination=Number(event.target.value);travel(destination===contactStop.p?contactIdentityEnd:destination)});$('.city-next').addEventListener('click',()=>{const next=stops.find(stop=>stop.p>current+.027);if(next)travel(next.p)});
document.querySelectorAll('[data-city-go]').forEach(b=>b.addEventListener('click',()=>travel(Number(b.dataset.cityGo))));document.querySelectorAll('.reading-toggle').forEach(b=>b.addEventListener('click',()=>setReading(!reading)));
for(const event of ['wheel','touchstart','pointerdown','keydown'])addEventListener(event,()=>{navigation=null},{passive:true});
addEventListener('scroll',wake,{passive:true});addEventListener('introprogress',wake);addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else wake()});
reduced.addEventListener('change',()=>{city?.setReducedMotion(reduced.matches);if(reduced.matches)setReading(true);else wake()});$('.replay').addEventListener('click',()=>{if(reading){savedProgress=0;setReading(false);}scrollTo({top:0,behavior:'instant'});current=target=0;wake()});
$('.reading-view').inert=true;$('.reading-view').setAttribute('aria-hidden','true');resize();if(reduced.matches)setReading(true);else wake();
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();city=null;canvas.hidden=true;fallback.hidden=false;body.classList.remove('city-webgl');body.classList.add('city-fallback');status.textContent='Simplified 2D preview · 3D context unavailable';resize();});
// No runtime network services, tracking, microphones or third-party requests.

function followChapterHash(){if(reading)return;const stop=stops.find(s=>`#${s.id}`===location.hash);if(stop)travel(stop.p)}
addEventListener('hashchange',followChapterHash);if(location.hash&&location.hash!=='#portfolio')followChapterHash();
