(()=>{
document.body.classList.add('sequence-enabled');
const stage=document.querySelector('.stage'), name=document.querySelector('.hero-name');
const board=document.createElement('div');board.className='hero-artboard';stage.append(board);board.append(name);
const canvas=document.createElement('canvas');canvas.className='laptop-sequence';canvas.setAttribute('aria-hidden','true');board.append(canvas);const ctx=canvas.getContext('2d');
const count=49,frames=[], clamp=n=>Math.max(0,Math.min(1,n)),ease=t=>t*t*(3-2*t);let progress=0,lastW=0,lastH=0;
function draw(p){progress=p;const w=board.clientWidth,h=board.clientHeight;if(!w||!h)return;const dpr=Math.min(devicePixelRatio,1.5);if(w!==lastW||h!==lastH){lastW=w;lastH=h;canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);}
 const idx=Math.round(clamp(p/.92)*(count-1));let frame=frames[idx];if(!frame?.complete||!frame.naturalWidth){frame=frames.reduce((best,item,index)=>item.complete&&item.naturalWidth&&Math.abs(index-idx)<Math.abs((best?.index??-1000)-idx)?{image:item,index}:best,null)?.image;}
 if(frame?.naturalWidth){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(frame,0,0,canvas.width,canvas.height);document.body.classList.add('sequence-ready');}
 const handoff=ease(clamp((p-.87)/.13)), zoom=ease(clamp((p-.66)/.34));const cover=Math.max(stage.clientWidth/w,stage.clientHeight/h);
 canvas.style.opacity=1-handoff;canvas.style.transform=`scale(${1+(cover-1)*zoom})`;
}
window.renderLaptop=draw;
// Load useful anchor frames first; progressively fill the same model's in-between poses.
const order=[0,24,48,...Array.from({length:count},(_,i)=>i).filter(i=>![0,24,48].includes(i))];
let next=0;function load(){const i=order[next++];if(i===undefined)return;const img=new Image();frames[i]=img;img.onload=()=>{draw(progress);load();};img.onerror=()=>{if(i===0)document.body.classList.remove('sequence-enabled');load();};img.src=`frames/${String(i).padStart(3,'0')}.webp`;}
load();load();load();
addEventListener('resize',()=>draw(progress));draw(0);
})();
