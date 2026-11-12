import * as T from './vendor/three.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
const stage=document.querySelector('.stage');
const clamp=n=>Math.max(0,Math.min(1,n)), ease=t=>t*t*(3-2*t);
try {
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
renderer.domElement.className='laptop-render';renderer.domElement.setAttribute('aria-hidden','true');stage.append(renderer.domElement);
const scene=new T.Scene(), camera=new T.PerspectiveCamera(28,1,.01,100);
const pmrem=new T.PMREMGenerator(renderer);const environment=new RoomEnvironment();scene.environment=pmrem.fromScene(environment,.05).texture;environment.dispose();pmrem.dispose();
const metal=new T.MeshStandardMaterial({color:0xa1a7af,metalness:.91,roughness:.24,envMapIntensity:1.2});
const edgeMetal=new T.MeshStandardMaterial({color:0xc9cdd4,metalness:.95,roughness:.16,envMapIntensity:1.5});
const dark=new T.MeshStandardMaterial({color:0x060708,metalness:.15,roughness:.55});
const rubber=new T.MeshStandardMaterial({color:0x17191c,roughness:.8});
const model=new T.Group();scene.add(model);
function box(w,h,d,x,y,z,mat=metal,r=.025,parent=model){const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
// Machined unibody, subtle bottom seam, feet and front opening recess.
box(3.12,.114,2.21,0,0,0,metal,.055);
box(3.104,.021,2.194,0,-.056,0,edgeMetal,.045);
box(.62,.018,.025,0,.051,1.107,dark,.008);
for(const x of [-1.22,1.22])for(const z of [-.82,.82])box(.21,.014,.15,x,-.073,z,rubber,.035);
// Black keyboard well, individually rounded keycaps, larger modifiers and spacebar.
box(2.55,.008,.96,0,.059,-.36,dark,.045);
const keyMaterial=new T.MeshStandardMaterial({color:0x0c0e11,roughness:.46,metalness:.1});
const legends=[['esc','1','2','3','4','5','6','7','8','9','0','−','=','⌫'],['tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],['caps','A','S','D','F','G','H','J','K','L',';','’','return'],['shift','Z','X','C','V','B','N','M',',','.','/','shift']];
const labels=document.createElement('canvas');labels.width=1400;labels.height=600;const lc=labels.getContext('2d');lc.clearRect(0,0,1400,600);lc.fillStyle='#cbd1da';lc.font='22px system-ui';lc.textAlign='center';lc.textBaseline='middle';
for(let row=0;row<5;row++){const count=row===4?7:14;for(let col=0;col<count;col++){const x=-1.17+col*(2.34/(count-1)),z=-.70+row*.175;const w=row===4?(col===3?.94:.19):.15; if(row===4&&[2,4].includes(col))continue;box(w,.016,.145,x,.073,z,keyMaterial,.014);if(row<4)lc.fillText(legends[row][col]||'',(x+1.27)/2.54*1400,(z+.79)/.96*600);}}
const labelTex=new T.CanvasTexture(labels);labelTex.colorSpace=T.SRGBColorSpace;
const labelPlane=new T.Mesh(new T.PlaneGeometry(2.54,.96),new T.MeshBasicMaterial({map:labelTex,transparent:true,depthWrite:false}));labelPlane.rotation.x=-Math.PI/2;labelPlane.position.set(0,.083,-.31);model.add(labelPlane);
// Perforated speaker grilles flanking keyboard, trackpad seam and inset surface.
const speakerCanvas=document.createElement('canvas');speakerCanvas.width=32;speakerCanvas.height=256;const sc=speakerCanvas.getContext('2d');sc.fillStyle='#111722';for(let y=3;y<256;y+=7)for(let x=3;x<32;x+=6){sc.beginPath();sc.arc(x,y,1.3,0,Math.PI*2);sc.fill();}
const speakerTexture=new T.CanvasTexture(speakerCanvas);const speakerMat=new T.MeshBasicMaterial({map:speakerTexture,transparent:true,depthWrite:false});
for(const x of [-1.4,1.4]){const m=new T.Mesh(new T.PlaneGeometry(.15,.92),speakerMat);m.rotation.x=-Math.PI/2;m.position.set(x,.061,-.3);model.add(m);}
box(1.30,.005,.80,0,.059,.63,new T.MeshStandardMaterial({color:0x646e7d,metalness:.8,roughness:.3}),.045);
box(1.285,.005,.785,0,.063,.63,metal,.04);
// Recessed ports on left side. Narrow silver lips frame dark interiors.
for(const z of [-.74,-.40,-.08]){box(.015,.052,.17,-1.56,.002,z,edgeMetal,.012);box(.017,.033,.13,-1.568,.002,z,dark,.01);}
const jack=new T.Mesh(new T.CylinderGeometry(.026,.026,.015,20),dark);jack.rotation.z=Math.PI/2;jack.position.set(-1.565,0,.24);model.add(jack);
box(.018,.045,.25,1.56,0,-.5,dark,.008);
// The physical hinge and lid remain the same objects for the entire scroll.
const hingeBar=new T.Mesh(new T.CylinderGeometry(.052,.052,2.70,24),dark);hingeBar.rotation.z=Math.PI/2;hingeBar.position.set(0,.055,-1.04);model.add(hingeBar);
const hinge=new T.Group();hinge.position.set(0,.069,-1.055);model.add(hinge);
box(3.12,2.025,.052,0,1.0125,0,metal,.045,hinge);
box(3.065,1.965,.012,0,1.014,.030,dark,.04,hinge);
// Custom portfolio display texture; no Apple logos or third-party artwork.
const display=document.createElement('canvas');display.width=1600;display.height=1000;const dc=display.getContext('2d');dc.fillStyle='#000';dc.fillRect(0,0,1600,1000);dc.fillStyle='#d9e7fb';dc.font='500 30px system-ui';dc.fillText('NA',90,95);dc.fillStyle='#8192ac';dc.font='18px system-ui';dc.fillText('SELECTED WORK',1260,95);dc.fillStyle='#93b9ed';dc.font='18px system-ui';dc.fillText('SOFTWARE ENGINEER',90,245);dc.fillStyle='#e3ecfa';dc.font='500 118px system-ui';dc.fillText('Ideas become',80,400);dc.fillStyle='#a9cfff';dc.fillText('working systems.',80,535);dc.fillStyle='#8290a4';dc.font='28px system-ui';dc.fillText('Interface. Infrastructure. Everything in between.',90,625);
for(let i=0;i<3;i++){dc.fillStyle='#101a2b';dc.beginPath();dc.roundRect(90+i*475,730,440,165,18);dc.fill();dc.fillStyle='#b8c9e1';dc.font='28px system-ui';dc.fillText(['CodeTrail','Lumicare','MyWishlist'][i],125+i*475,840);}
const texture=new T.CanvasTexture(display);texture.colorSpace=T.SRGBColorSpace;
const screen=new T.Mesh(new T.PlaneGeometry(2.97,1.855),new T.MeshBasicMaterial({map:texture}));screen.position.set(0,1.035,.038);hinge.add(screen);
box(.23,.045,.014,0,1.975,.044,dark,.01,hinge);
const cameraDot=new T.Mesh(new T.CircleGeometry(.009,16),new T.MeshStandardMaterial({color:0x12253d,metalness:.3,roughness:.1}));cameraDot.position.set(0,1.97,.053);hinge.add(cameraDot);
// Large studio reflection sources give a brushed-aluminium edge without white rods.
scene.add(new T.HemisphereLight(0xd7e6ff,0x101626,1.1));
const key=new T.DirectionalLight(0xe8f1ff,3);key.position.set(-3,5,4);scene.add(key);
const rim=new T.DirectionalLight(0x8cbaff,1.5);rim.position.set(4,2,-4);scene.add(rim);
const soft=new T.PointLight(0xc0daff,1.3,8);soft.position.set(-2,1,3);scene.add(soft);
let width=0,height=0;
function renderLaptop(p){const w=stage.clientWidth,h=stage.clientHeight;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const mobile=w<760,turn=ease(clamp(p/.52)),open=ease(clamp((p-.08)/.48)),zoom=ease(clamp((p-.58)/.42)),handoff=ease(clamp((p-.87)/.13));
 hinge.rotation.x=(68*(1-open)-3*open)*Math.PI/180;
 const yaw=-Math.PI/2*(1-turn);model.rotation.y=yaw;
 // Side profile camera is nearly level, then rises to reveal keys as it turns.
 const fitDistance=Math.max(7.4,3.65/(2*Math.tan(14*Math.PI/180)*camera.aspect));
 const distance=fitDistance+(2.05-fitDistance)*zoom;
 camera.position.set(0,.18+1.05*turn*(1-zoom)+.95*zoom,distance);
 const targetY=(mobile?.24:.36)*(1-zoom)+1.06*zoom;
 camera.lookAt(0,targetY,0);
 // Preserve opening composition: side profile centred in the lower half of the name.
 model.position.set(0,(-.1)*(1-zoom),0);
 renderer.domElement.style.opacity=1-handoff;
 renderer.render(scene,camera);
}
window.renderLaptop=renderLaptop;document.body.classList.add('webgl-ready');document.querySelector('.scene').setAttribute('aria-hidden','true');window.dispatchEvent(new Event('resize'));
renderer.domElement.addEventListener('webglcontextlost',()=>{document.body.classList.remove('webgl-ready');window.renderLaptop=null;});
} catch(error){ console.warn('WebGL laptop unavailable; using continuous CSS fallback.',error); }
