import assert from 'node:assert/strict';
import {cityVerticalFov,createCity} from './city-route-v18.js';
const hfov=(a,v)=>2*Math.atan(a*Math.tan(v*Math.PI/360))*180/Math.PI;
for(const [w,h] of [[390,844],[430,932],[768,1024],[820,1180],[844,390],[1024,768],[1440,900]]) {
 const a=w/h,f=cityVerticalFov(a);assert(f>=49&&f<=88);assert(hfov(a,f)>=47.5);
 if(a>=1)assert.equal(f,49);
 console.log(w,h,'vertical',f.toFixed(2),'horizontal',hfov(a,f).toFixed(2));
}
for(let a=.3;a<3;a+=.001)assert(Math.abs(cityVerticalFov(a+.001)-cityVerticalFov(a))<.15);
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
const c=createCity({getBoundingClientRect:()=>({width:1440,height:900})},{renderer:{shadowMap:{},setPixelRatio(){},setSize(){},render(){},dispose(){}}});
for(const p of [0,.09,.27,.54,.81,.92,1]){c.setProgress(p);const pose=JSON.stringify(c.getCameraPose());c.resize(390,844);c.setProgress(p);assert.equal(JSON.stringify(c.getCameraPose()),pose);c.resize(1440,900);assert.equal(c.getCamera().fov,49);}
c.dispose();console.log('PASS portrait/tablet lens, smooth aspect change, exact desktop lens, identical reversible route');
