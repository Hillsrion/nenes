// Calibrated local rig. Inputs and generated assets stay outside Git.
// Rounded axillary repair, volume-preserving helper joints, safe approach paths.
import { readFile, writeFile } from 'node:fs/promises';
import * as T from 'three';
import { PalpationSurface } from './lib/palpation-collision.mjs';
const [input, output] = process.argv.slice(2);
if (!input || !output || input === output) throw Error('Provide separate input and new output GLB paths.');
const source=await readFile(input),jl=source.readUInt32LE(12),g=JSON.parse(source.subarray(20,20+jl));
if(g.skins?.length||g.animations?.length)throw Error('Expected neutral, unrigged input.');
const binary=source.subarray(28+jl),chunks=[binary];let size=binary.length;
function accessor(array,type,componentType=5126){
  const pad=(4-size%4)%4;if(pad){chunks.push(Buffer.alloc(pad));size+=pad;}
  const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=g.bufferViews.length;
  g.bufferViews.push({buffer:0,byteOffset:size,byteLength:bytes.length});chunks.push(bytes);size+=bytes.length;
  const a={bufferView:view,componentType,type,count:array.length/({SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[type])};
  if(type==='SCALAR'){a.min=[Math.min(...array)];a.max=[Math.max(...array)];}
  return g.accessors.push(a)-1;
}
function readAccessor(index){
  const a=g.accessors[index],bv=g.bufferViews[a.bufferView];
  const C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],width={VEC3:3,SCALAR:1}[a.type],count=a.count*width;
  const offset=(bv.byteOffset||0)+(a.byteOffset||0);
  if(bv.byteStride&&bv.byteStride!==width*C.BYTES_PER_ELEMENT){
    const out=new C(count);
    for(let i=0;i<a.count;i++)out.set(new C(Uint8Array.from(binary.subarray(offset+i*bv.byteStride,offset+i*bv.byteStride+width*C.BYTES_PER_ELEMENT)).buffer),i*width);
    return out;
  }
  return new C(Uint8Array.from(binary.subarray(offset,offset+count*C.BYTES_PER_ELEMENT)).buffer);
}
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),smooth=T.MathUtils.smoothstep;
const primitive=g.meshes[0].primitives[0],pos=readAccessor(primitive.attributes.POSITION),indices=readAccessor(primitive.indices),n=pos.length/3;
const neighbors=Array.from({length:n},()=>new Set()),parents=Int32Array.from({length:n},(_,i)=>i);
function root(i){while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;}
// Exported normal/UV seams duplicate vertices. They must share deformation,
// including the newly closed inner arm, even when glTF indices differ.
const coincident=new Map();
for(let i=0;i<n;i++){
  const key=[0,1,2].map(k=>Math.round(pos[i*3+k]*1e6)).join(',');
  const j=coincident.get(key);
  if(j!==undefined){neighbors[i].add(j);neighbors[j].add(i);if(pos[i*3+1]<.195&&pos[j*3+1]<.195)parents[root(i)]=root(j);}
  else coincident.set(key,i);
}
// The full inner arm must be mobile, not just its outermost surface.
for(let t=0;t<indices.length;t+=3)for(let k=0;k<3;k++){
  const i=indices[t+k],j=indices[t+(k+1)%3];neighbors[i].add(j);neighbors[j].add(i);
  if(pos[i*3+1]<.195&&pos[j*3+1]<.195)parents[root(i)]=root(j);
}
const components=new Map();
for(let i=0;i<n;i++)if(pos[i*3+1]<.195){const id=root(i),c=components.get(id)||{n:0,x:0};c.n++;c.x+=pos[i*3];components.set(id,c);}
const armRoots=new Set([...components].filter(([,c])=>c.n>1000&&Math.abs(c.x/c.n)>.115).map(([id])=>id));
if(armRoots.size!==2)throw Error(`Expected two separated arms; found ${armRoots.size}. Run prepare-anais-rig.py first.`);
const influence=new Float32Array(n),free=[];
for(let i=0;i<n;i++){
  const x=Math.abs(pos[i*3]),y=pos[i*3+1],z=pos[i*3+2];
  if(y<.17)influence[i]=armRoots.has(root(i))?1:0;
  else if(y>.28||x<.066)influence[i]=0;
  else if(x>.126&&y<.245)influence[i]=1;
  else{influence[i]=y<.195?(armRoots.has(root(i))?1:0):smooth(x,.075,.128)*(1-smooth(y,.24,.28));free.push(i);}
}
for(let pass=0;pass<450;pass++)for(const i of free){let sum=0;for(const j of neighbors[i])sum+=influence[j];if(neighbors[i].size)influence[i]=sum/neighbors[i].size;}
const bones=[{name:'Torso',parent:-1,p:v()}],helpers=[];
for(const side of [1,-1]){
  const start=bones.length;
  bones.push({name:`Clavicle_${side}`,parent:0,p:v(side*.045,.242,-.014)},
    {name:`UpperArm_${side}`,parent:start,p:v(side*.111,.228,-.013)},
    {name:`Forearm_${side}`,parent:start+1,p:v(side*.127,.075,-.005)},
    {name:`Hand_${side}`,parent:start+2,p:v(side*.155,-.105,.024)});
}
// Sample dual-quaternion blends with ordinary glTF helper joints. Interpolate
// adjacent helpers, avoiding the volume collapse of a single large LBS bend.
const groups=new Map();
for(const side of [1,-1])for(const [kind,divisions] of [['shoulder',12],['elbow',10],['wrist',8]]){
  const ids=[];
  for(let k=0;k<=divisions;k++){ids.push(bones.length);helpers.push({index:bones.length,side,kind,t:k/divisions});bones.push({name:`Volume_${side}_${kind}_${k}`,parent:0,p:v()});}
  groups.set(`${side}_${kind}`,ids);
}
const joints=new Uint16Array(n*4),weights=new Float32Array(n*4);
for(let i=0;i<n;i++){
  const y=pos[i*3+1],side=pos[i*3]>=0?1:-1,arm=influence[i];
  if(arm<.00001){weights[i*4]=1;continue;}
  const fore=1-smooth(y,.050,.100),hand=1-smooth(y,-.125,-.087);
  const kind=arm<.99999?'shoulder':fore<.99999?'elbow':'wrist',amount=kind==='shoulder'?arm:kind==='elbow'?fore:hand;
  const ids=groups.get(`${side}_${kind}`),f=amount*(ids.length-1),lo=Math.floor(f),hi=Math.min(lo+1,ids.length-1);
  joints[i*4]=ids[lo];joints[i*4+1]=ids[hi];weights[i*4]=1-(f-lo);weights[i*4+1]=f-lo;
}
const base=g.nodes.length;
for(const b of bones)g.nodes.push({name:b.name,translation:b.p.clone().sub(b.parent<0?v():bones[b.parent].p).toArray(),rotation:[0,0,0,1],children:[]});
bones.forEach((b,i)=>{if(b.parent>=0)g.nodes[base+b.parent].children.push(base+i);});
const meshNode=g.nodes.findIndex(node=>node.mesh===0),parent=g.nodes.find(node=>node.children?.includes(meshNode));
if(parent)parent.children.push(base);else g.scenes[g.scene||0].nodes.push(base);
g.skins=[{name:'AnaisUpperBodyV2',joints:bones.map((_,i)=>base+i),skeleton:base,inverseBindMatrices:accessor(new Float32Array(bones.flatMap(b=>new T.Matrix4().makeTranslation(-b.p.x,-b.p.y,-b.p.z).toArray())),'MAT4')}];
g.nodes[meshNode].skin=0;primitive.attributes.JOINTS_0=accessor(joints,'VEC4',5123);primitive.attributes.WEIGHTS_0=accessor(weights,'VEC4');
function blendTransform(a,b,t){
  const ar=a.q.toArray(),br=b.q.toArray(),ad=new T.Quaternion(a.p.x,a.p.y,a.p.z,0).multiply(a.q).toArray(),bd=new T.Quaternion(b.p.x,b.p.y,b.p.z,0).multiply(b.q).toArray();
  const sign=a.q.dot(b.q)<0?-1:1;
  const r=new T.Quaternion(...ar.map((x,k)=>x*(1-t)+br[k]*t*sign)),d=new T.Quaternion(...ad.map((x,k)=>(x*(1-t)+bd[k]*t*sign)*.5));
  const length=r.length();r.set(r.x/length,r.y/length,r.z/length,r.w/length);d.set(d.x/length,d.y/length,d.z/length,d.w/length);
  const dot=r.dot(d);d.set(d.x-r.x*dot,d.y-r.y*dot,d.z-r.z*dot,d.w-r.w*dot);d.multiply(r.clone().conjugate());
  return {q:r,p:v(2*d.x,2*d.y,2*d.z)};
}
const identity=()=>({q:new T.Quaternion(),p:v()});
function transform(q,origin,dest){return {q,p:dest.clone().sub(origin.clone().applyQuaternion(q))};}
function solve(shoulder,target,pole,l1,l2){
  const axis=target.clone().sub(shoulder),distance=T.MathUtils.clamp(axis.length(),.01,l1+l2-.0005);axis.normalize();
  const wrist=shoulder.clone().addScaledVector(axis,distance),u=pole.clone().sub(shoulder);u.addScaledVector(axis,-u.dot(axis)).normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
  return {wrist,elbow:shoulder.clone().addScaledVector(axis,along).addScaledVector(u,Math.sqrt(Math.max(0,l1*l1-along*along)))};
}
function path(t,keys){
  if(t<=keys[0][0])return keys[0][1].clone();
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return keys[i-1][1].clone().lerp(keys[i][1],smooth(t,keys[i-1][0],keys[i][0]));
  return keys.at(-1)[1].clone();
}
function orientHand(side,raised){
  const restNormal=v(-side,0,0),restDirection=v(0,-1,0);
  const direction=raised?v(-side,0,0):v(-side*.83,.47,-.30).normalize();
  const normal=raised?v(0,-1,0):v(0,0,-1);
  normal.addScaledVector(direction,-normal.dot(direction)).normalize();
  const rest=new T.Matrix4().makeBasis(restNormal,restDirection,restNormal.clone().cross(restDirection));
  const target=new T.Matrix4().makeBasis(normal,direction,normal.clone().cross(direction));
  return new T.Quaternion().setFromRotationMatrix(target.multiply(rest.invert()));
}
function pose(t,side,phase=0,correction=0){
  const world=bones.map(identity),local=bones.map(identity),transforms=bones.map(identity);
  for(const s of [1,-1]){
    const j=s===1?1:5,raised=s===side,sh=bones[j+1].p,el=bones[j+2].p,wr=bones[j+3].p;
    const lift=smooth(t,.35,2.3),reach=smooth(t,1.7,3.9);
    const clav=new T.Quaternion().setFromAxisAngle(raised?v(0,0,1):v(0,1,0),raised?s*.17*lift:-s*.4*reach);
    const shoulder=sh.clone().sub(bones[j].p).applyQuaternion(clav).add(bones[j].p);
    if(!raised)shoulder.z+=.015*reach; // scapular protraction during cross-body reach
    const target=raised?path(t,[[0,wr],[.35,wr],[1.2,v(s*.30,.17,.055)],[2.3,v(s*.046,.518,.055)]]):
      path(t,[[0,wr],[1.7,wr],[2.45,v(s*.205,.015,.17)],[3.15,v(-side*.045,.14,.20)],[3.9,v(side*(.030+.002*Math.sin(phase)),.177+.002*(1-Math.cos(phase)),.085)]]);
    if(!raised)target.z+=correction;
    const pole=el.clone().lerp(raised?v(s*.36,.31,.05):v(s*.45,0,.24),raised?lift:reach);
    const {wrist,elbow}=solve(shoulder,target,pole,sh.distanceTo(el),el.distanceTo(wr));
    const upper=new T.Quaternion().setFromUnitVectors(el.clone().sub(sh).normalize(),elbow.clone().sub(shoulder).normalize());
    const fore=new T.Quaternion().setFromUnitVectors(wr.clone().sub(el).normalize().applyQuaternion(upper),wrist.clone().sub(elbow).normalize()).multiply(upper);
    const handTarget=orientHand(s,raised);
    const hand=fore.clone().slerp(handTarget,raised?smooth(t,1.2,2.3):smooth(t,2.45,3.9));
    world[j]={q:clav,p:bones[j].p};world[j+1]={q:upper,p:shoulder};world[j+2]={q:fore,p:elbow};world[j+3]={q:hand,p:wrist};
    transforms[j]=transform(clav,bones[j].p,bones[j].p);transforms[j+1]=transform(upper,sh,shoulder);transforms[j+2]=transform(fore,el,elbow);transforms[j+3]=transform(hand,wr,wrist);
    for(let k=j;k<j+4;k++){const par=world[bones[k].parent];local[k]={q:par.q.clone().invert().multiply(world[k].q),p:world[k].p.clone().sub(par.p).applyQuaternion(par.q.clone().invert())};}
  }
  for(const h of helpers){
    const j=h.side===1?1:5,pair=h.kind==='shoulder'?[identity(),transforms[j+1]]:h.kind==='elbow'?[transforms[j+1],transforms[j+2]]:[transforms[j+2],transforms[j+3]];
    transforms[h.index]=blendTransform(...pair,h.t);local[h.index]=transforms[h.index];
  }
  return {local,transforms};
}
function deform(transforms,output,ids=null){
  const matrices=transforms.map(({q,p})=>new T.Matrix4().compose(p,q,v(1,1,1)).elements);
  for(let i=0;i<n;i++){
    if(ids&&!ids.has(i))continue;const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];let ox=0,oy=0,oz=0;
    for(let k=0;k<2;k++){const w=weights[i*4+k];if(!w)continue;const m=matrices[joints[i*4+k]];ox+=w*(m[0]*x+m[4]*y+m[8]*z+m[12]);oy+=w*(m[1]*x+m[5]*y+m[9]*z+m[13]);oz+=w*(m[2]*x+m[6]*y+m[10]*z+m[14]);}
    output[i*3]=ox;output[i*3+1]=oy;output[i*3+2]=oz;
  }
}
// Pose-space relaxation removes the hard skinning creases on the reconstructed
// axilla. Keep the central chest, breasts below the fold and hands anchored.
const relaxIds=[],relaxWeight=new Float32Array(n);
for(let i=0;i<n;i++){
  const x=Math.abs(pos[i*3]),y=pos[i*3+1];
  const w=smooth(x,.066,.085)*(1-smooth(x,.15,.18))*smooth(y,.165,.192)*(1-smooth(y,.270,.305));
  if(w>0){relaxIds.push(i);relaxWeight[i]=w;}
}
const strainEdges=[],seenEdges=new Set();
for(let t=0;t<indices.length;t+=3)for(let k=0;k<3;k++){
  const a=indices[t+k],b=indices[t+(k+1)%3];
  if(!relaxWeight[a]&&!relaxWeight[b])continue;
  const key=Math.min(a,b)*n+Math.max(a,b);if(seenEdges.has(key))continue;seenEdges.add(key);
  strainEdges.push([a,b,Math.hypot(pos[a*3]-pos[b*3],pos[a*3+1]-pos[b*3+1],pos[a*3+2]-pos[b*3+2])]);
}
function relaxShoulders(positions,t){
  const amount=smooth(t,.35,1.5);if(!amount)return positions;
  const next=positions.slice();
  for(let pass=0;pass<60;pass++){
    const factor=pass%2===0?.5:-.32;
    for(const i of relaxIds){
      let x=0,y=0,z=0;for(const j of neighbors[i]){x+=positions[j*3];y+=positions[j*3+1];z+=positions[j*3+2];}
      const count=neighbors[i].size,w=factor*relaxWeight[i]*amount;
      if(count){next[i*3]=positions[i*3]+w*(x/count-positions[i*3]);next[i*3+1]=positions[i*3+1]+w*(y/count-positions[i*3+1]);next[i*3+2]=positions[i*3+2]+w*(z/count-positions[i*3+2]);}
    }
    for(const i of relaxIds)for(let k=0;k<3;k++)positions[i*3+k]=next[i*3+k];
  }
  // The back of the axillary fold is very narrow in the scan. Bound local
  // edge extension instead of allowing it to stretch into a thin membrane.
  for(let pass=0;pass<30;pass++)for(const [a,b,length] of strainEdges){
    const x=positions[b*3]-positions[a*3],y=positions[b*3+1]-positions[a*3+1],z=positions[b*3+2]-positions[a*3+2],current=Math.hypot(x,y,z);
    if(current<=length*3||current<1e-9)continue;
    const sum=relaxWeight[a]+relaxWeight[b],factor=(1-length*3/current)*.65*amount*Math.min(1,sum);
    const wa=factor*relaxWeight[a]/sum,wb=factor*relaxWeight[b]/sum;
    positions[a*3]+=wa*x;positions[a*3+1]+=wa*y;positions[a*3+2]+=wa*z;
    positions[b*3]-=wb*x;positions[b*3+1]-=wb*y;positions[b*3+2]-=wb*z;
  }
  return positions;
}
// All hand/forearm vertices and triangle interiors are tested against the
// torso AND the opposite raised arm, not against a fixed imaginary plane.
const collision=new Map();
for(const side of [1,-1]){
  const body=[],samples=[],moving=i=>Math.sign(pos[i*3])===-side&&influence[i]>.05,tested=i=>moving(i)&&pos[i*3+1]<.04;
  for(let i=0;i<n;i++)if(tested(i))samples.push([i]);
  for(let i=0;i<indices.length;i+=3){const tri=Array.from(indices.subarray(i,i+3));if(!tri.some(moving))body.push(...tri);if(tri.every(tested))samples.push(tri,[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]);}
  const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(pos.slice(),3));geometry.setIndex(body);
  collision.set(side,{surface:new PalpationSurface(geometry),samples,ids:new Set(samples.flat())});
}
const deformed=new Float32Array(pos.length),handPositions=new Float32Array(pos.length),margin=.002;
function safePose(t,side,phase){
  let result=pose(t,side,phase),correction=0;
  // At rest the unmodified scan is authoritative; the initial motion moves
  // outwards, beyond the torso silhouette, before crossing the chest.
  if(t<=2.35)return result;
  const {surface,samples,ids}=collision.get(side);deform(result.transforms,deformed);relaxShoulders(deformed,t);surface.base=deformed;surface.update([]);
  for(let iteration=0;iteration<24;iteration++){
    deform(result.transforms,handPositions,ids);let deficit=0,worst;
    for(const tri of samples){const x=tri.reduce((s,id)=>s+handPositions[id*3],0)/tri.length,y=tri.reduce((s,id)=>s+handPositions[id*3+1],0)/tri.length,z=tri.reduce((s,id)=>s+handPositions[id*3+2],0)/tri.length;const gap=surface.height(x,y)+margin-z;if(gap>deficit){deficit=gap;worst={xyz:[x,y,z],source:Array.from(pos.subarray(tri[0]*3,tri[0]*3+3))};}}
    if(deficit<.0001)return result;
    if(iteration===23)console.log('Unresolved clearance',{t,side,phase,deficit,correction,worst});
    correction+=deficit*1.12;result=pose(t,side,phase,correction);
  }
  throw Error(`No collision-free reach at t=${t}, side=${side}, phase=${phase}`);
}
const fps=30,entryDuration=4,loopDuration=6,cache=new Map();
function sample(t,side,phase=0){const key=`${t.toFixed(6)}_${side}_${phase.toFixed(6)}`;if(!cache.has(key))cache.set(key,safePose(t,side,phase).local);return cache.get(key);}
function sparseAccessor(values){
  const ids=[],data=[];let lo=[0,0,0],hi=[0,0,0];
  for(let i=0;i<n;i++)if(Math.max(...values.subarray(i*3,i*3+3).map(Math.abs))>1e-8){
    ids.push(i);for(let k=0;k<3;k++){const value=values[i*3+k];data.push(value);lo[k]=Math.min(lo[k],value);hi[k]=Math.max(hi[k],value);}
  }
  if(!ids.length){ids.push(0);data.push(0,0,0);}
  const ix=accessor(new Uint32Array(ids),'SCALAR',5125),va=accessor(new Float32Array(data),'VEC3');
  return g.accessors.push({componentType:5126,count:n,type:'VEC3',min:lo,max:hi,sparse:{count:ids.length,indices:{bufferView:g.accessors[ix].bufferView,componentType:5125},values:{bufferView:g.accessors[va].bufferView}}})-1;
}
const corrections=[],normalGeometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(pos.slice(),3));normalGeometry.setIndex(new T.BufferAttribute(indices,1));normalGeometry.computeVertexNormals();
const baseNormals=normalGeometry.attributes.normal.array.slice();primitive.attributes.NORMAL=accessor(baseNormals,'VEC3');
primitive.targets=primitive.targets??[];
const targetNames=g.meshes[0].extras?.targetNames??[];
for(const side of [1,-1])for(let frame=1;frame<=20;frame++){
  const t=frame*.2,result=safePose(t,side,0),posed=new Float32Array(pos.length);deform(result.transforms,posed);
  const relaxed=relaxShoulders(posed.slice(),t),delta=new Float32Array(pos.length);
  const matrices=result.transforms.map(({q,p})=>new T.Matrix4().compose(p,q,v(1,1,1))),matrix=new T.Matrix4(),point=v();
  for(const i of relaxIds){
    matrix.elements.fill(0);
    for(let k=0;k<2;k++){const w=weights[i*4+k],m=matrices[joints[i*4+k]].elements;for(let j=0;j<16;j++)matrix.elements[j]+=w*m[j];}
    point.fromArray(relaxed,i*3).applyMatrix4(matrix.invert());
    for(let k=0;k<3;k++)delta[i*3+k]=point.getComponent(k)-pos[i*3+k];
  }
  const values=normalGeometry.attributes.position.array;
  for(let i=0;i<values.length;i++)values[i]=pos[i]+delta[i];
  normalGeometry.computeVertexNormals();
  const normals=normalGeometry.attributes.normal.array,normalDelta=new Float32Array(pos.length);
  for(let i=0;i<normals.length;i++)normalDelta[i]=normals[i]-baseNormals[i];
  corrections.push({side,t,index:primitive.targets.length});
  primitive.targets.push({POSITION:sparseAccessor(delta),NORMAL:sparseAccessor(normalDelta)});targetNames.push(`axilla_corrective_${side}_${frame}`);
}
g.meshes[0].weights=Array(primitive.targets.length).fill(0);g.meshes[0].extras={...g.meshes[0].extras,targetNames};
function correctionWeights(t,side){
  const weights=Array(primitive.targets.length).fill(0);
  for(const c of corrections)if(c.side===side)weights[c.index]=Math.max(0,1-Math.abs(t-c.t)/.2);
  return weights;
}
g.animations=[];
function clip(name,duration,side,trajectory){
  const count=Math.round(duration*fps)+1,times=Float32Array.from({length:count},(_,i)=>i/fps),timeAccessor=accessor(times,'SCALAR'),rs=bones.map(()=>[]),ts=bones.map(()=>[]);
  const morphWeights=[];
  for(let i=0;i<count;i++){const [entry,phase]=trajectory(i/fps);sample(entry,side,phase).forEach(({q,p},j)=>{rs[j].push(...q.toArray());ts[j].push(...p.toArray());});morphWeights.push(...correctionWeights(entry,side));}
  const animation={name,samplers:[],channels:[]};
  bones.forEach((_,i)=>{for(const [path,values,type] of [['rotation',rs[i],'VEC4'],['translation',ts[i],'VEC3']]){animation.samplers.push({input:timeAccessor,output:accessor(new Float32Array(values),type),interpolation:'LINEAR'});animation.channels.push({sampler:animation.samplers.length-1,target:{node:base+i,path}});}});
  animation.samplers.push({input:timeAccessor,output:accessor(new Float32Array(morphWeights),'SCALAR'),interpolation:'LINEAR'});animation.channels.push({sampler:animation.samplers.length-1,target:{node:meshNode,path:'weights'}});
  g.animations.push(animation);console.log('Generated',name);
}
const fullTime=entryDuration*2+loopDuration;
clip('Anaïs · séquence complète',fullTime,1,t=>t<entryDuration?[t,0]:t<entryDuration+loopDuration?[entryDuration,Math.PI*(t-entryDuration)]:[fullTime-t,0]);
const steps=[{id:'observation',title:'Observation visuelle',start:0,end:0}];
for(const side of [1,-1]){
  const label=side===1?'aisselle':'autre aisselle',name=`Anaïs · ${label}`;
  clip(`${name} · approche`,entryDuration,side,t=>[t,0]);clip(name,loopDuration,side,t=>[entryDuration,Math.PI*t]);clip(`${name} · retrait`,entryDuration,side,t=>[entryDuration-t,0]);
  steps.push({id:side===1?'axilla':'other-side',title:side===1?'Palpation de l’aisselle':'Autre aisselle · mouvement symétrique',start:0,end:loopDuration,clipName:name,entryClipName:`${name} · approche`,exitClipName:`${name} · retrait`});
}
g.extras={...g.extras,modelLabel:'Anaïs · palpation articulée V2',palpationStudy:{version:2,rig:'AnaisUpperBodyV2',duration:fullTime,steps,segments:[],collisionMargin:margin,description:'Séparation axillaire reconstruite, articulations conservant le volume et approche/retrait guidés. Références IMG_7741 et vidéos IMG_7768/7770 ; pas une simulation biomécanique.'}};
g.buffers=[{byteLength:size}];let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const bin=Buffer.concat(chunks),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
await writeFile(output,Buffer.concat([h,json,bh,bin]),{flag:'wx'});console.log({output,vertices:n,bones:bones.length,clips:g.animations.map(a=>a.name)});
