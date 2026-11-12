/* Original modern architecture, derived from the approved local direction study.
 * All geometry is original. Existing CC0 material/model loading remains in city-real-assets.js. */
import * as T from './vendor/three.js';
export function createModernArchitecture({scene,mesh,box,beam,renderer,enableEnvironment=false}){
 const footprints=[];scene.userData.modernFootprints=footprints;
 const footprint=(x,z,w,d)=>footprints.push({x,z,w,d});
 const mat=(name,color,extra={})=>new T.MeshStandardMaterial({name,color,roughness:.7,...extra});
 const stone=mat('modern ivory limestone','#deddd3'),glass=mat('modern blue grey window glass','#577784',{metalness:.72,roughness:.17}),silver=mat('modern pearl aluminium','#c9d7dc',{metalness:.7,roughness:.27}),bronze=mat('modern champagne bronze','#9e8e6c',{metalness:.65,roughness:.4}),recess=mat('modern recessed mullions','#253c45',{metalness:.45,roughness:.4}),warm=mat('modern warm interiors','#c0b395',{emissive:'#efc99d',emissiveIntensity:.25}),soil=mat('modern dark planting soil','#303c30'),leaf=mat('modern layered planting foliage','#4d704c',{side:T.DoubleSide,roughness:.8});
 function shape(w,d,r){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);return s;}
 function slab(x,y,z,w,d,h,r,m){const g=new T.ExtrudeGeometry(shape(w,d,r),{depth:h,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:5});g.rotateX(-Math.PI/2);return mesh(g,m,[x,y,z]);}
 function tower(x,z,w,d,h,variant=0,detailed=true){
  footprint(x,z,w,d);
  const radius=Math.min(w,d)*.12;slab(x,.2,z,w,d,h,radius,glass);slab(x,.02,z,w+.6,d+.6,.3,radius,stone);
  const step=detailed?3.4:4.2;
  for(let y=.4;y<h;y+=step){slab(x,y,z,w+.16,d+.16,.13,radius,silver);
   for(let q=-w/2+radius;q<w/2-radius/2;q+=detailed?1.9:2.8)for(const side of [-1,1]){box(x+q,y+Math.min(step-.2,h-y)/2,z+side*(d/2+.03),.045,Math.min(step-.2,h-y),.09,recess);if((Math.round(q*3+y)*7+variant)%19===0&&y<h-step)box(x+q,y+Math.min(step-.2,h-y)/2,z+side*(d/2+.05),1.1,2.3,.035,warm);}
   if(detailed)for(let q=-d/2+radius;q<d/2-radius/2;q+=2)for(const side of [-1,1])box(x+side*(w/2+.03),y+Math.min(step-.2,h-y)/2,z+q,.09,Math.min(step-.2,h-y),.045,recess);
  }
  slab(x,h+.1,z,w+.5,d+.5,.24,radius,silver);slab(x,h+.4,z,w*.6,d*.6,1.2,radius*.7,bronze);
  if(detailed){box(x,2.5,z+d/2+.1,w-3,4,.1,recess);box(x,4.6,z+d/2+.6,w-2,.15,1.3,silver);if(variant%2===0)for(let q=-w/2+1.6;q<w/2-1;q+=2.5)box(x+q,h/2,z+d/2+.16,.1,h,.3,bronze);}
 }
 function pavilion(cx,cz,w=22,d=16,h=6){
  const point=(u,v)=>new T.Vector3(cx+u*w/2,h+1.8*Math.sin((u+.2)*2.1)+1.1*v*v-.5*u*v,cz+v*d/2);
  const positions=[],uv=[],indices=[],nu=44,nv=24;for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){positions.push(...point(i/nu*2-1,j/nv*2-1));uv.push(i/nu,j/nv);if(i<nu&&j<nv){const q=i*(nv+1)+j;indices.push(q,q+nv+1,q+1,q+1,q+nv+1,q+nv+2);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const shell=mat('flowing pearl pavilion shell','#e9e7dd',{metalness:.28,roughness:.34,side:T.DoubleSide});mesh(g,shell).name='modern flowing pavilion';
  for(let i=0;i<=16;i++){const pts=[];for(let j=0;j<=24;j++)pts.push(point(i/16*2-1,j/24*2-1).add(new T.Vector3(0,-.16,0)));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.06,5,false),bronze);}
  for(const v of [-1,1]){const pts=[];for(let i=0;i<=44;i++)pts.push(point(i/44*2-1,v));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),44,.1,6,false),silver);}
  for(const[u,v]of [[-.72,-.65],[.72,-.65],[-.72,.65],[.72,.65]]){const p=point(u,v);beam([p.x,.25,p.z],p.toArray(),.13,silver);footprint(p.x,p.z,.3,.3);}
  slab(cx,.05,cz,w+1,d+1,.16,2,stone);
  // Recessed curved glass enclosure leaves open sight lines under the front of shell.
  for(let i=0;i<24;i++){const t=i/23*Math.PI,x=cx+Math.cos(t)*w*.25,z=cz-Math.sin(t)*d*.22;box(x,1.8,z,w*.038,3.2,.06,glass,t+Math.PI/2);footprint(x,z,w*.04,w*.04);beam([x,.2,z],[x,3.4,z],.018,bronze);}
 }
 function bridge(x0,x1,z){
  const path=new T.CatmullRomCurve3([new T.Vector3(x0,.4,z),new T.Vector3(x0+(x1-x0)*.35,2.3,z-3),new T.Vector3(x0+(x1-x0)*.7,2.1,z-2),new T.Vector3(x1,.4,z)]);
  for(let i=0;i<64;i++){const p=path.getPoint(i/64),q=path.getPoint((i+1)/64),delta=q.clone().sub(p);const o=mesh(new T.BoxGeometry(4.5,.22,delta.length()+.08),stone,p.clone().add(q).multiplyScalar(.5).toArray());o.rotation.y=Math.atan2(delta.x,delta.z);}
  for(const side of [-1,1]){const pts=[];for(let i=0;i<=64;i++){const p=path.getPoint(i/64),t=path.getTangent(i/64),n=new T.Vector3(t.z,0,-t.x).normalize();const a=p.clone().addScaledVector(n,side*2);pts.push(a.clone().add(new T.Vector3(0,1.05,0)));if(i%3===0)beam(a.toArray(),pts.at(-1).toArray(),.022,silver);}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),64,.035,6,false),silver);}
  const arch=[];for(let i=0;i<=64;i++){const p=path.getPoint(i/64);p.y+=Math.sin(i/64*Math.PI)*9;p.z-=2.5;arch.push(p);}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arch),64,.18,9,false),silver);
  for(let i=3;i<63;i+=3){const p=path.getPoint(i/64);p.z-=1.8;beam(p.toArray(),arch[i].toArray(),.022,silver);}
 }
 function sculpture(x,z){
  footprint(x,z,4,4);
  slab(x,.05,z,5,5,.3,1,stone);
  for(const phase of [0,Math.PI]){const points=[];for(let i=0;i<=50;i++){const t=i/50,a=t*Math.PI*2+phase;points.push(new T.Vector3(x+Math.sin(a)*1.7,.4+t*12,z+Math.cos(a)*1.7));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),64,.22,9,false),silver);}
 }
 function planter(x,z,w=4,d=4,seed=1){
  footprint(x,z,w,d);
  slab(x,.04,z,w,d,.32,1,stone);slab(x,.38,z,w-.4,d-.4,.04,.8,soil);
  let n=seed;const random=()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};const p=[],ix=[];
  for(let i=0;i<Math.round(w*d*9);i++){const xx=x+(random()-.5)*(w-.5),zz=z+(random()-.5)*(d-.5),a=random()*Math.PI*2,height=.35+random()*.55,bend=.2+random()*.2,width=.025+random()*.035,start=p.length/3;for(let j=0;j<=4;j++){const t=j/4;for(const side of [-1,1])p.push(xx+Math.cos(a)*side*width*(1-t)+Math.sin(a)*bend*t*t,.42+height*t,zz-Math.sin(a)*side*width*(1-t)+Math.cos(a)*bend*t*t);if(j<4){const q=start+j*2;ix.push(q,q+1,q+2,q+1,q+3,q+2);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(g,leaf);
 }
 let pmrem,target;
 if(enableEnvironment){const e=new T.Scene();e.background=new T.Color('#c8dce7');const dome=new T.Mesh(new T.SphereGeometry(180,24,12),new T.MeshBasicMaterial({color:'#d8e6ed',side:T.BackSide}));e.add(dome);const panel=new T.Mesh(new T.PlaneGeometry(160,80),new T.MeshBasicMaterial({color:'#ffe3b8'}));panel.position.set(-80,35,30);panel.lookAt(0,0,0);e.add(panel);pmrem=new T.PMREMGenerator(renderer);target=pmrem.fromScene(e,.08);scene.environment=target.texture;dome.geometry.dispose();dome.material.dispose();panel.geometry.dispose();panel.material.dispose();}
 return{tower,pavilion,bridge,sculpture,planter,dispose(){target?.dispose();pmrem?.dispose();}};
}
