/* Progressive local CC0 asset layer. No third-party runtime requests. See asset LICENSES.json. */
import * as T from './vendor/three.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
export function installCityAssets(scene,{width=1024,disabled=false,onReady,modelLoader,textureLoader,memoryGB=globalThis.navigator?.deviceMemory}={}){
 const lowDetail=width<768||(memoryGB&&memoryGB<=4),treeFile=lowDetail?'island_tree_01_lod1.glb':'island_tree_01_lod0.glb';
 const roots=[],resources={geometries:new Set(),materials:new Set(),textures:new Set()},state={tree:disabled?'disabled':'loading',lamp:disabled?'disabled':'loading',stone:disabled?'disabled':'loading',treeVariant:lowDetail?'29.5k':'79k'};let disposed=false;
 const urls=file=>new URL('./assets/city-real-models/'+file,import.meta.url).href;
 function collect(root){root.traverse(o=>{if(o.geometry)resources.geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){resources.materials.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.textures.add(value)}});}
 function release(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v)}});gs.forEach(v=>v.dispose());ms.forEach(v=>v.dispose());ts.forEach(v=>v.dispose());}
 async function loadModel(kind,file,height,positions){
  try{
   const gltf=await (modelLoader||new GLTFLoader()).loadAsync(urls(file));
   if(disposed){release(gltf.scene);return false;}
   collect(gltf.scene);gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene),size=box.getSize(new T.Vector3()),scale=height/Math.max(.001,size.y);
   gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.forceSinglePass=true;for(const v of Object.values(m))if(v?.isTexture)v.anisotropy=4;}}});
   for(const[x,z]of positions){const object=gltf.scene.clone(true);object.scale.multiplyScalar(scale);object.position.add(new T.Vector3(x-(box.min.x+box.max.x)*.5*scale,.2-box.min.y*scale,z-(box.min.z+box.max.z)*.5*scale));object.name='CC0 '+kind+' '+file;object.userData.cityRealAsset=true;scene.add(object);roots.push(object);}
   state[kind]='ready';onReady?.();return true;
  }catch(error){if(!disposed)state[kind]='fallback';return false;}
 }
 async function loadStone(){
  const loader=textureLoader||new T.TextureLoader(),results=await Promise.allSettled(['diff','nor_gl','rough'].map(type=>loader.loadAsync(urls(`beige_wall_001_${type}_1k.jpg`))));const loaded=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  if(disposed||loaded.length!==3){loaded.forEach(t=>t.dispose());if(!disposed)state.stone='fallback';return false;}
  loaded.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.anisotropy=4;t.colorSpace=i===0?T.SRGBColorSpace:T.NoColorSpace;resources.textures.add(t)});
  const mats=new Set();scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.name.includes('limestone')||m.name==='pale architectural trim')mats.add(m)});
  mats.forEach(m=>{m.map=loaded[0];m.normalMap=loaded[1];m.normalScale.set(.22,.22);m.roughnessMap=loaded[2];m.bumpMap=null;m.color.set('#eee9df');m.roughness=.88;m.needsUpdate=true});state.stone='ready';onReady?.();return true;
 }
 const ready=disabled?Promise.resolve([]):Promise.allSettled([
  loadModel('tree',treeFile,6,[[4,-59],[-1,-140]]),
  loadModel('lamp','street_lamp_01_lod0.glb',4.4,[[7,-57],[2,-139]]),loadStone()
 ]);
 return{ready,getState:()=>({...state,count:roots.length}),dispose(){if(disposed)return;disposed=true;roots.forEach(o=>scene.remove(o));resources.geometries.forEach(o=>o.dispose());resources.materials.forEach(o=>o.dispose());resources.textures.forEach(o=>o.dispose());roots.length=0;}};
}
