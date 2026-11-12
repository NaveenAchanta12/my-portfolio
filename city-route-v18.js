/* Separate V18 multi-road local proof. Original procedural city artwork and implementation for Naveen's portfolio.
 * Geometry and fallback maps are original; optional CC0 pavement scan from Poly Haven
 * (Charlotte Baglioni), locally hosted with provenance. Three.js is MIT.
 * This is an architectural vertical slice, not a photorealistic city scan.
 */
import * as T from './vendor/three.js';
import {createModernArchitecture} from './city-modern-architecture.js';
import {installCityAssets} from './city-real-assets.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Keep the desktop lens untouched; narrow screens preserve a useful horizontal
// street corridor rather than cropping it to a ~29 degree slit. Cap vertical
// coverage to avoid extreme wide-angle distortion. Continuous across rotations.
export function cityVerticalFov(aspect) {
  const safeAspect=Math.max(.25,Number(aspect)||1);
  return Math.max(49,Math.min(88,2*Math.atan(Math.tan(24*Math.PI/180)/safeAspect)*180/Math.PI));
}

export function createCity(canvas, options = {}) {
  let renderer;
  try {
    renderer = options.renderer || new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    throw new Error(`The city needs a WebGL-capable browser. ${error.message}`);
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, options.pixelRatioCap || 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = options.shadows !== false;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color('#c9dce6');
  scene.fog = new T.Fog('#c9dce6', 85, 260);
  const camera = new T.PerspectiveCamera(49, 1, .12, 420);
  const assets = new Set();
  let progress = 0, disposed = false;
  const random = seeded(42);
  const materials = {};
  function material(name, color, extra = {}) {
    const m = new T.MeshStandardMaterial({ color, roughness: .86, ...extra });
    m.name = name; materials[name] = m; return m;
  }
  const stone = material('warm cut limestone', '#d5d7ce');
  const lightStone = material('pale architectural trim', '#e0e3d9');
  const darkStone = material('weathered stone', '#a4ada9');
  const paving = material('sandstone promenade', '#c9cdc5');
  const asphalt = material('quiet lane', '#8b999a');
  const metal = material('bronze ironwork', '#3b3f3d', { metalness: .55, roughness: .5 });
  const roof = material('slate mansard roofs', '#525a60', { roughness: .67 });
  const glass = material('muted blue window glass', '#4e606c', { metalness: .3, roughness: .28 });
  const glow = material('warm lit panes', '#d8b27e', { emissive: '#d9a668', emissiveIntensity: .25 });
  const bark = material('tree bark', '#544c3e');
  const leaf = material('olive green foliage', '#66715a');
  const leafLight = material('sunward foliage', '#7e8663');
  const lampGlow = material('lamp light', '#ffe4af', { emissive: '#ffd38e', emissiveIntensity: 1.2 });
  // Original tileable surface maps. Independent seeds keep architecture/camera unchanged.
  // The promenade ShapeGeometry uses world-unit UVs: one paving tile spans 3.2 metres.
  const limestoneMaps = createSurfaceMaps('limestone', 512, 991, 4);
  const pavingMaps = createSurfaceMaps('paving', 512, 772, 1 / 3.2);
  const asphaltMaps = createSurfaceMaps('asphalt', 256, 118, 1 / 2);
  function applySurface(mat, maps, bumpScale) {
    mat.map = maps.diffuse; mat.roughnessMap = maps.roughness;
    mat.bumpMap = maps.height; mat.bumpScale = bumpScale;
    Object.values(maps).forEach(texture => assets.add(texture));
  }
  [stone, lightStone, darkStone].forEach(m => applySurface(m, limestoneMaps, .018));
  applySurface(paving, pavingMaps, .028); applySurface(asphalt, asphaltMaps, .014);
  // Optional locally hosted CC0 scan. Original maps remain active if any file fails.
  // Poly Haven: Cobblestone Pavement, Charlotte Baglioni. See asset provenance manifest.
  let texturesReady=Promise.resolve(false);
  if(!options.skipTextures && !options.renderer){
    const loader=new T.TextureLoader();
    const types=['diff','nor_gl','rough'];
    texturesReady=Promise.allSettled(types.map(type=>loader.loadAsync(new URL(`./assets/city-cc0/cobblestone_pavement_${type}_1k.jpg`,import.meta.url).href))).then(results=>{
      const loaded=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
      if(disposed||loaded.length!==3){loaded.forEach(texture=>texture.dispose());return false;}
      loaded.forEach((texture,index)=>{texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1/2.5,1/2.5);texture.anisotropy=4;texture.colorSpace=index===0?T.SRGBColorSpace:T.NoColorSpace;assets.add(texture);});
      paving.map=loaded[0];paving.normalMap=loaded[1];paving.normalScale.set(.22,.22);
      paving.roughnessMap=loaded[2];paving.bumpMap=null;paving.color.set('#eee9e2');paving.roughness=.95;paving.needsUpdate=true;
      options.onTexturesReady?.();return true;
    });
  }
  // Advance the old grain RNG budget to preserve every existing procedural placement.
  for (let i = 0; i < 128 * 128; i++) random();
  const unitBox = new T.BoxGeometry(1, 1, 1);
  const unitCylinder = new T.CylinderGeometry(1, 1, 1, 10);
  const dummy = new T.Object3D();
  const batches = new Map();
  function box(x, y, z, w, h, d, mat, yaw = 0) {
    let batch = batches.get(mat); if (!batch) { batch = []; batches.set(mat, batch); }
    dummy.position.set(x, y, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(w, h, d); dummy.updateMatrix();
    batch.push(dummy.matrix.clone());
  }
  function mesh(geo, mat, pos = [0,0,0]) {
    const o = new T.Mesh(geo, mat); o.position.set(...pos); o.castShadow = true; o.receiveShadow = true; scene.add(o); return o;
  }
  function cylinder(x,y,z,r,h,mat,segments=10) {
    return mesh(new T.CylinderGeometry(r,r,h,segments),mat,[x,y,z]);
  }
  function beam(a,b,r,mat,segments=6) {
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);
    const o=mesh(new T.CylinderGeometry(r,r,delta.length(),segments),mat,av.clone().add(bv).multiplyScalar(.5).toArray());
    o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
  }
  const modern=createModernArchitecture({scene,mesh,box,beam,renderer,enableEnvironment:!options.renderer});
  function quayX(z) { return -4 + Math.sin((z+8)*.026)*4.2; }
  const promenade = new T.Shape();
  for(let i=0;i<=240;i++){const z=80-i*2;const x=quayX(z);if(i===0)promenade.moveTo(x,z);else promenade.lineTo(x,z);}
  promenade.lineTo(70,-400);promenade.lineTo(70,80);promenade.closePath();
  function faceUp(geometry){
    // +90deg shape rotation maps XY to our XZ coordinates but reverses top winding.
    const ix=geometry.index?.array;if(ix)for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}geometry.computeVertexNormals();return geometry;
  }
  const promenadeGeo=faceUp(new T.ShapeGeometry(promenade).rotateX(Math.PI/2));
  // Up-facing paving receives building/tree shadows without casting a shadow on itself.

  paving.side=T.DoubleSide;const ground=mesh(promenadeGeo,paving,[0,.05,0]);ground.castShadow=false;
  box(0,-2.2,-160,230,3.9,510,darkStone);
  // River is not a photographic plane: subtle original procedural ripple material.
  const water = new T.ShaderMaterial({
    uniforms: { time:{value:0}, fogColor:{value:new T.Color('#d9b6a7')} },
    vertexShader: `varying vec3 world; void main(){vec4 p=modelMatrix*vec4(position,1.); world=p.xyz; gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform float time; uniform vec3 fogColor; varying vec3 world;
      void main(){
        float a=sin(world.x*1.5+world.z*.45+time*.6), b=sin(world.z*2.2-world.x*.6+time*.38);
        vec3 n=normalize(vec3(a*.035,1.,b*.04));vec3 v=normalize(cameraPosition-world);
        float fres=pow(1.-max(dot(n,v),0.),3.);
        vec3 base=mix(vec3(.055,.13,.17),vec3(.22,.32,.35),fres);
        float band=exp(-pow((world.x+24.+sin(world.z*.09)*2.)/9.,2.));
        float shimmer=pow(max(0.,sin(world.z*3.+a*1.6+b)),12.)*band;
        base+=vec3(.56,.29,.12)*shimmer*.65;
        float d=length(cameraPosition-world);float fog=smoothstep(65.,235.,d);
        gl_FragColor=vec4(mix(base,fogColor,fog),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, side:T.DoubleSide
  });
  water.name='procedural rippling water';water.userData.previewColor='#315368';
  const riverGeo=new T.PlaneGeometry(74,510);riverGeo.rotateX(-Math.PI/2);
  const river=mesh(riverGeo,water,[-35,-.18,-160]);river.castShadow=false;river.receiveShadow=false;
  // Quay retaining wall follows the river bend. Repeated coping and rail inserts are instanced.
  for(let z=-390;z<80;z+=2.4){
    const x=quayX(z), yaw=-Math.atan((quayX(z+1)-quayX(z-1))/2);
    box(x,-.65,z,.9,1.45,2.45,darkStone,yaw);
    box(x,.16,z,1.13,.24,2.47,lightStone,yaw);
    if(z>-380 && z<70){box(x+.05,.66,z,.18,1.,.18,stone);box(x+.05,1.17,z,.24,.12,2.45,metal,yaw);}
    // A fine paving rhythm gives foreground movement visible scale.
    box(x+7.5,.065,z,13.2,.012,.035,darkStone,yaw);
  }
  // Far bank: terraces, rows of architecture and trees.
  box(-61,-.02,-160,41,.25,510,paving);
  box(-41,-.65,-160,.9,1.45,510,darkStone);box(-41,.18,-160,1.1,.24,510,lightStone);
  // The obsolete longitudinal lane was removed: it crossed the actual route repeatedly.
  function building(x,z,w,d,h,index){
    if(x>20 && z<22 && z>-160)return;
    if(x>-41 && x<quayX(z)-.5)return; // No building masses standing in the river.
    modern.tower(x,z,w,d,h,index,false);
  }
  for(let i=0;i<11;i++){const z=62-i*17;building(quayX(z)+36+(i%2)*2,z,12+(i%3),13,11+(i%4)*2.4,i);}
  for(let i=0;i<12;i++){building(-58-(i%2)*4,66-i*17,12,12,10+(i%4)*3.0,20+i);}
  for(let i=0;i<7;i++){if(i===3||i===4)continue;building(-48+i*16,-126,13,13,13+(i%3)*6,40+i);}
  // Modern single-arch pedestrian bridge, gently meeting the same river banks.
  modern.bridge(-55,0,-34);
  function lamp(x,z){
    cylinder(x,.22,z,.28,.4,stone);cylinder(x,1.7,z,.07,3.1,metal,8);
    const cap=mesh(new T.ConeGeometry(.28,.27,4),metal,[x,3.62,z]);cap.rotation.y=Math.PI/4;
    mesh(new T.BoxGeometry(.27,.43,.27),lampGlow,[x,3.27,z]);
    for(const dx of [-.16,.16])for(const dz of [-.16,.16])box(x+dx,3.27,z+dz,.025,.5,.025,metal);
  }
  // Original folded leaf geometry, not solid crown blobs or downloaded vegetation.
  // Twenty small leaves form one reusable twig; the whole city shares this geometry.
  const foliageRng=seeded(4801), twigPositions=[],twigIndices=[];
  for(let n=0;n<20;n++){
    const angle=n*2.39996, t=n/19, center=new T.Vector3(Math.cos(angle)*(.08+t*.24),t*.7-.35,Math.sin(angle)*(.08+t*.24));
    const axis=new T.Vector3(Math.cos(angle),.35,Math.sin(angle)).normalize();
    const across=new T.Vector3(-Math.sin(angle),0,Math.cos(angle));
    const length=.16+foliageRng()*.1,width=.052+foliageRng()*.026;
    const base=twigPositions.length/3;
    const vertices=[center.clone().addScaledVector(axis,-length*.5),center.clone().addScaledVector(across,width),center.clone().addScaledVector(axis,length*.5),center.clone().addScaledVector(across,-width),center.clone().add(new T.Vector3(0,.035,0))];
    vertices.forEach(v=>twigPositions.push(...v.toArray()));
    for(let q=0;q<4;q++)twigIndices.push(base+q,base+(q+1)%4,base+4);
  }
  const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(twigPositions,3));leafGeo.setIndex(twigIndices);leafGeo.computeVertexNormals();
  leaf.side=T.DoubleSide;leaf.color.set('#718058');leaf.roughness=.87;
  const leafMatrices=[],leafColors=[];
  function tree(x,z,k){
    // Keep the old architecture RNG stream stable, despite the new independent foliage model.
    for(let i=0;i<108;i++)random();
    const r=foliageRng;
    cylinder(x,1.45,z,.13,2.9,bark,9);box(x,.14,z,1.5,.24,1.5,darkStone);
    const crownCenter=new T.Vector3(x,3.6,z);
    for(let n=0;n<8;n++){
      const angle=n*Math.PI/4+r()*.3,reach=1.0+r()*.6;
      const start=[x,1.8+r()*.55,z],end=[x+Math.cos(angle)*reach,3.25+r()*.85,z+Math.sin(angle)*reach];
      beam(start,end,.035+r()*.018,bark,5);
      for(let j=0;j<2;j++)beam(end,[end[0]+(r()-.5)*.8,end[1]+.45+r()*.4,end[2]+(r()-.5)*.8],.014,bark,4);
    }
    for(let n=0;n<95;n++){
      const az=r()*Math.PI*2,cos=r()*2-1,sin=Math.sqrt(1-cos*cos),rad=Math.pow(r(),1/3);
      dummy.position.set(crownCenter.x+Math.cos(az)*sin*rad*1.65,crownCenter.y+cos*rad*1.65,crownCenter.z+Math.sin(az)*sin*rad*1.65);
      dummy.rotation.set(r()*Math.PI,r()*Math.PI,r()*Math.PI);
      const scale=.85+r()*.45;dummy.scale.setScalar(scale);dummy.updateMatrix();leafMatrices.push(dummy.matrix.clone());
      leafColors.push(new T.Color().setRGB(.86+r()*.14,.88+r()*.12,.82+r()*.16));
    }
  }
  for(let z=57,k=0;z>-105;z-=13,k++){const x=quayX(z);lamp(x+2.2,z);tree(x+(k===8?44:20.5),z-3,k); // Keep the About foreground clear; retain this tree inland.
if(k%2===0){box(x+9.5,.6,z-2,2.25,.14,.65,bark);box(x+9.5,1.,z-2.3,2.25,.55,.12,bark);box(x+8.7,.3,z-2,.1,.6,.5,metal);box(x+10.3,.3,z-2,.1,.6,.5,metal);}}
  for(let z=60,k=0;z>-110;z-=15,k++){tree(-45,z,k);if(k%2===0)lamp(-42.5,z+4);}
  for(let z=-132,k=0;z>-372;z-=24,k++){tree(quayX(z)+22,z,k);if(k%2===0)tree(-45,z,k);lamp(quayX(z)+2.2,z+7);}
  for(const [x,z]of [[-99,-53],[-101,-75],[-98,-108],[-86,-118],[-67,-118],[-53,-113],[-53,-59],[-67,-48]])tree(x,z-100,1);
  const foliage=new T.InstancedMesh(leafGeo,leaf,leafMatrices.length);leafMatrices.forEach((m,i)=>{foliage.setMatrixAt(i,m);foliage.setColorAt(i,leafColors[i]);});foliage.castShadow=true;foliage.receiveShadow=true;scene.add(foliage);
  // Slender original lattice landmark; not a copied architectural model.
  const landmarkMetal=material('lattice landmark satin silver','#9caaa8',{metalness:.65,roughness:.32});
  const tx=-20,tz=-105;
  const heights=[0,9,19,34,48],radii=[8,5.4,3,1.2,.18];
  for(let c=0;c<4;c++){
    const a=Math.PI/4+c*Math.PI/2;
    for(let j=0;j<heights.length-1;j++){
      const p=[tx+Math.cos(a)*radii[j],heights[j],tz+Math.sin(a)*radii[j]],q=[tx+Math.cos(a)*radii[j+1],heights[j+1],tz+Math.sin(a)*radii[j+1]];beam(p,q,.23,landmarkMetal);
      const a2=a+Math.PI/2;const r=[tx+Math.cos(a2)*radii[j+1],heights[j+1],tz+Math.sin(a2)*radii[j+1]];beam(p,r,.075,landmarkMetal,5);
    }
  }
  for(let j=1;j<4;j++){const r=radii[j]+.7;box(tx,heights[j],tz,r*1.5,.4,r*1.5,landmarkMetal);}
  beam([tx,48,tz],[tx,54,tz],.1,landmarkMetal);cylinder(tx,0,tz,9,.4,stone,32);
  // Observation wheel beyond the bridge; subtle real geometry, quiet ambient rotation.
  const wheel=new T.Group();wheel.position.set(-49,14.5,-85);wheel.rotation.y=Math.PI/2;wheel.scale.setScalar(1.15);scene.add(wheel);
  const ring=new T.Mesh(new T.TorusGeometry(10.7,.11,6,80),metal);wheel.add(ring);
  const inner=new T.Mesh(new T.TorusGeometry(10.3,.055,5,80),metal);wheel.add(inner);
  for(let n=0;n<20;n++){
    const a=n*Math.PI/10;const line=new T.Mesh(new T.CylinderGeometry(.035,.035,10.6,5),metal);line.position.set(Math.cos(a)*5.3,Math.sin(a)*5.3,0);line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(a),Math.sin(a),0));wheel.add(line);
    const cab=new T.Mesh(new T.BoxGeometry(.85,1.2,.8),lightStone);cab.position.set(Math.cos(a)*10.7,Math.sin(a)*10.7,0);wheel.add(cab);cab.userData.gondola=true;
  }
  // Batch static wheel metalwork in its local frame; preserve the rotating parent and counter-rotating cabins.
  const wheelStatic=wheel.children.filter(o=>o.isMesh&&!o.userData.gondola);
  const wheelPieces=wheelStatic.map(o=>{o.updateMatrix();let g=o.geometry.clone();if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}return g.applyMatrix4(o.matrix);});
  const wheelGeometry=mergeGeometries(wheelPieces,false);wheelPieces.forEach(g=>g.dispose());
  if(wheelGeometry){const spokes=new T.Mesh(wheelGeometry,metal);spokes.name='batched rotating wheel spokes';wheel.add(spokes);wheelStatic.forEach(o=>{wheel.remove(o);o.geometry.dispose();});}
  beam([-50,0,-91],[-49,14.5,-85],.23,metal);beam([-50,0,-79],[-49,14.5,-85],.23,metal);box(-49,.12,-85,5,.24,27,lightStone);
  // Original scenic coaster across the river. All rails/supports are real shared geometry.
  const coasterRail=material('coaster ivory enamel rails','#d8c7ad',{metalness:.48,roughness:.31});
  const coasterSteel=material('coaster sage steel supports','#526968',{metalness:.55,roughness:.4});
  const coasterCar=material('coaster muted burgundy carriages','#824b4f',{metalness:.3,roughness:.32});
  const parkGrass=material('riverside park meadow','#607157',{roughness:.96});
  box(-77,.04,-184,54,.3,76,parkGrass);
  // Low garden terraces, stone paths and planting soften the riverfront park's boundary.
  box(-48,.16,-185,5,.18,64,lightStone);box(-75,.16,-219,49,.18,3.4,lightStone);
  box(-75,.16,-148,49,.18,3.4,lightStone);
  for(let z=-154;z>=-212;z-=14){lamp(-46,z);box(-51,.35,z,2.1,.55,5,darkStone);box(-51,.69,z,1.85,.2,4.7,parkGrass);}
  const coasterPath=new T.CatmullRomCurve3([
    [-62,5,-60],[-76,9,-54],[-91,22,-64],[-88,34,-82],[-75,12,-99],
    [-60,5,-108],[-54,9,-98],[-62,18,-84],[-73,8,-74]
  ].map(p=>new T.Vector3(p[0],p[1]*1.08,p[2]-100)),true,'centripetal');coasterPath.arcLengthDivisions=1200;
  const railPoints=[[],[]],up=new T.Vector3(0,1,0);
  for(let i=0;i<240;i++){
    const t=i/240,point=coasterPath.getPointAt(t),side=new T.Vector3().crossVectors(coasterPath.getTangentAt(t),up).normalize();
    railPoints[0].push(point.clone().addScaledVector(side,-.68));railPoints[1].push(point.clone().addScaledVector(side,.68));
    if(i%3===0)beam(point.clone().addScaledVector(side,-.79).toArray(),point.clone().addScaledVector(side,.79).toArray(),.055,coasterSteel,5);
    if(i%12===0){
      const foot=point.clone();foot.y=.35;beam(foot.toArray(),point.clone().add(new T.Vector3(0,-.18,0)).toArray(),.17,coasterSteel,7);
      box(foot.x,.29,foot.z,1.3,.35,1.3,lightStone);
      if(point.y>10){const brace=foot.clone().addScaledVector(side,2.7);beam(brace.toArray(),point.clone().add(new T.Vector3(0,-1.2,0)).toArray(),.12,coasterSteel,6);box(brace.x,.29,brace.z,1,.35,1,lightStone);}
    }
  }
  for(const points of railPoints){const curve=new T.CatmullRomCurve3(points,true,'centripetal');const rail=mesh(new T.TubeGeometry(curve,360,.095,7,true),coasterRail);rail.name='continuous coaster rail';}
  const spine=mesh(new T.TubeGeometry(coasterPath,360,.13,7,true),coasterSteel);spine.name='continuous coaster spine';
  // Quiet station canopy and boarding platform, tucked into the lowest section.
  box(-63,4,-160,5,.5,7,lightStone);for(const x of [-65,-61])for(const z of [-163,-157])beam([x,.3,z],[x,7,z],.1,coasterSteel);
  box(-63,7.25,-160,6,.25,8,coasterRail);
  const coasterTrain=[];
  for(let i=0;i<3;i++){
    const car=new T.Group();car.name='coaster carriage '+i;car.scale.setScalar(1.08);
    const body=new T.Mesh(new T.BoxGeometry(1.22,.65,1.75),coasterCar);body.position.y=.45;body.castShadow=true;car.add(body);
    const seat=new T.Mesh(new T.BoxGeometry(.85,.55,.18),metal);seat.position.set(0,.9,.4);seat.castShadow=true;car.add(seat);
    for(const x of [-.52,.52]){const edge=new T.Mesh(new T.BoxGeometry(.09,.35,1.6),coasterRail);edge.position.set(x,.9,0);car.add(edge);}
    scene.add(car);coasterTrain.push(car);
  }
  function animateCoaster(seconds){
    const lead=(.34+seconds*.0075)%1;
    coasterTrain.forEach((car,i)=>{const t=(lead-i*.009+1)%1,p=coasterPath.getPointAt(t),direction=coasterPath.getTangentAt(t);car.position.copy(p).add(new T.Vector3(0,.16,0));car.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);});
  }
  animateCoaster(0);
  // Connected short streets surround real blocks rather than one long waterfront corridor.
  const routeCoordinates=[
    [8,3,-10],[7,3,-25],[8,3,-42],[12,3,-53],[22,3,-56],[30,3,-56],
    [42,3,-56],[51,3,-48],[52,3,-36],[56,3,-31],[66,3,-34],[72,3,-44],[73,3,-54],
    [72,3,-67],[63,3,-77],[49,3,-78],[35,3,-80],[27,3,-90],[26,3,-101],[25,3,-112],[15,3,-123],[5,3,-128],[1,3,-133]
  ];
  const route=new T.CatmullRomCurve3(routeCoordinates.map(p=>new T.Vector3(...p)),false,'centripetal');route.arcLengthDivisions=1800;
  // Ten content stops share the unchanged compact street spline. Project details live in UI data.
  const districts=[
    {id:'about',p:0.09,index:2,name:'ABOUT ME',street:'RIVERSIDE WALK'},
    {id:'skills',p:0.18,index:5,name:'SKILLS',street:'ENGINEERING BOULEVARD'},
    {id:'experience',p:0.27,index:8,name:'EXPERIENCE',street:'CIVIC WAY'},
    {id:'codetrail',p:0.36,index:10,name:'CODETRAIL',street:'CODETRAIL AVENUE'},
    {id:'lumicare',p:0.45,index:12,name:'LUMICARE',street:'GARDEN STREET'},
    {id:'golivescore',p:0.54,index:15,name:'GOLIVESCORE',street:'LIVE DATA LANE'},
    {id:'wishlist',p:0.63,index:16.5,name:'MYWISHLIST',street:'MARKET ARCADE'},
    {id:'jobhunt',p:0.72,index:18,name:'JOBHUNT',street:'WORK IN PROGRESS'},
    {id:'ai',p:0.865,index:20.25,name:'AI ENGINEERING',street:'INTELLIGENCE WALK'},
    {id:'contact',p:0.92,index:21,name:'CONTACT',street:'HARBOUR SQUARE'}
  ].map(d=>{const position=route.getPoint(d.index/(routeCoordinates.length-1));return{...d,x:position.x,z:position.z};});
  const boulevard=material('V18 charcoal road','#404349',{roughness:.93});
  const pathStone=material('V18 pale sidewalks','#b8b5b0');applySurface(pathStone,limestoneMaps,.014);
  const towerGlass=material('V18 reflective midnight curtain wall','#40566c',{metalness:.7,roughness:.19});
  const towerSilver=material('V18 satin aluminium','#768b9e',{metalness:.7,roughness:.3});
  const warmPane=material('V18 warm interior light','#c1a784',{emissive:'#e8ad6e',emissiveIntensity:.55});
  const accent=material('V18 blue architectural light','#80afbf',{emissive:'#73afce',emissiveIntensity:.7});
  const green=material('V18 planted borders','#435a46');
  // Extra inland ground; old river, bridge, wheel and lattice tower remain unchanged.
  box(89,-.08,-72,84,.18,195,paving);
  function roadRibbon(curve,width,y,mat,offset=0){
    const positions=[],uv=[],indices=[],steps=260;
    for(let i=0;i<=steps;i++){
      const t=i/steps,c=curve.getPoint(t),d=curve.getTangent(t),n=new T.Vector3(-d.z,0,d.x).normalize();
      for(const side of [-1,1]){const v=c.clone().addScaledVector(n,offset+width*.5*side);positions.push(v.x,y,v.z);uv.push(side===-1?0:width,t*curve.getLength());}
      if(i<steps){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mat.side=T.DoubleSide;const o=mesh(geo,mat);o.castShadow=false;
  }
  // A coherent boulevard replaces overlapping road planes. Actual sidewalk strips sit
  // outside the carriageway, not a full raised sheet covering the road surface.
  const curbStone=material('boulevard pale precast curb','#c8ccc7',{roughness:.8});
  const roadPaint=material('boulevard ivory road paint','#d9dbd2',{roughness:.94});
  roadRibbon(route,7.2,.195,boulevard);
  for(const side of [-1,1]){
    roadRibbon(route,2.5,.325,pathStone,side*4.85);
    roadRibbon(route,.075,.204,roadPaint,side*3.25);
  }
  const roadLength=route.getLength();
  // Continuous solid kerbs avoid overlapping short-box joints and floating sidewalk edges.
  function continuousKerb(side,offset,width,bottom,top,dropped){
    const positions=[],indices=[],steps=520;
    for(let i=0;i<=steps;i++){const u=i/steps,p=route.getPointAt(u),t=route.getTangentAt(u),n=new T.Vector3(-t.z,0,t.x);let y=top;
      if(dropped){const distance=Math.min(...districts.map(d=>Math.hypot(p.x-d.x,p.z-d.z)));y=.225+(top-.225)*Math.max(0,Math.min(1,(distance-1.8)/1.2));}
      for(const[delta,height]of [[-width/2,bottom],[width/2,bottom],[width/2,y],[-width/2,y]]){const v=p.clone().addScaledVector(n,side*offset+delta);positions.push(v.x,height,v.z);}
      if(i<steps)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;indices.push(a,a+4,b,b,a+4,b+4);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,curbStone);
  }
  for(const side of [-1,1]){continuousKerb(side,3.68,.2,.19,.335,true);continuousKerb(side,6.06,.12,.05,.35,false);}
  // Broken centre line is omitted around in-road titles/crossings to keep them legible.
  const titlePoints=districts.map(d=>route.getPoint(Math.min(1,d.index/(routeCoordinates.length-1)+.035)));
  for(let distance=2;distance<roadLength-2;distance+=6){const u=distance/roadLength,p=route.getPointAt(u),t=route.getTangentAt(u);if(titlePoints.some(d=>Math.hypot(p.x-d.x,p.z-d.z)<5)||districts.some(d=>Math.hypot(p.x-d.x,p.z-d.z)<2.5))continue;box(p.x,.207,p.z,.075,.012,2.2,roadPaint,Math.atan2(t.x,t.z));}
  // No disconnected cross-road slabs: the compact multi-bend boulevard already links all districts.
  // Crosswalk strips and recessed lane lights provide consistent human-scale distance cues.
  for(const [i,d]of districts.entries()){
    const tangent=route.getTangent(d.index/(routeCoordinates.length-1)),yaw=Math.atan2(tangent.x,tangent.z);
    if(i>0)for(let n=-3;n<=3;n++)box(d.x+Math.cos(yaw)*n*.9,.205,d.z-Math.sin(yaw)*n*.9,.5,.015,2.2,lightStone,yaw);
  }
  function modernTower(x,z,w,d,h,variant){modern.tower(x,z,w,d,h,variant,true);}
  modernTower(31,-30,13,15,43,0);modernTower(60,-3,15,17,68,1);
  modernTower(101,-39,17,20,82,2);modernTower(100,-72,15,17,53,3);
  modernTower(66,-108,16,16,61,4);modernTower(45,-136,14,16,39,5);
  modern.tower(86,-52,9,12,32,6,true);modern.tower(87,-105,10,11,28,7,true);modern.tower(10,-153,10,10,24,8,true);
  // Smaller frontages make each road recognizably different without unrelated landmarks.
  modern.pavilion(37,-68,17,10,7); // Cafe canopy reveals itself around the first road bend.
  modern.tower(62,-20,7,13,5.6,1,false);
  cylinder(92,.35,-58,4.2,.6,lightStone,40);cylinder(92,.7,-58,3.6,.07,glass,40);
  for(let j=0;j<6;j++)cylinder(39+j*3,.95,-87,.35,1.8,green,10);
  // Contemporary river pavilion and sculptural civic destination; exact road stays unchanged.
  modern.pavilion(-10,-58,18,15,6);
  modern.sculpture(40,-111);
  modern.pavilion(20,-139,15,13,6);
  for(const [x,z,w,d]of [[1,-49,3,4],[20,-67,4,4],[45,-41,3,4],[66,-64,4,5],[55,-86,5,3],[18,-107,4,4],[9,-139,4,5]])modern.planter(x,z,w,d,Math.round(x*9-z));
  // Original human-scale neighbourhood pockets, no commercial branding or affiliation.
  const cafeGreen=material('Neighbourhood cafe forest enamel','#284b4b',{roughness:.42});
  const timber=material('Neighbourhood warm oak','#795c40',{roughness:.78});
  const schoolBrick=material('School terracotta masonry','#c2cdc8',{roughness:.93});
  const playgroundRubber=material('Playground muted sand safety surface','#9d927b',{roughness:1});
  const playBlue=material('Playground powder coated teal','#3e747c',{metalness:.25,roughness:.45});
  function frontageSign(text,x,y,z,width,height,yaw=0){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
    if(ctx){ctx.fillStyle='#173c32';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#efe5d0';ctx.textAlign='center';ctx.font='500 74px Arial';ctx.fillText(text,512,155);}
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;assets.add(tex);
    const mat=new T.MeshBasicMaterial({map:tex,toneMapped:false});
    const sign=mesh(new T.PlaneGeometry(width,height),mat,[x,y,z]);sign.rotation.y=yaw;sign.name=text+' neighbourhood sign';
  }
  // Cafe takes over a frontage on the Skills street, with shaded pavement seating.
  box(37.2,3.1,-63.87,11.8,.8,.2,cafeGreen);
  frontageSign('QUAY COFFEE',37.2,3.12,-63.75,7.8,.65);
  box(37.2,2.65,-62.9,11.8,.16,2.1,cafeGreen);
  for(const x of [32.3,42.1])cylinder(x,1.4,-62,.045,2.8,metal,8);
  for(const x of [33.5,40.5]){
    cylinder(x,.96,-61.7,.62,.09,timber,20);cylinder(x,.53,-61.7,.055,.8,metal,8);
    for(const dz of [-.8,.8]){box(x,.56,-61.7+dz,.55,.1,.55,timber);box(x,.82,-61.7+dz+(dz<0?-.22:.22),.55,.6,.07,timber);for(const dx of [-.2,.2])box(x+dx,.3,-61.7+dz,.045,.5,.42,metal);}
  }
  // A low-rise school faces Learning Walk. Set back beyond the route clearance.
  box(11,3.25,-104,12,6.1,14,schoolBrick);box(11,6.45,-104,12.7,.3,14.7,lightStone);
  box(17.12,1.8,-104,.13,3,2.2,towerGlass);box(18,3.45,-104,2,.18,4,lightStone);
  for(const z of [-109,-106,-102,-99])for(const y of [2.3,4.8]){box(17.08,y,z,.12,1.6,1.6,towerGlass);box(17.18,y-.85,z,.25,.13,1.9,lightStone);box(17.18,y,z,.12,1.6,.07,towerSilver);}
  frontageSign('RIVERSIDE SCHOOL',17.22,5.7,-104,8,.7,Math.PI/2);
  box(18.1,.24,-104,2.5,.12,4,pathStone);
  for(const z of [-111.5,-96.5]){box(13,.6,z,10,.9,.6,lightStone);box(13,1.1,z,9.8,.4,.5,green);}
  // Small playable-looking park, not a game UI: safe proportions, no moving hazards.
  box(59,.23,-59,11,.12,13,pathStone);box(59,.32,-59,9.9,.1,11.8,playgroundRubber);
  for(const z of [-65.1,-52.9]){box(59,.54,z,11,.5,.45,lightStone);box(59,.87,z,10.8,.25,.35,green);}
  // Two-seat A-frame swings; chains stay static to respect calm/reduced-motion use.
  for(const x of [55.8,60]){beam([x,.45,-62],[x,2.85,-60.8],.055,playBlue,8);beam([x,.45,-59.6],[x,2.85,-60.8],.055,playBlue,8);}
  beam([55.6,2.85,-60.8],[60.2,2.85,-60.8],.075,playBlue,10);
  for(const x of [57,58.8]){for(const dx of [-.25,.25])beam([x+dx,2.8,-60.8],[x+dx,.8,-60.8],.012,metal,5);box(x,.76,-60.8,.65,.1,.38,timber);}
  // Climbing platform and continuous curved stainless slide.
  for(const x of [60.7,62.1])for(const z of [-56.9,-55.5])box(x,.95,z,.1,1.45,.1,playBlue);
  box(61.4,1.65,-56.2,1.6,.12,1.6,timber);
  for(const x of [60.7,62.1]){beam([x,1.65,-56.9],[x,2.45,-56.9],.035,playBlue);beam([x,2.45,-56.9],[x,2.45,-55.5],.035,playBlue);}
  for(let j=0;j<5;j++)box(61.4,.46+j*.24,-54.1-j*.28,1,.08,.3,timber);
  const slideCurve=new T.CatmullRomCurve3([new T.Vector3(61.4,1.68,-56.9),new T.Vector3(61.4,1.5,-57.5),new T.Vector3(61.4,.7,-58.3),new T.Vector3(61.4,.45,-59)]);
  for(let j=0;j<20;j++){const a=slideCurve.getPoint(j/20),b=slideCurve.getPoint((j+1)/20),mid=a.clone().add(b).multiplyScalar(.5);const panel=mesh(new T.BoxGeometry(.85,.04,a.distanceTo(b)+.02),towerSilver,mid.toArray());panel.rotation.x=-Math.atan2(a.y-b.y,a.z-b.z);}
  for(const dx of [-.43,.43]){const curve=new T.CatmullRomCurve3(slideCurve.points.map(p=>p.clone().add(new T.Vector3(dx,.1,0))));mesh(new T.TubeGeometry(curve,20,.035,6,false),towerSilver);}
  // Layered original feather-palm crowns: arched fronds with folded, swept leaflets.
  // Shared geometry keeps larger, fuller silhouettes affordable; no downloaded foliage.
  const palmLeaf=material('V18 palm fronds','#42624b',{side:T.DoubleSide,roughness:.83});
  const pv=[],pi=[];
  function palmBlade(base,tip,width,across){const mid=base.clone().lerp(tip,.44),i=pv.length/3;const ridge=mid.clone().add(new T.Vector3(0,.055,0));pv.push(...base.toArray(),...mid.clone().addScaledVector(across,width).toArray(),...tip.toArray(),...mid.clone().addScaledVector(across,-width).toArray(),...ridge.toArray());for(let k=0;k<4;k++)pi.push(i+k,i+(k+1)%4,i+4);}
  for(let k=0;k<18;k++){
    const angle=k*2.39996,layer=k%3,length=layer===0?3.25:4.1+(k%4)*.2,rise=layer===0?1.9:1.1,drop=layer===0?.2:2.6;
    const direction=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),across=new T.Vector3(-Math.sin(angle),0,Math.cos(angle));
    const point=t=>direction.clone().multiplyScalar(t*length).add(new T.Vector3(0,Math.sin(t*Math.PI)*rise-drop*t*t,0));
    for(let j=1;j<=19;j++){const t=j/20,center=point(t),leafLength=(Math.sin(t*Math.PI)*.68+.22)*(layer===0?.8:1);for(const side of [-1,1]){const tip=center.clone().addScaledVector(across,side*leafLength).addScaledVector(direction,.28+leafLength*.24).add(new T.Vector3(0,-.16-t*.23,0));palmBlade(center,tip,.055+.055*Math.sin(t*Math.PI),direction);}
      const prev=point((j-1)/20);palmBlade(prev,center,.018,across);
    }
  }
  const palmGeo=new T.BufferGeometry();palmGeo.setAttribute('position',new T.Float32BufferAttribute(pv,3));palmGeo.setIndex(pi);palmGeo.computeVertexNormals();const palmMatrices=[];
  const palmSites=[[16,-35],[22,-45],[33,-47],[43,-45],[43,-33],[46,-22],[61,-13],[76,-27],[81,-45],[80,-61],[65,-68],[54,-86],[39,-86],[18,-88],[18,-107],[28,-121],[13,-138],[31,-139],[95,-20],[92,-83]];
  for(let i=0;i<palmSites.length;i++){const[x,z]=palmSites[i],h=8.4+i%3*.65;const trunk=new T.CatmullRomCurve3([new T.Vector3(x,.15,z),new T.Vector3(x+.12,h*.4,z+.06),new T.Vector3(x+.55,h*.8,z+.14),new T.Vector3(x+.8,h,z+.18)]);mesh(new T.TubeGeometry(trunk,9,.17,7,false),bark);dummy.position.set(x+.8,h,z+.18);dummy.rotation.set(0,i*2.4,0);dummy.scale.setScalar(.9+(i%3)*.07);dummy.updateMatrix();palmMatrices.push(dummy.matrix.clone());box(x,.25,z,1.6,.4,1.6,green);}
  const palms=new T.InstancedMesh(palmGeo,palmLeaf,palmMatrices.length);palmMatrices.forEach((m,i)=>palms.setMatrixAt(i,m));palms.castShadow=true;scene.add(palms);
  // Labels appear as lettering on the street rather than opaque content billboards.
  for(const d of districts){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
    if(ctx){ctx.clearRect?.(0,0,1024,256);ctx.fillStyle='#fff1d6';ctx.textAlign='center';ctx.font='600 88px Arial';ctx.fillText(d.name,512,110);ctx.font='32px Arial';ctx.fillText(d.street,512,185);}
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;assets.add(texture);const m=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
    const t=d.index/(routeCoordinates.length-1),ahead=route.getPoint(Math.min(1,t+.035)),direction=route.getTangent(t);
    const label=mesh(new T.PlaneGeometry(6.3,1.58),m,[ahead.x,.22,ahead.z]);label.rotation.x=-Math.PI/2;label.rotation.z=-Math.atan2(direction.x,-direction.z);label.castShadow=false;
  }
  // Flush all repeated rectangular architecture to material batches.
  for(const [mat,matrices] of batches){const instanced=new T.InstancedMesh(unitBox,mat,matrices.length);matrices.forEach((m,i)=>instanced.setMatrixAt(i,m));instanced.castShadow=mat!==roadPaint;instanced.receiveShadow=true;scene.add(instanced);}
  // Merge static detail meshes by material to keep bridge masonry/lamps cheap.
  const staticGroups=new Map();
  for(const object of [...scene.children]){
    if(object.isMesh&&!object.isInstancedMesh&&object.material?.isMeshStandardMaterial){
      // Do not turn receiver-only roads into shadow casters when batching by material.
      const key=object.material.uuid+'|'+Number(object.castShadow)+'|'+Number(object.receiveShadow);
      if(!staticGroups.has(key))staticGroups.set(key,[]);
      staticGroups.get(key).push(object);
    }
  }
  for(const objects of staticGroups.values()){
    const mat=objects[0].material;
    if(objects.length<2)continue;
    const copies=objects.map(object=>{object.updateMatrixWorld(true);let g=object.geometry.clone();if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}g.applyMatrix4(object.matrixWorld);return g;});
    const merged=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());
    if(merged){const combined=new T.Mesh(merged,mat);combined.castShadow=objects[0].castShadow;combined.receiveShadow=objects[0].receiveShadow;scene.add(combined);objects.forEach(object=>{scene.remove(object);object.geometry.dispose();});}
  }
  scene.add(new T.HemisphereLight('#c9dfed','#a5a18d',1.8));
  const sun=new T.DirectionalLight('#ffe0ad',3.5);sun.position.set(-65,38,20);sun.castShadow=renderer.shadowMap.enabled;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.near=1;sun.shadow.camera.far=260;sun.shadow.bias=-.001;sun.shadow.normalBias=.04;sun.target.position.set(0,0,-20);scene.add(sun,sun.target);
  const sky=new T.Mesh(new T.SphereGeometry(350,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;void main(){float h=normalize(p).y;vec3 horizon=vec3(.88,.86,.77);vec3 zenith=vec3(.47,.65,.78);vec3 col=mix(horizon,zenith,smoothstep(0.,.85,h));float s=pow(max(0.,dot(normalize(p),normalize(vec3(-.65,.38,.4)))),120.);col+=vec3(1.,.7,.33)*s*.6;gl_FragColor=vec4(col,1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>}` }));sky.material.fog=false;sky.name='Sunset atmosphere';sky.userData.isSky=true;scene.add(sky);
  // The removed education marker retains only its camera control point.
  const knots=[{p:0,index:0},...districts.filter(d=>d.id!=='ai').map(d=>({p:d.p,index:d.index})),{p:.81,index:19.5},{p:1,index:22}].sort((a,b)=>a.p-b.p);
  // One world-distance table keeps the camera on the existing street spline.
  // Monotone cubic distance interpolation removes the old speed discontinuity at stops.
  const routeSamples=[...new Set([...Array.from({length:4097},(_,i)=>i/4096),...knots.map(k=>k.index/22)])].sort((a,b)=>a-b);
  const arc=[{t:0,d:0}];let arcLast=route.getPoint(0),arcLength=0;
  for(const t of routeSamples.slice(1)){const point=route.getPoint(t);arcLength+=point.distanceTo(arcLast);arc.push({t,d:arcLength});arcLast=point;}
  function arcAt(t){let lo=0,hi=arc.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m].t<t)lo=m;else hi=m;}const a=arc[lo],b=arc[hi];return a.d+(b.d-a.d)*(t-a.t)/(b.t-a.t);}
  const distances=knots.map(k=>arcAt(k.index/22));
  const spans=knots.slice(1).map((k,i)=>k.p-knots[i].p);
  const rates=spans.map((h,i)=>(distances[i+1]-distances[i])/h);
  const slopes=rates.map((rate,i)=>{if(i===0)return rate;const left=spans[i-1],right=spans[i],w1=2*right+left,w2=right+2*left;return(w1+w2)/(w1/rates[i-1]+w2/rate);});slopes.push(rates.at(-1));
  function distanceAt(p){let i=0;while(i<spans.length-1&&p>knots[i+1].p)i++;const u=(p-knots[i].p)/spans[i],u2=u*u,u3=u2*u;return(2*u3-3*u2+1)*distances[i]+(u3-2*u2+u)*spans[i]*slopes[i]+(-2*u3+3*u2)*distances[i+1]+(u3-u2)*spans[i]*slopes[i+1];}
  function parameterAtDistance(d){d=Math.max(0,Math.min(arcLength,d));let lo=0,hi=arc.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m].d<d)lo=m;else hi=m;}const a=arc[lo],b=arc[hi];return a.t+(b.t-a.t)*(d-a.d)/(b.d-a.d||1);}
  // Spatially filtered heading, not a time-lagged camera spring. Identical pose when
  // revisiting a point in reverse; average a short street corridor to anticipate bends.
  const headingSamples=[[-6,1],[-4,2],[-2,3],[0,4],[2,5],[4,4],[6,3],[8,2],[10,1]];
  let lastCameraProgress=null;
  function setProgress(p){
    const nextProgress=Math.max(0,Math.min(1,Number(p)||0));
    if(nextProgress===lastCameraProgress)return;
    lastCameraProgress=nextProgress;
    progress=Math.max(0,Math.min(1,Number(p)||0));const distance=distanceAt(progress),t=parameterAtDistance(distance),position=route.getPoint(t),heading=new T.Vector3();
    for(const [offset,weight]of headingSamples)heading.addScaledVector(route.getTangent(parameterAtDistance(distance+offset)),weight);
    heading.y=0;heading.normalize();const ahead=position.clone().addScaledVector(heading,7);ahead.y=position.y-.15;
    camera.position.copy(position);camera.up.set(0,1,0);camera.lookAt(ahead);
    sun.target.position.set(position.x,0,position.z-12);sun.position.set(position.x-65,65,position.z-107);sun.target.updateMatrixWorld();sky.position.copy(position);
  }
  function resize(w,h){if(disposed)return;const rect=canvas.getBoundingClientRect();w=w||rect.width||1;h=h||rect.height||1;renderer.setSize(w,h,false);camera.aspect=w/h;const aspectBlend=Math.max(0,Math.min(1,(w/h-.65)/.30));camera.fov=59-10*aspectBlend*aspectBlend*(3-2*aspectBlend);camera.updateProjectionMatrix();}
  function render(timeMs=0){if(disposed)return;const seconds=options.reducedMotion?0:timeMs*.001;water.uniforms.time.value=seconds;animateCoaster(seconds);wheel.rotation.z=seconds*.009;wheel.children.forEach(o=>{if(o.userData.gondola)o.rotation.z=-wheel.rotation.z;});renderer.render(scene,camera);}
  function dispose(){if(disposed)return;disposed=true;modern.dispose();realAssets.dispose();const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());assets.forEach(t=>t.dispose());unitCylinder.dispose();renderer.dispose();}
  const realAssets=installCityAssets(scene,{width:canvas.getBoundingClientRect().width,disabled:!!options.renderer||!!options.skipTextures,onReady:options.onTexturesReady});
  texturesReady=Promise.all([texturesReady,realAssets.ready]);
  setProgress(0);resize();options.onReady?.();
  return {setProgress,resize,render,dispose,texturesReady,getAssetState:()=>realAssets.getState(),getStops:()=>districts.map(d=>({...d})),getRouteLength:()=>route.getLength(),getScene:()=>scene,getCamera:()=>camera,setReducedMotion:value=>{options.reducedMotion=!!value;},getProgress:()=>progress,getCameraPose:()=>({position:camera.position.toArray(),quaternion:camera.quaternion.toArray()})};
}
function seeded(seed){return()=>{seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Pure Canvas2D pixel synthesis, not downloaded photography. Modest relief avoids noisy shimmer.
function createSurfaceMaps(kind, size, seed, repeat) {
  const rng=seeded(seed), maps={}, channels={};
  for(const name of ['diffuse','roughness','height']){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const context=canvas.getContext('2d');const pixels=context?.createImageData(size,size);
    channels[name]={canvas,context,pixels};
  }
  const slabs=Array.from({length:32},()=>rng());
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,grain=(rng()-.5),fine=(rng()-.5);
    // Periodic broad mineral variation makes opposite edges tile seamlessly.
    const cloud=Math.sin(u*Math.PI*4+Math.sin(v*Math.PI*2))*.5+Math.sin(v*Math.PI*6+Math.cos(u*Math.PI*2))*.3;
    let value=235+cloud*5+grain*12, height=150+cloud*12+fine*30, rough=230+grain*12;
    if(kind==='paving'){
      const row=Math.floor(v*8),sx=u*4+(row%2)*.5,col=Math.floor(sx)%4;
      const fx=sx-Math.floor(sx),fy=v*8-row;
      const edge=Math.min(fx,1-fx,fy*.5,(1-fy)*.5);
      const joint=edge<.014,bevel=Math.min(1,edge/.035);
      const variation=(slabs[row*4+col]-.5)*22;
      value=joint?137+grain*13:228+variation+cloud*4+grain*9-(1-bevel)*14;
      height=joint?45+grain*8:140+bevel*42+fine*13;
      rough=joint?244:225+grain*14;
    }else if(kind==='asphalt'){
      const aggregate=rng()>.97?24:0;
      value=206+grain*24+aggregate+cloud*4;height=135+grain*42+aggregate;rough=240+grain*12;
    }
    for(const [name,n] of [['diffuse',value],['roughness',rough],['height',height]]){
      const a=channels[name].pixels?.data;if(!a)continue;const i=(y*size+x)*4;
      a[i]=a[i+1]=a[i+2]=Math.max(0,Math.min(255,Math.round(n)));a[i+3]=255;
    }
  }
  for(const [name,c] of Object.entries(channels)){
    if(c.context&&c.pixels)c.context.putImageData(c.pixels,0,0);
    const texture=new T.CanvasTexture(c.canvas);texture.name=`original ${kind} ${name}`;
    texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(repeat,repeat);
    texture.anisotropy=4;texture.colorSpace=name==='diffuse'?T.SRGBColorSpace:T.NoColorSpace;maps[name]=texture;
  }
  return maps;
}
