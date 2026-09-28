// Independent check of exported glTF skinning, including in-between frames.
// Local input only; no source photos or GLB data are written to Git.
import { readFile, writeFile } from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PalpationSurface } from './lib/palpation-collision.mjs';
const [file,rate='60',reportPath]=process.argv.slice(2),fps=Number(rate);
if(!file||!Number.isFinite(fps)||fps<30)throw Error('Expected GLB and sample rate >= 30.');
const bytes=await readFile(file),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let mesh;gltf.scene.traverse(node=>{if(node.isSkinnedMesh)mesh=node;});
if(!mesh||gltf.parser.json.extras?.palpationStudy?.rig!=='AnaisUpperBodyV2')throw Error('Expected Anaïs V2 rig.');
const geometry=mesh.geometry,position=geometry.attributes.position,base=position.array,indices=geometry.index.array;
const skinIndex=geometry.attributes.skinIndex,skinWeight=geometry.attributes.skinWeight;
const arm=new Float32Array(position.count);
for(let i=0;i<position.count;i++)for(let k=0;k<4;k++){
  const name=mesh.skeleton.bones[skinIndex.array[i*4+k]]?.name,match=name?.match(/^Volume_(-?1)_(shoulder|elbow|wrist)_(\d+)$/);
  if(match)arm[i]+=skinWeight.array[i*4+k]*(match[2]==='shoulder'?Number(match[3])/12:1);
}
const fixtures=new Map();
for(const side of [1,-1]){
  const body=[],samples=[],moving=i=>Math.sign(base[i*3])===-side&&arm[i]>.05,tested=i=>moving(i)&&base[i*3+1]<.04;
  for(let i=0;i<position.count;i++)if(tested(i))samples.push([i]);
  for(let i=0;i<indices.length;i+=3){const tri=Array.from(indices.subarray(i,i+3));
    if(!tri.some(moving))body.push(...tri);
    if(tri.every(tested))samples.push(tri,[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]);
  }
  const bodyGeometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(base.slice(),3));bodyGeometry.setIndex(body);
  const surface=new PalpationSurface(bodyGeometry),needed=new Set([...surface.vertices.map(i=>i/3),...samples.flat()]);
  fixtures.set(side,{surface,samples,needed});
}
const mixer=new T.AnimationMixer(gltf.scene),point=new T.Vector3(),deformed=base.slice(),results=[];
let checks=0,worstRest=0,failures=0;
for(const clip of gltf.animations){
  mixer.stopAllAction();const action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
  const side=clip.name.includes('autre')?-1:1,{surface,samples,needed}=fixtures.get(side);
  let worst={gap:Infinity,time:0,point:[],source:[]},anchored=0,maxShoulderStretch=0;
  const frameCount=Math.round(clip.duration*fps);
  for(let frame=0;frame<=frameCount;frame++){
    const time=Math.min(frame/fps,clip.duration);action.time=time;mixer.update(0);gltf.scene.updateMatrixWorld(true);mesh.skeleton.update();
    for(const i of needed){mesh.getVertexPosition(i,point);point.toArray(deformed,i*3);
      if(!Number.isFinite(point.lengthSq()))throw Error(`Non-finite vertex ${i} at ${time}`);
      if(arm[i]<1e-6&&(base[i*3+1]<.165||Math.abs(base[i*3])<.066))anchored=Math.max(anchored,point.distanceTo(new T.Vector3().fromBufferAttribute(position,i)));
    }
    if(clip===gltf.animations[0]&&(frame===0||frame===frameCount))for(const i of needed)worstRest=Math.max(worstRest,point.fromArray(deformed,i*3).distanceTo(new T.Vector3().fromBufferAttribute(position,i)));
    surface.base=deformed;surface.update([]);
    if(frame%Math.round(fps/5)===0)for(let k=0;k<indices.length;k+=3)for(let edge=0;edge<3;edge++){
      const a=indices[k+edge],b=indices[k+(edge+1)%3];
      if(base[a*3+1]<.18||base[a*3+1]>.29||!needed.has(a)||!needed.has(b))continue;
      const length=Math.hypot(base[a*3]-base[b*3],base[a*3+1]-base[b*3+1],base[a*3+2]-base[b*3+2]);
      if(length>.0001)maxShoulderStretch=Math.max(maxShoulderStretch,Math.hypot(deformed[a*3]-deformed[b*3],deformed[a*3+1]-deformed[b*3+1],deformed[a*3+2]-deformed[b*3+2])/length);
    }
    for(const sample of samples){
      const x=sample.reduce((s,id)=>s+deformed[id*3],0)/sample.length,y=sample.reduce((s,id)=>s+deformed[id*3+1],0)/sample.length,z=sample.reduce((s,id)=>s+deformed[id*3+2],0)/sample.length;
      // The original hand next to the thigh is outside the swept chest domain.
      // The approach, contact and retreat above the waist are all included.
      if(y<-.14)continue;
      const height=surface.height(x,y);if(!Number.isFinite(height))continue;
      const gap=z-height;checks++;
      if(gap<worst.gap)worst={gap,time,point:[x,y,z],source:Array.from(base.subarray(sample[0]*3,sample[0]*3+3))};
    }
  }
  const result={clip:clip.name,fps,frames:frameCount+1,worst,anchoredDisplacement:anchored,maxShoulderStretch};results.push(result);console.log(JSON.stringify(result));
  if(worst.gap<-.00015||anchored>.00001||maxShoulderStretch>8)failures++;
}
const report={file,fps,checks,worstRest,passed:failures===0&&worstRest<.00001,results};
if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checks,worstRest,passed:report.passed}));
if(!report.passed)process.exitCode=1;
