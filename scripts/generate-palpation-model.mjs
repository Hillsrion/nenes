// Local animation study calibrated for bust-zou-full-multiview-hi3d.glb.
// Preserve the source binary and use sparse morphs to keep the full-resolution mesh.
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import {PalpationSurface, collisionSamples} from './lib/palpation-collision.mjs';

const [input = 'private-3d-inputs/palpation-study/bust-zou-animation-base.glb', output = 'public/models/bust-zou-full-multiview-hi3d-palpation.glb'] = process.argv.slice(2);
if (input === output) throw new Error('Use a separate output file.');
const source = await readFile(input);
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength));
const bin = source.subarray(28 + jsonLength, 28 + jsonLength + source.readUInt32LE(20 + jsonLength));
const primitive = gltf.meshes[0].primitives[0];
if (primitive.targets || gltf.animations) throw new Error('Expected an unanimated source model.');
const chunks = [bin];
let byteLength = bin.length;
function bufferView(array) {
  const padding = (4 - byteLength % 4) % 4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const index = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length });
  chunks.push(bytes); byteLength += bytes.length;
  return index;
}
function accessor(array, type, componentType = 5126) {
  const size = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
  const a = { bufferView: bufferView(array), componentType, count: array.length / size, type };
  if (type === 'VEC3' || type === 'SCALAR') {
    a.min = Array(size).fill(Infinity); a.max = Array(size).fill(-Infinity);
    for (let i = 0; i < array.length; i++) {
      a.min[i % size] = Math.min(a.min[i % size], array[i]);
      a.max[i % size] = Math.max(a.max[i % size], array[i]);
    }
  }
  gltf.accessors.push(a); return gltf.accessors.length - 1;
}
function readAccessor(index) {
  const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView];
  if ((v.byteStride && v.byteStride !== (a.type === 'VEC3' ? 12 : 4)) || a.sparse) throw new Error('Expected tightly packed source.');
  const start = (v.byteOffset || 0) + (a.byteOffset || 0);
  const bytes = bin.subarray(start, start + a.count * (a.type === 'VEC3' ? 3 : 1) * 4);
  return a.componentType === 5126 ? new Float32Array(Uint8Array.from(bytes).buffer) : new Uint32Array(Uint8Array.from(bytes).buffer);
}
const positions = readAccessor(primitive.attributes.POSITION);
const normals = readAccessor(primitive.attributes.NORMAL);
const indices = readAccessor(primitive.indices);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setIndex(new THREE.BufferAttribute(indices, 1));
const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
mesh.updateMatrixWorld(true);
const ray = new THREE.Raycaster();
function surfacePoint(origin, direction = new THREE.Vector3(0, 0, -1)) {
  ray.set(origin, direction);
  const hit = ray.intersectObject(mesh)[0];
  if (!hit) throw new Error(`No surface at ${origin.toArray()}`);
  return hit.point;
}
const fingerOffsets = [-0.023, 0, 0.023];
const smooth = (value) => { const t = THREE.MathUtils.clamp(value, 0, 1); return t*t*(3-2*t); };
const siteSteps=JSON.parse(await readFile(new URL('../config/self-examination-steps.json',import.meta.url),'utf8'));
const specifications=[];
for (const side of [1,-1]) {
  const cx=side===1?0.17:-0.131, cy=side===1?0.18:0.147;
  // Two concentric passes sampled in alternating quadrants, progressing inward.
  for(let i=0;i<9;i++) {
    const angle=i*Math.PI/2, radius=0.072*(1-i/10);
    const x=cx+side*radius*Math.cos(angle);
    specifications.push({x:side===1?Math.min(x,0.222):x,y:cy+radius*Math.sin(angle),side,kind:'breast',duration:3.6});
  }
  // Arm is down in the source scan: show its accessible anterior axillary fold
  // and the bridge toward the upper outer breast, without inventing an arm rig.
  for(const [x,y] of [[0.247,0.31],[0.23,0.28],[0.205,0.25]])specifications.push({x:x*side,y,side,kind:'axilla',duration:3.6});
  specifications.push({x:cx,y:cy,side,kind:'nipple',duration:4});
}
let sequenceTime=0;
const stations = specifications.map(spec => {
  const {x,y}=spec; const start=sequenceTime; sequenceTime+=spec.duration;
  const center = surfacePoint(new THREE.Vector3(x,y,1));
  // Fit the contact plane over the pads' footprint instead of using a noisy triangle normal.
  const dzdx = (surfacePoint(new THREE.Vector3(x+0.015,y,1)).z - surfacePoint(new THREE.Vector3(x-0.015,y,1)).z)/0.03;
  const dzdy = (surfacePoint(new THREE.Vector3(x,y+0.015,1)).z - surfacePoint(new THREE.Vector3(x,y-0.015,1)).z)/0.03;
  const normal = new THREE.Vector3(-dzdx,-dzdy,1).normalize();
  const u = new THREE.Vector3(1,0,dzdx).normalize();
  const v = new THREE.Vector3().crossVectors(normal,u).normalize();
  const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,normal));
  const contacts = fingerOffsets.map(offset => {
    const p = center.clone().addScaledVector(u,offset);
    return surfacePoint(p.clone().addScaledVector(normal,0.3),normal.clone().negate());
  });
  return { ...spec, start, end:sequenceTime, center,normal,u,v,rotation,contacts };
});
console.log(`Prepared ${stations.length} contact stations over ${sequenceTime.toFixed(1)} seconds`);
const names = stations.flatMap((_, i) => [`palpation_contact_${i+1}`,`palpation_tissue_${i+1}`]);
primitive.targets = [];
gltf.meshes[0].weights = names.map(() => 0);
gltf.meshes[0].extras = { ...gltf.meshes[0].extras, targetNames: names };
function sparse(values, selected) {
  const min = [0,0,0], max = [0,0,0];
  values.forEach((v,i) => { min[i%3] = Math.min(min[i%3],v); max[i%3] = Math.max(max[i%3],v); });
  gltf.accessors.push({ componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max,
    sparse: { count: selected.length, indices: { bufferView: bufferView(new Uint32Array(selected)), componentType: 5125 }, values: { bufferView: bufferView(new Float32Array(values)) } } });
  return gltf.accessors.length - 1;
}
// Reduced soft-body model: constrained pad indentation plus a damped bulk mode.
// Tissue moves in all three axes, with a broad shoulder and no sharp displacement cutoff.
// The back and the edge of the breast remain anchored. This is an artistic approximation.
function displacement(point, station, bulk) {
  const {center,normal,u,v,contacts} = station;
  const relative = point.clone().sub(center);
  const a=relative.dot(u), b=relative.dot(v), depth=relative.dot(normal);
  const radius2=(a/0.070)**2+(b/0.065)**2;
  const boundary = 1-smooth((radius2-2)/4);
  const front = 1-smooth((-depth-0.035)/0.095);
  const mask=boundary*front;
  if (!mask) return new THREE.Vector3();
  if (!bulk && station.kind==='nipple') {
    const local=Math.exp(-((a/0.032)**2+(b/0.027)**2)*1.5)*mask;
    return u.clone().multiplyScalar(-a*0.32*local).addScaledVector(normal,0.002*local);
  }
  if (!bulk) {
    let pads=0;
    for (const contact of contacts) {
      const local=point.clone().sub(contact);
      // The indentation must support the pads' full footprint, including the
      // trailing phalanges. Narrow craters let the sides cut through their rim.
      const r=(local.dot(u)/0.032)**2+(local.dot(v)/0.042)**2;
      pads=Math.max(pads,Math.exp(-r*1.15));
    }
    const indentation=(0.018*pads+0.009*Math.exp(-radius2*1.3))*mask;
    return normal.clone().multiplyScalar(-indentation);
  }
  const shoulder=Math.exp(-radius2*0.7)*mask;
  const ring=(1-Math.exp(-radius2*3))*shoulder;
  return normal.clone().multiplyScalar(-0.007*shoulder+0.013*ring)
    .addScaledVector(u,a/0.070*0.011*shoulder)
    .addScaledVector(v,b/0.065*0.009*shoulder-0.006*shoulder);
}
const collisionMorphs = [];
for (const station of stations) for (const bulk of [false,true]) {
  const deformed = positions.slice(), selected = [], deltas = [];
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    const d=displacement(point.fromArray(positions,i),station,bulk);
    if (d.lengthSq()<1e-14) continue;
    deformed[i] += d.x; deformed[i+1] += d.y; deformed[i+2] += d.z;
    selected.push(i/3); deltas.push(d.x,d.y,d.z);
  }
  const deformedGeometry = geometry.clone();
  deformedGeometry.setAttribute('position', new THREE.BufferAttribute(deformed,3));
  deformedGeometry.computeVertexNormals();
  const deformedNormals = deformedGeometry.getAttribute('normal').array;
  const normalSelected = [], normalDeltas = [];
  // Include adjacent faces as well so lighting remains smooth at the boundary.
  for (let i=0;i<normals.length;i+=3) {
    const d = [0,1,2].map(k=>deformedNormals[i+k]-normals[i+k]);
    if (d.some(v=>Math.abs(v)>0.0001)) { normalSelected.push(i/3); normalDeltas.push(...d); }
  }
  primitive.targets.push({ POSITION: sparse(deltas, selected), NORMAL: sparse(normalDeltas, normalSelected) });
  deformedGeometry.dispose();
  for(let i=0;i<deformed.length;i++)deformed[i]-=positions[i];
  collisionMorphs.push(new THREE.BufferAttribute(deformed,3));
}
geometry.morphAttributes.position=collisionMorphs;
geometry.morphTargetsRelative=true;
const collisionSurface=new PalpationSurface(geometry);

