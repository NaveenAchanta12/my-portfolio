(()=>{
const stage=document.querySelector('.avatar-stage'),rig=document.querySelector('.avatar-rig'),caption=document.querySelector('.avatar-caption'),voiceButton=document.querySelector('.avatar-voice');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');let voice=false,speakingTimer;
const greetings=['Hi, I’m Naveen. I build full-stack software, from interfaces to enterprise services.','My toolkit includes C# and .NET, Angular, React, TypeScript, SQL and Azure.','Explore CodeTrail, Lumicare and MyWishlist in selected work.'];let greeting=0;
function reset(){rig.style.transform='';document.querySelectorAll('.project').forEach(el=>el.style.transform='');}
reduced.addEventListener('change',reset);
function localVoice(){return window.speechSynthesis?.getVoices().find(v=>v.localService&&v.lang.startsWith('en'));}
function say(text){caption.textContent=text;clearTimeout(speakingTimer);stage.classList.add('greeting');speakingTimer=setTimeout(()=>stage.classList.remove('greeting'),2200);if(voice){const v=localVoice();if(v){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=v;u.rate=.95;speechSynthesis.speak(u);}else{voice=false;voiceButton.textContent='Local voice unavailable';voiceButton.setAttribute('aria-pressed','false');}}}
function greet(){say(greetings[greeting++%greetings.length]);}
document.querySelector('.avatar-button').addEventListener('click',greet);document.querySelector('.avatar-greet').addEventListener('click',greet);
voiceButton.addEventListener('click',()=>{if(voice){voice=false;window.speechSynthesis?.cancel();voiceButton.textContent='Voice off';}else if(localVoice()){voice=true;voiceButton.textContent='Voice on';greet();}else voiceButton.textContent='Local voice unavailable';voiceButton.setAttribute('aria-pressed',String(voice));});
document.querySelectorAll('.guide-q').forEach(b=>b.addEventListener('click',()=>say(document.querySelector('#guide-answer').textContent)));
document.querySelectorAll('.project').forEach(el=>{el.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(900px) rotateX(${-y*6}deg) rotateY(${x*6}deg) translateY(-4px)`;});el.addEventListener('pointerleave',()=>el.style.transform='');});
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.speechSynthesis?.cancel();});
})();
