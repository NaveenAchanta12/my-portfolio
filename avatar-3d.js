import * as T from './vendor/three.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
const stage=document.querySelector('.avatar-stage'),button=document.querySelector('.avatar-button'),hint=document.querySelector('.avatar-hint');
const motion=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');let renderer,head,visible=false,frame=0,last=0,targetX=0,targetY=0,currentX=0,currentY=0;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,1,.01,30);camera.position.set(1.32,.42,.035);camera.lookAt(-.04,.245,0);
let initialized=false;
async function start(){if(initialized)return;initialized=true;
try{
 renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.domElement.className='avatar-canvas';renderer.domElement.setAttribute('aria-hidden','true');button.append(renderer.domElement);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.06).texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xc5ddff,0x151b27,1.3));const key=new T.DirectionalLight(0xffeee0,3);key.position.set(3,4,3);scene.add(key);const rim=new T.DirectionalLight(0x4b8fff,2);rim.position.set(-2,3,-2);scene.add(rim);
 const gltf=await new GLTFLoader().loadAsync('./assets/naveen-bust.glb');scene.add(gltf.scene);head=gltf.scene.getObjectByName('HeadLook');if(!head)throw new Error('Missing head control');
 stage.classList.add('avatar-ready');hint.textContent=motion.matches?'Tap the avatar for an introduction.':'Move your cursor. Tap for an introduction.';
 new ResizeObserver(resize).observe(stage);resize();loop();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stage.classList.remove('avatar-ready');hint.textContent='3D paused. Tap the portrait for an introduction.';cancelAnimationFrame(frame);});
}catch(error){stage.classList.remove('avatar-ready');hint.textContent='Portrait preview. Tap for an introduction.';renderer?.dispose();console.warn('Avatar 3D fallback:',error.message);}
}
function resize(){if(!renderer)return;const r=button.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();draw();}
function draw(){if(renderer&&head)renderer.render(scene,camera);}
function loop(time=0){cancelAnimationFrame(frame);if(!head||!visible||document.hidden)return;const dt=Math.min((time-last)/1000,.05)||.016;last=time;const blend=1-Math.exp(-8*dt);currentX+=(targetX-currentX)*blend;currentY+=(targetY-currentY)*blend;head.rotation.set(0,motion.matches?0:currentX,motion.matches?0:currentY);draw();if(!motion.matches)frame=requestAnimationFrame(loop);}
stage.addEventListener('pointermove',e=>{if(motion.matches||!fine.matches)return;const r=stage.getBoundingClientRect();targetX=T.MathUtils.clamp((e.clientX-r.left)/r.width-.5,-.5,.5)*.35;targetY=T.MathUtils.clamp((e.clientY-r.top)/r.height-.5,-.5,.5)*.17;});
stage.addEventListener('pointerdown',e=>{if(motion.matches||fine.matches)return;const r=stage.getBoundingClientRect();targetX=((e.clientX-r.left)/r.width-.5)*.3;targetY=-.04;setTimeout(()=>{targetX=targetY=0;},1100);});
stage.addEventListener('pointerleave',()=>{targetX=targetY=0;});
motion.addEventListener('change',()=>{targetX=targetY=currentX=currentY=0;if(head)head.rotation.set(0,0,0);hint.textContent=motion.matches?'Tap the avatar for an introduction.':'Move your cursor. Tap for an introduction.';draw();loop();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){start();loop();}else cancelAnimationFrame(frame);},{rootMargin:'200px'}).observe(stage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(frame);else loop();});
