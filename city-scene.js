/* Original procedural city artwork and implementation for Naveen's portfolio.
 * Geometry and fallback maps are original; optional CC0 pavement scan from Poly Haven
 * (Charlotte Baglioni), locally hosted with provenance. Three.js is MIT.
 * This is an architectural vertical slice, not a photorealistic city scan.
 */
import * as T from './vendor/three.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

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
  scene.background = new T.Color('#d9b6a7');
  scene.fog = new T.Fog('#d9b6a7', 65, 235);
  const camera = new T.PerspectiveCamera(49, 1, .12, 420);
  const assets = new Set();
  let progress = 0, disposed = false;
  const random = seeded(42);
  const materials = {};
  function material(name, color, extra = {}) {
    const m = new T.MeshStandardMaterial({ color, roughness: .86, ...extra });
    m.name = name; materials[name] = m; return m;
  }
  const stone = material('warm cut limestone', '#c6b5a3');
  const lightStone = material('pale architectural trim', '#e3d2bc');
  const darkStone = material('weathered stone', '#a29082');
  const paving = material('sandstone promenade', '#b7a795');
  const asphalt = material('quiet lane', '#8e8580');
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
  function quayX(z) { return -4 + Math.sin((z+8)*.026)*4.2; }
  const promenade = new T.Shape();
  for(let i=0;i<=240;i++){const z=80-i*2;const x=quayX(z);if(i===0)promenade.moveTo(x,z);else promenade.lineTo(x,z);}
  promenade.lineTo(70,-400);promenade.lineTo(70,80);promenade.closePath();
  const promenadeGeo=new T.ShapeGeometry(promenade);promenadeGeo.rotateX(Math.PI/2);
  // Shape XY -> world XZ after +90deg; the resulting top normals face down, so double-side the paving.
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
  // A curved side lane, not a straight endless road.
  const lane=new T.Shape();
  for(let i=0;i<=192;i++){const z=80-i*2.5;const x=quayX(z)+19;if(!i)lane.moveTo(x,z);else lane.lineTo(x,z);}
  for(let i=192;i>=0;i--){const z=80-i*2.5;lane.lineTo(quayX(z)+26,z);}lane.closePath();
  const laneGeo=new T.ShapeGeometry(lane);laneGeo.rotateX(Math.PI/2);asphalt.side=T.DoubleSide;mesh(laneGeo,asphalt,[0,.07,0]).castShadow=false;
  function building(x,z,w,d,h,index){
    const facade=material('limestone facade '+index,['#b7a396','#c6b09c','#b8a694','#cfbaa5','#b2a297'][index%5]);applySurface(facade,limestoneMaps,.018);
    box(x,h/2,z,w,h,d,facade);
    box(x,.38,z,w+.3,.65,d+.3,darkStone);
    box(x,h-.1,z,w+.6,.4,d+.6,lightStone);
    // A sloping mansard roof, ridge and chimneys break box silhouettes.
    const roofShape=new T.Shape();roofShape.moveTo(-w/2-.3,0);roofShape.lineTo(w/2+.3,0);roofShape.lineTo(w*.32,2.3);roofShape.lineTo(-w*.32,2.3);roofShape.closePath();
    const rg=new T.ExtrudeGeometry(roofShape,{depth:d+.5,bevelEnabled:false});mesh(rg,roof,[x,h,z-d/2-.25]);
    box(x,h+2.35,z,w*.65,.2,d+.55,metal);
    for(let floor=1;floor<h-1;floor+=3.2){
      box(x,floor-.65,z,w+.09,.16,d+.09,lightStone);
      for(let q=-w/2+1.25;q<w/2-.7;q+=2.25){
        const lit=random()>.86?glow:glass;
        for(const side of [-1,1]){
          box(x+q,floor+.6,z+side*(d/2+.018),1.05,1.65,.055,lit);
          box(x+q,floor-.3,z+side*(d/2+.1),1.35,.16,.28,lightStone);
          box(x+q,floor+.6,z+side*(d/2+.06),.055,1.65,.06,lightStone);
          box(x+q,floor+.6,z+side*(d/2+.06),1.05,.055,.06,lightStone);
        }
      }
      for(let q=-d/2+1.3;q<d/2-.7;q+=2.4){
        for(const side of [-1,1]){
          box(x+side*(w/2+.025),floor+.6,z+q,.055,1.65,1.05,random()>.9?glow:glass);
          box(x+side*(w/2+.1),floor-.3,z+q,.28,.16,1.35,lightStone);
          box(x+side*(w/2+.06),floor+.6,z+q,.06,1.65,.055,lightStone);
        }
      }
    }
    for(let q=-w*.3;q<w*.4;q+=w*.55){box(x+q,h+2.5,z-d*.15,.7,1.3,.9,darkStone);box(x+q,h+3.2,z-d*.15,.85,.15,1.05,lightStone);}
    // Recessed ground-floor portal and limestone jambs.
    box(x-w/2-.03,1.4,z,.06,2.5,1.65,metal);box(x-w/2-.14,2.8,z,.3,.25,2.,lightStone);
  }
  for(let i=0;i<11;i++){const z=62-i*17;building(quayX(z)+36+(i%2)*2,z,12+(i%3),13,11+(i%4)*2.4,i);}
  for(let i=0;i<12;i++){building(-58-(i%2)*4,66-i*17,12,12,10+(i%4)*3.0,20+i);}
  for(let i=0;i<7;i++){if(i===3||i===4)continue;building(-48+i*16,-126,13,13,13+(i%3)*6,40+i);}
  // Original masonry bridge. Each span is a filled wall with a true curved arch opening.
  function archSpan(x0,x1,z){
    const w=x1-x0, spring=.1, apex=3.5, top=5.2;
    const sh=new T.Shape();sh.moveTo(0,-1.8);sh.lineTo(0,top);sh.lineTo(w,top);sh.lineTo(w,-1.8);sh.lineTo(w-.8,-1.8);sh.lineTo(w-.8,spring);
    sh.bezierCurveTo(w-.8,apex,(w*.68),apex+.3,w/2,apex+.3);
    sh.bezierCurveTo(w*.32,apex+.3,.8,apex,.8,spring);sh.lineTo(.8,-1.8);sh.closePath();
    const g=new T.ExtrudeGeometry(sh,{depth:6,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:1,curveSegments:16});mesh(g,stone,[x0,0,z-3]);
    box((x0+x1)/2,top+.17,z,w+.1,.3,6.4,lightStone);
    for(const side of [-1,1]){box((x0+x1)/2,top+.65,z+side*3.1,w+.1,.6,.32,stone);box((x0+x1)/2,top+1,z+side*3.1,w+.3,.12,.5,lightStone);}
    // Visible arch-ring voussoirs on both elevations.
    for(let n=0;n<13;n++){const ang=Math.PI*n/12;const px=x0+w/2+Math.cos(ang)*(w/2-.7),py=spring+Math.sin(ang)*3.65;
      for(const side of [-1,1]){const block=mesh(new T.BoxGeometry(.58,.42,.16),lightStone,[px,py,z+side*3.08]);block.rotation.z=ang-Math.PI/2;}}
  }
  for(let i=0;i<5;i++)archSpan(-55+i*11,-44+i*11,-34);
  // Bridge abutment meets the promenade with a broad stair, not an impossible floating deck.
  box(1.5,2.6,-34,3.2,5.2,6.2,stone);
  for(let i=0;i<14;i++)box(1.5,(14-i)*.18,-30+i*.55,3.2,(14-i)*.36,1.1,stone);
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
  for(let z=57,k=0;z>-105;z-=13,k++){const x=quayX(z);lamp(x+2.2,z);tree(x+20.5,z-3,k);if(k%2===0){box(x+9.5,.6,z-2,2.25,.14,.65,bark);box(x+9.5,1.,z-2.3,2.25,.55,.12,bark);box(x+8.7,.3,z-2,.1,.6,.5,metal);box(x+10.3,.3,z-2,.1,.6,.5,metal);}}
  for(let z=60,k=0;z>-110;z-=15,k++){tree(-45,z,k);if(k%2===0)lamp(-42.5,z+4);}
  for(let z=-132,k=0;z>-372;z-=24,k++){tree(quayX(z)+22,z,k);if(k%2===0)tree(-45,z,k);lamp(quayX(z)+2.2,z+7);}
  const foliage=new T.InstancedMesh(leafGeo,leaf,leafMatrices.length);leafMatrices.forEach((m,i)=>{foliage.setMatrixAt(i,m);foliage.setColorAt(i,leafColors[i]);});foliage.castShadow=true;foliage.receiveShadow=true;scene.add(foliage);
  // Slender original lattice landmark; not a copied architectural model.
  const tx=-20,tz=-105;
  const heights=[0,9,19,34,48],radii=[8,5.4,3,1.2,.18];
  for(let c=0;c<4;c++){
    const a=Math.PI/4+c*Math.PI/2;
    for(let j=0;j<heights.length-1;j++){
      const p=[tx+Math.cos(a)*radii[j],heights[j],tz+Math.sin(a)*radii[j]],q=[tx+Math.cos(a)*radii[j+1],heights[j+1],tz+Math.sin(a)*radii[j+1]];beam(p,q,.23,metal);
      const a2=a+Math.PI/2;const r=[tx+Math.cos(a2)*radii[j+1],heights[j+1],tz+Math.sin(a2)*radii[j+1]];beam(p,r,.075,metal,5);
    }
  }
  for(let j=1;j<4;j++){const r=radii[j]+.7;box(tx,heights[j],tz,r*1.5,.4,r*1.5,metal);}
  beam([tx,48,tz],[tx,54,tz],.1,metal);cylinder(tx,0,tz,9,.4,stone,32);
  // Observation wheel beyond the bridge; subtle real geometry, quiet ambient rotation.
  const wheel=new T.Group();wheel.position.set(-49,13,-85);scene.add(wheel);
  const ring=new T.Mesh(new T.TorusGeometry(10.7,.11,6,80),metal);wheel.add(ring);
  const inner=new T.Mesh(new T.TorusGeometry(10.3,.055,5,80),metal);wheel.add(inner);
  for(let n=0;n<20;n++){
    const a=n*Math.PI/10;const line=new T.Mesh(new T.CylinderGeometry(.035,.035,10.6,5),metal);line.position.set(Math.cos(a)*5.3,Math.sin(a)*5.3,0);line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(a),Math.sin(a),0));wheel.add(line);
    const cab=new T.Mesh(new T.BoxGeometry(.85,1.2,.8),lightStone);cab.position.set(Math.cos(a)*10.7,Math.sin(a)*10.7,0);wheel.add(cab);cab.userData.gondola=true;
  }
  beam([-53,0,-84],[-49,13,-85],.23,metal);beam([-45,0,-84],[-49,13,-85],.23,metal);
  // About arrival: sculpture and stone directory. Typography is rendered locally, not a billboard image download.
  box(10,.16,-66,15,.3,13,lightStone);
  cylinder(14,.8,-67,1.6,1.5,darkStone,32);
  const sculpture=new T.Mesh(new T.TorusKnotGeometry(.95,.13,96,8,2,3),metal);sculpture.position.set(14,2.5,-67);sculpture.rotation.set(.2,.6,.3);sculpture.castShadow=true;scene.add(sculpture);
  box(4,1.13,-64,4.8,2.2,.35,darkStone);
  const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=512;const sc=signCanvas.getContext('2d');
  if(sc){sc.fillStyle='#cbbca9';sc.fillRect(0,0,1024,512);sc.fillStyle='#393d40';sc.textAlign='center';sc.font='500 34px Arial';sc.fillText('01  /  THE ARRIVAL',512,155);sc.font='500 80px Arial';sc.fillText('ABOUT ME',512,280);sc.font='26px Arial';sc.fillText('SOFTWARE ENGINEER',512,365);}
  const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;assets.add(signTexture);
  const signMaterial=new T.MeshStandardMaterial({map:signTexture,roughness:.9});mesh(new T.PlaneGeometry(4.6,2.1),signMaterial,[4,1.15,-63.81]);
  // The following districts are deliberately original architecture, not models of employers/products.
  const districts=[
    {p:.12,name:'ABOUT ME',label:'THE ARRIVAL',x:8,z:-55},
    {p:.25,name:'SKILLS',label:'THE ENGINEERING QUARTER',x:11,z:-100},
    {p:.38,name:'CODETRAIL',label:'PROJECT / CODETRAIL',x:7,z:-151},
    {p:.50,name:'LUMICARE',label:'PROJECT / LUMICARE',x:12,z:-198},
    {p:.62,name:'MYWISHLIST',label:'PROJECT / MYWISHLIST',x:6,z:-245},
    {p:.76,name:'EXPERIENCE',label:'THE PROFESSIONAL JOURNEY',x:10,z:-292},
    {p:.92,name:'CONTACT',label:'LET’S BUILD SOMETHING',x:6,z:-344}
  ];
  function directory(d,index){
    const z=d.z-10,x=Math.max(quayX(z)+3,d.x-7);
    box(x,1.13,z,5.4,2.2,.35,darkStone);
    const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');
    if(ctx){ctx.fillStyle='#d6c6ae';ctx.fillRect(0,0,1024,512);ctx.fillStyle='#303a3e';ctx.textAlign='center';ctx.font='500 28px Arial';ctx.fillText(String(index+1).padStart(2,'0')+' / '+d.label,512,155);ctx.font='500 '+(d.name.length>9?'64':'80')+'px Arial';ctx.fillText(d.name,512,280);ctx.font='26px Arial';ctx.fillText(index===6?'NAVEEN ACHANTA':'NAVEEN ACHANTA / PORTFOLIO',512,365);}
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;assets.add(texture);
    const mat=new T.MeshStandardMaterial({map:texture,roughness:.9});mesh(new T.PlaneGeometry(5.2,2.1),mat,[x,1.15,z+.19]);
  }
  for(let i=1;i<districts.length;i++){
    const d=districts[i];directory(d,i);
    box(d.x+2,.10,d.z-8,21,.18,24,lightStone);
    // A varied far-bank skyline keeps the river inhabited without walling in the route.
    building(-59,d.z-4,13,14,11+(i%3)*3.5,70+i);
    if(i!==3&&i!==6)building(38,d.z+12,12,14,11+(i%2)*4,80+i);
  }
  // Skills: open classical colonnade, visible between the avenue trees.
  for(let j=0;j<7;j++){
    const z=-91-j*3.5;cylinder(23,3.3,z,.34,6.6,lightStone,12);cylinder(28,3.3,z,.34,6.6,lightStone,12);
    box(25.5,6.7,z,6,.45,3.55,lightStone);box(23,.25,z,1.1,.5,1.1,stone);box(28,.25,z,1.1,.5,1.1,stone);
  }
  // CodeTrail: modern technical atelier with a repeated shaded glass façade.
  box(30,6,-158,14,12,23,glass);box(30,12.2,-158,15,.4,24,lightStone);
  for(let z=-169;z<-146;z+=2.2){box(22.85,6,z,.25,12,.24,metal);box(22.45,6,z,.7,12,.12,lightStone);}
  for(let y=3;y<12;y+=3)box(22.7,y,-158,.3,.18,23,lightStone);
  // Lumicare: planted civic garden, shallow reflecting fountain and low pavilion.
  cylinder(20,.28,-219,5.6,.5,lightStone,48);cylinder(20,.58,-219,4.8,.08,glass,48);
  for(let n=0;n<8;n++){const a=n*Math.PI/4;cylinder(20+Math.cos(a)*5.1,.58,-219+Math.sin(a)*5.1,.18,.7,stone,8);}
  box(34,2.5,-229,15,5,10,lightStone);box(34,5.3,-229,17,.6,12,stone);box(26.45,2.6,-229,.1,3.8,8,glass);
  // MyWishlist: arcaded boutique frontage, warm display glazing and slim canopies.
  building(31,-253,14,22,9.5,91);
  for(let z=-263;z<-242;z+=4){box(23.85,1.8,z,.12,2.8,2.6,glow);box(22.8,3.4,z,2.3,.14,3.2,roof);}
  // Experience: civic clock tower with a carved base and readable silhouette.
  box(27,11,-300,8,22,8,stone);box(27,22.3,-300,9,.7,9,lightStone);
  const towerCap=mesh(new T.ConeGeometry(6.1,6,4),roof,[27,25.6,-300]);towerCap.rotation.y=Math.PI/4;
  const clockFace=mesh(new T.CircleGeometry(1.8,48),lightStone,[22.98,17.5,-300]);clockFace.rotation.y=-Math.PI/2;
  beam([22.90,17.5,-300],[22.90,18.7,-300],.055,metal);beam([22.88,17.5,-300],[22.88,17.1,-298.9],.055,metal);
  // Contact: an open waterfront pavilion and curved sculpture mark a real destination.
  for(const x of [18,29])for(const z of [-347,-363])cylinder(x,3.2,z,.3,6.4,lightStone,12);
  box(23.5,6.6,-355,14,.45,19,lightStone);box(23.5,.23,-355,16,.35,21,stone);
  const finalSculpture=mesh(new T.TorusGeometry(2.4,.16,12,64),metal,[13,3,-363]);finalSculpture.rotation.y=.45;
  box(13,.5,-363,6,.9,3,lightStone);
  building(35,-389,17,15,11,97);building(-58,-388,18,16,13,98);
  lamp(14,-378);lamp(22,-378);
  // A second arched crossing closes the distant vista, beyond the final camera position.
  for(let i=0;i<5;i++)archSpan(-55+i*11,-44+i*11,-375);
  // Flush all repeated rectangular architecture to material batches.
  for(const [mat,matrices] of batches){const instanced=new T.InstancedMesh(unitBox,mat,matrices.length);matrices.forEach((m,i)=>instanced.setMatrixAt(i,m));instanced.castShadow=true;instanced.receiveShadow=true;scene.add(instanced);}
  // Merge static detail meshes by material to keep bridge masonry/lamps cheap.
  const staticGroups=new Map();
  for(const object of [...scene.children]){
    if(object.isMesh&&!object.isInstancedMesh&&object.material?.isMeshStandardMaterial){
      if(!staticGroups.has(object.material))staticGroups.set(object.material,[]);
      staticGroups.get(object.material).push(object);
    }
  }
  for(const [mat,objects] of staticGroups){
    if(objects.length<2)continue;
    const copies=objects.map(object=>{object.updateMatrixWorld(true);let g=object.geometry.clone();if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}g.applyMatrix4(object.matrixWorld);return g;});
    const merged=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());
    if(merged){const combined=new T.Mesh(merged,mat);combined.castShadow=true;combined.receiveShadow=true;scene.add(combined);objects.forEach(object=>{scene.remove(object);object.geometry.dispose();});}
  }
  scene.add(new T.HemisphereLight('#bdd3df','#8a6c55',2.35));
  const sun=new T.DirectionalLight('#ffdab0',3.1);sun.position.set(-65,65,-115);sun.castShadow=renderer.shadowMap.enabled;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;sun.shadow.camera.near=1;sun.shadow.camera.far=260;sun.shadow.bias=-.001;sun.shadow.normalBias=.04;sun.target.position.set(0,0,-20);scene.add(sun,sun.target);
  const sky=new T.Mesh(new T.SphereGeometry(350,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;void main(){float h=normalize(p).y;vec3 horizon=vec3(.94,.66,.43);vec3 zenith=vec3(.35,.46,.57);vec3 col=mix(horizon,zenith,smoothstep(0.,.85,h));float s=pow(max(0.,dot(normalize(p),normalize(vec3(-.45,.17,-1.)))),120.);col+=vec3(1.,.7,.33)*s*.6;gl_FragColor=vec4(col,1.);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>}` }));sky.material.fog=false;sky.name='Sunset atmosphere';sky.userData.isSky=true;scene.add(sky);
  const routePoints=[
    [11,2.2,44],[13,2.2,24],[11,2.2,6],[7,2.25,-12],[6,2.25,-29],[9,2.2,-43],[8,2.2,-55],
    [9,2.2,-78],[11,2.2,-100],[6,2.2,-126],[7,2.2,-151],[14,2.2,-175],[12,2.2,-198],
    [5,2.2,-220],[6,2.2,-245],[13,2.2,-268],[10,2.2,-292],[5,2.2,-320],[6,2.2,-344],[8,2.2,-354]
  ].map(p=>new T.Vector3(...p));
  const route=new T.CatmullRomCurve3(routePoints,false,'centripetal');route.arcLengthDivisions=1600;
  // Stops are exact spline knots. Within each leg, arc-length sampling makes movement uniform.
  const knots=[{p:0,index:0},...districts.map((d,i)=>({p:d.p,index:6+i*2})),{p:1,index:19}];
  const legs=knots.slice(0,-1).map((a,i)=>{
    const b=knots[i+1],start=a.index/19,end=b.index/19,table=[{t:start,length:0}];let last=route.getPoint(start),length=0;
    for(let j=1;j<=120;j++){const t=start+(end-start)*j/120,pos=route.getPoint(t);length+=last.distanceTo(pos);table.push({t,length});last=pos;}return{a,b,table,length};
  });
  function parameterAt(p){
    const leg=legs.find(l=>p<=l.b.p)||legs[legs.length-1],distance=(p-leg.a.p)/(leg.b.p-leg.a.p)*leg.length;
    let i=1;while(i<leg.table.length-1&&leg.table[i].length<distance)i++;
    const a=leg.table[i-1],b=leg.table[i];return a.t+(b.t-a.t)*(distance-a.length)/(b.length-a.length||1);
  }
  function setProgress(p){
    progress=Math.max(0,Math.min(1,Number(p)||0));const t=parameterAt(progress),position=route.getPoint(t),ahead=position.clone().add(route.getTangent(t).multiplyScalar(7));camera.position.copy(position);ahead.y=position.y-.10;camera.lookAt(ahead);
    // Follow the long journey with the same sun direction and bounded shadow footprint.
    sun.target.position.set(position.x,0,position.z-12);sun.position.set(position.x-65,65,position.z-107);sun.target.updateMatrixWorld();
    sky.position.copy(position);
  }
  function resize(w,h){if(disposed)return;const rect=canvas.getBoundingClientRect();w=w||rect.width||1;h=h||rect.height||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.8?59:49;camera.updateProjectionMatrix();}
  function render(timeMs=0){if(disposed)return;const seconds=options.reducedMotion?0:timeMs*.001;water.uniforms.time.value=seconds;wheel.rotation.z=seconds*.009;wheel.children.forEach(o=>{if(o.userData.gondola)o.rotation.z=-wheel.rotation.z;});renderer.render(scene,camera);}
  function dispose(){if(disposed)return;disposed=true;const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());assets.forEach(t=>t.dispose());unitCylinder.dispose();renderer.dispose();}
  setProgress(0);resize();options.onReady?.();
  return {setProgress,resize,render,dispose,texturesReady,getStops:()=>districts.map(d=>({...d})),getScene:()=>scene,getCamera:()=>camera,setReducedMotion:value=>{options.reducedMotion=!!value;},getProgress:()=>progress,getCameraPose:()=>({position:camera.position.toArray(),quaternion:camera.quaternion.toArray()})};
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
