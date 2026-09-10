import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {PalpationSurface,collisionSamples} from './lib/palpation-collision.mjs';

const [file='public/models/bust-zou-full-multiview-hi3d-palpation.glb',sampleRate='60']=process.argv.slice(2);
const bytes=await readFile(file);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const hand=gltf.scene.getObjectByName('PalpationHand');
let bust;gltf.scene.traverse(n=>{if(n.isMesh&&n.morphTargetInfluences)bust=n;});
if(!hand||!bust||!gltf.animations.length)throw new Error('Missing animated bust or hand');
const surface=new PalpationSurface(bust.geometry),mixer=new THREE.AnimationMixer(gltf.scene);

const parts=[];hand.traverse(n=>{if(n.isMesh)parts.push({node:n,samples:collisionSamples(n.geometry,2)});});
let totalChecks=0;
for(const clip of gltf.animations) {
mixer.stopAllAction();
mixer.clipAction(clip).play();
console.log(`Validating ${clip.name}`);
const worst=new Map(),p=new THREE.Vector3(),inverse=new THREE.Matrix4();
const duration=clip.duration,fps=Number(sampleRate);let checks=0;
for(let frame=0;frame<=duration*fps;frame++) {
  const t=frame/fps;mixer.setTime(t);gltf.scene.updateMatrixWorld(true);
  inverse.copy(bust.matrixWorld).invert();surface.update(bust.morphTargetInfluences);
  for(const {node,samples} of parts) {
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld);
    for(let i=0;i<samples.length;i+=3) {
      p.fromArray(samples,i).applyMatrix4(matrix);
      const gap=p.z-surface.height(p.x,p.y);checks++;
      if(!worst.has(node.name)||gap<worst.get(node.name).gap)worst.set(node.name,{gap,time:t,point:p.toArray()});
    }
  }
  if(frame%Math.round(fps*4)===0)console.log(`Checked ${t.toFixed(1)} / ${duration}s`);
}
// Cross-check each limiting result with Three.js's independent ray/mesh test.
const ray=new THREE.Raycaster();
for(const {gap,time,point} of worst.values()) {
  mixer.setTime(time);gltf.scene.updateMatrixWorld(true);
  const local=new THREE.Vector3().fromArray(point);
  const origin=local.clone().add(new THREE.Vector3(0,0,1)).applyMatrix4(bust.matrixWorld);
  ray.set(origin,new THREE.Vector3(0,0,-1).transformDirection(bust.matrixWorld));
  const hit=ray.intersectObject(bust)[0];
  if(!hit)throw new Error('Independent contact ray missed the bust');
  const actualGap=local.z-bust.worldToLocal(hit.point.clone()).z;
  if(Math.abs(actualGap-gap)>0.00001)throw new Error('Collision grid differs from the mesh raycast');
}
const result=Object.fromEntries([...worst].map(([name,{gap,time}])=>[name,{gap,time}]));console.log(JSON.stringify({checks,fps,worst:result},null,2));
if([...worst.values()].some(v=>v.gap < -0.00015))throw new Error('Hand penetrates the deformed bust');
totalChecks+=checks;
console.log(`PASS: ${clip.name}, full hand surface and interpolated frames.`);
}
console.log(`PASS: ${gltf.animations.length} clips, ${totalChecks} contact checks.`);