// A separate ivory glove makes the moving contact readable on the rose bust.
const material = gltf.materials.length;
gltf.materials.push({ name: 'Palpation · gant ivoire', pbrMetallicRoughness: { baseColorFactor: [0.92,0.82,0.62,1], metallicFactor: 0, roughnessFactor: 0.55 } });
const hand = gltf.nodes.length;
gltf.nodes.push({ name: 'PalpationHand', translation: stations[0].center.clone().addScaledVector(stations[0].normal,0.022).toArray(), rotation:stations[0].rotation.toArray(), children: [] });
// Sibling of the bust mesh: all calibration and motion use its original axes.
const parent = gltf.nodes.find(node => node.children?.includes(2));
parent.children.push(hand);
const handParts = [];
function ellipsoid(name, center, scale, rotation = 0, parentNode = hand) {
  const g = new THREE.SphereGeometry(1, 20, 14);
  g.scale(...scale); g.rotateZ(rotation); g.translate(...center);
  const m = gltf.meshes.length;
  gltf.meshes.push({ primitives: [{ attributes: { POSITION: accessor(g.attributes.position.array,'VEC3'), NORMAL: accessor(g.attributes.normal.array,'VEC3') }, indices: accessor(new Uint32Array(g.index.array),'SCALAR',5125), material }] });
  const n = gltf.nodes.length;
  gltf.nodes.push({ name, mesh: m, extras: { preserveMaterial: true } });
  gltf.nodes[parentNode].children.push(n);
  handParts.push({name,parentNode,samples:collisionSamples(g,2)});
  g.dispose();
}
ellipsoid('Paume', [0,-0.088,0.065], [0.040,0.042,0.019]);
ellipsoid('Poignet', [0,-0.136,0.080], [0.026,0.034,0.018]);
const fingerNodes = fingerOffsets.map((x,i) => {
  const finger=gltf.nodes.length;
  gltf.nodes.push({name:`ContactFinger_${i+1}`,translation:[x,0,0],children:[]});
  gltf.nodes[hand].children.push(finger);
  ellipsoid(`Pulpe_${i+1}`, [0,0,0.012], [0.011,0.020,0.012],0,finger);
  ellipsoid(`Phalange_${i+1}`, [0,-0.035,0.035], [0.010,0.035,0.014],0,finger);
  return finger;
});
ellipsoid('Auriculaire', [0.040,-0.060,0.065], [0.009,0.027,0.014], -0.12);
const thumbNode=gltf.nodes.length;
gltf.nodes.push({name:'PinchThumb',translation:[-0.043,-0.065,0.04],children:[]});
gltf.nodes[hand].children.push(thumbNode);
ellipsoid('Pouce', [0,0,0.013], [0.012,0.023,0.013],-0.3,thumbNode);
ellipsoid('Base_pouce',[0.006,-0.025,0.024],[0.013,0.021,0.014],-0.3,thumbNode);

const clearanceMargin=0.0012;
let largestCollisionCorrection=0;
const duration=sequenceTime;
const chapters=siteSteps.slice(1).map(step=>{
  const indices=stations.flatMap((s,i)=>(step.id==='other-side'?s.side===-1:s.side===1&&s.kind===step.id)?[i]:[]);
  return {...step,start:stations[indices[0]].start,end:stations[indices.at(-1)].end,clipName:`Palpation · ${step.id}`,indices};
});
gltf.animations=[];
function generateClip(name,indices,initialPose=false) {
let offset=0;
const timeline=indices.map(index=>{const s={...stations[index],index,start:offset};offset+=s.duration;return s;});
const times = [], translations = [], rotations = [], weights = [], scales=[];
const thumbTranslations=[];
const fingerTranslations = fingerNodes.map(()=>[]);
const duration = offset, fps = 30, substeps = 8;
const totalFrames=Math.round(duration*fps);
const tissue=stations.map(()=>({position:0,velocity:0}));
function pressureAt(phase,station) {
  if(station.kind==='nipple')return 0.55*smooth((phase-0.4)/0.65)*(1-smooth((phase-2.4)/0.8));
  for(let level=0;level<3;level++) {
    const t=phase-(0.15+level*0.92);
    if(t>=0&&t<=0.85)return [0.3,0.6,0.9][level]*Math.sin(Math.PI*t/0.85)**2;
  }
  return 0;
}

const dt=1/fps/substeps;
function collisionCorrection(currentWeights,handPosition,rotation,handScale,localFingers,thumbLocal) {
  collisionSurface.update(currentWeights);
  let correction=0;
  const sample=new THREE.Vector3();
  for(const part of handParts) {
    const fingerIndex=fingerNodes.indexOf(part.parentNode);
    for(let i=0;i<part.samples.length;i+=3) {
      sample.fromArray(part.samples,i);
      if(fingerIndex>=0)sample.add(localFingers[fingerIndex]);
      if(part.parentNode===thumbNode)sample.add(thumbLocal);
      sample.multiply(handScale).applyQuaternion(rotation).add(handPosition);
      correction=Math.max(correction,collisionSurface.height(sample.x,sample.y)+clearanceMargin-sample.z);
    }
  }
  return correction;
}
for (let f=0; f<=totalFrames; f++) {
  const time=f/fps, cursor=Math.max(0,timeline.findLastIndex(s=>time>=s.start-1e-8));
  const s=timeline[cursor], station=s.index, next=timeline[(cursor+1)%timeline.length].index, phase=time-s.start;
  const pressure=pressureAt(phase,s), liftStart=s.duration-0.6;
  // A damped spring gives the bulk tissue inertia while pad indentation follows
  // the contact constraint immediately. Semi-implicit integration at 240 Hz.
  if (f) for (let step=0;step<substeps;step++) for (let i=0;i<stations.length;i++) {
    const t=time-(substeps-1-step)*dt;
    const target=i===station?pressureAt(t-s.start,s):0;
    const state=tissue[i];
    state.velocity += (110*(target-state.position)-20*state.velocity)*dt;
    state.position += state.velocity*dt;
    if (target===0 && Math.abs(state.position)<0.0002 && Math.abs(state.velocity)<0.002) state.position=state.velocity=0;
  }
  const currentWeights=stations.flatMap((_,i)=>[i===station?pressure:0,tissue[i].position]);
  // End in the exact initial pose for a seamless clip loop.
  if (f===totalFrames) currentWeights.fill(0);
  weights.push(...currentWeights);
  const deformation = (point) => stations.reduce((result,current,i)=>result
    .addScaledVector(displacement(point,current,false),currentWeights[i*2])
    .addScaledVector(displacement(point,current,true),currentWeights[i*2+1]),new THREE.Vector3());
  let handPosition, rotation=s.rotation.clone();
  let contacts=s.contacts.map(p=>p.clone().add(deformation(p)));
  if (phase<liftStart) {
    // Hand and fingers are placed on the same deformed surface used by the mesh.
    const clearance=0.022*(1-smooth(phase/0.3));
    handPosition=s.center.clone().add(deformation(s.center)).addScaledVector(s.normal,clearance);
    contacts=contacts.map(p=>p.addScaledVector(s.normal,clearance));
  } else {
    const t=smooth((phase-liftStart)/0.6), other=stations[next];
    const clearance=0.022*smooth((phase-liftStart)/0.2)+(s.side!==other.side?0.26:0.045)*Math.sin(Math.PI*t);
    rotation.slerp(other.rotation,t);
    const normal=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
    handPosition=s.center.clone().lerp(other.center,t);
    handPosition.add(deformation(handPosition)).addScaledVector(normal,clearance);
    contacts=s.contacts.map((p,i)=>{
      const contact=p.clone().lerp(other.contacts[i],t);
      return contact.add(deformation(contact)).addScaledVector(normal,clearance);
    });
  }
  const blend=phase<liftStart?0:smooth((phase-liftStart)/0.6);
  const pinch=(s.kind==='nipple'?1:0)*(1-blend)+(stations[next].kind==='nipple'?1:0)*blend;
  const mirror=s.side*(1-blend)+stations[next].side*blend;
  // The hand changes handedness only while lifted away from the torso.
  const handScale=new THREE.Vector3(mirror,1,1);
  const inverse=rotation.clone().invert();
  const localFingers=contacts.map(p=>p.clone().sub(handPosition).applyQuaternion(inverse));
  const squeeze=pressure*0.008;
  localFingers[0].lerp(new THREE.Vector3(0.028-squeeze,0,0),pinch);
  for(let i=1;i<3;i++)localFingers[i].lerp(new THREE.Vector3(fingerOffsets[i],-0.055,0.060),pinch);
  const thumbLocal=new THREE.Vector3(-0.043,-0.065,0.04).lerp(new THREE.Vector3(-0.028+squeeze,0,0),pinch);
  localFingers.forEach((p,i)=>fingerTranslations[i].push(...p.toArray()));
  thumbTranslations.push(...thumbLocal.toArray());
  // Project the complete hand out of the ACTUAL animated triangles. Moving in
  // +Z leaves XY unchanged, so this resolves every sampled collision at once.
  // Apply one rigid correction to keep the palm, fingers and wrist connected.
  const correction=collisionCorrection(currentWeights,handPosition,rotation,handScale,localFingers,thumbLocal);
  largestCollisionCorrection=Math.max(largestCollisionCorrection,correction);
  handPosition.z+=correction;
  times.push(time); translations.push(...handPosition.toArray()); rotations.push(...rotation.toArray());scales.push(...handScale.toArray());
  if(f%(fps*4)===0)console.log(`Resolved whole-hand collisions: ${time} / ${duration}s`);
}
// Guard interpolation, not just exported keys. Correcting both endpoints by
// the same +Z amount clears the in-between pose and cannot invalidate earlier
// checks (XY, skin weights, orientation and hand articulation are unchanged).
let largestInterpolationCorrection=0;
const interpolate3=(values,f,t)=>new THREE.Vector3().fromArray(values,f*3).lerp(new THREE.Vector3().fromArray(values,(f+1)*3),t);
for(let f=0;f<totalFrames;f++) {
  for(const t of [0.25,0.5,0.75]) {
    const currentWeights=names.map((_,i)=>THREE.MathUtils.lerp(weights[f*names.length+i],weights[(f+1)*names.length+i],t));
    const q=new THREE.Quaternion().fromArray(rotations,f*4).slerp(new THREE.Quaternion().fromArray(rotations,(f+1)*4),t);
    const correction=collisionCorrection(currentWeights,interpolate3(translations,f,t),q,interpolate3(scales,f,t),fingerTranslations.map(values=>interpolate3(values,f,t)),interpolate3(thumbTranslations,f,t));
    translations[f*3+2]+=correction;translations[(f+1)*3+2]+=correction;
    largestInterpolationCorrection=Math.max(largestInterpolationCorrection,correction);
  }
  if(f%(fps*12)===0)console.log(`Guarded interpolation: ${(f/fps).toFixed(1)} / ${duration.toFixed(1)}s`);
}
// Periodic boundary shares the more conservative correction of both ends.
translations[2]=translations[totalFrames*3+2]=Math.max(translations[2],translations[totalFrames*3+2]);
// The reduced-motion/static pose must have the same clearance as frame zero.
if(initialPose) {
gltf.nodes[hand].translation=translations.slice(0,3);
gltf.nodes[hand].rotation=rotations.slice(0,4);
gltf.nodes[hand].scale=scales.slice(0,3);
gltf.nodes[thumbNode].translation=thumbTranslations.slice(0,3);
fingerNodes.forEach((node,i)=>{gltf.nodes[node].translation=fingerTranslations[i].slice(0,3);});
}
const timeAccessor=accessor(new Float32Array(times),'SCALAR');
gltf.animations.push({ name, samplers:[
  { input:timeAccessor, output:accessor(new Float32Array(translations),'VEC3'), interpolation:'LINEAR' },
  { input:timeAccessor, output:accessor(new Float32Array(weights),'SCALAR'), interpolation:'LINEAR' },
  { input:timeAccessor, output:accessor(new Float32Array(rotations),'VEC4'), interpolation:'LINEAR' },
  ...fingerTranslations.map(values=>({input:timeAccessor,output:accessor(new Float32Array(values),'VEC3'),interpolation:'LINEAR'})),
  {input:timeAccessor,output:accessor(new Float32Array(thumbTranslations),'VEC3'),interpolation:'LINEAR'},
  {input:timeAccessor,output:accessor(new Float32Array(scales),'VEC3'),interpolation:'LINEAR'}
],channels:[{ sampler:0,target:{node:hand,path:'translation'} },{sampler:1,target:{node:2,path:'weights'}},{sampler:2,target:{node:hand,path:'rotation'}},...fingerNodes.map((node,i)=>({sampler:i+3,target:{node,path:'translation'}})),{sampler:6,target:{node:thumbNode,path:'translation'}},{sampler:7,target:{node:hand,path:'scale'}}]});
}
generateClip('Palpation · étude de contact',stations.map((_,i)=>i),true);
for(const chapter of chapters) generateClip(chapter.clipName,chapter.indices);
gltf.extras={...gltf.extras, modelLabel:'Zou · essai palpation', palpationStudy:{version:5,duration,steps:chapters.map(({indices,...chapter})=>chapter),segments:stations.map(s=>({start:s.start,end:s.end,kind:s.kind,side:s.side})),stations:stations.map(s=>s.center.toArray()),source:input.split('/').pop(),clearanceMargin,largestCollisionCorrection,description:'Collision de toute la main contre le maillage déformé, compression locale et redistribution amortie. Approximation visuelle, non biomécanique.'}};
gltf.buffers[0].byteLength=byteLength;
let json=Buffer.from(JSON.stringify(gltf));
json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
let binary=Buffer.concat(chunks); binary=Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binary.length,0);binHeader.writeUInt32LE(0x004e4942,4);
await writeFile(output,Buffer.concat([header,json,binHeader,binary]),{flag:'wx'});
console.log(`Created ${output} (${(binary.length/1024/1024).toFixed(1)} MiB), ${duration}s loop.`);
