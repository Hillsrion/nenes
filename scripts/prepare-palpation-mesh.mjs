import {readFile,writeFile} from 'node:fs/promises';
import {MeshoptSimplifier} from 'meshoptimizer/simplifier';
import {BufferGeometry,BufferAttribute} from 'three';
const [input='public/models/bust-zou-full-multiview-hi3d.glb',output='private-3d-inputs/palpation-study/bust-zou-animation-base.glb']=process.argv.slice(2);
const b=await readFile(input),jsonLength=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+jsonLength));
if(g.meshes.length!==1||g.meshes[0].primitives.length!==1||g.images?.length)throw new Error('Expected the untextured Zou source mesh');
const primitive=g.meshes[0].primitives[0];
function read(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],offset=28+jsonLength+(v.byteOffset||0)+(a.byteOffset||0),count=a.count*(a.type==='VEC3'?3:1);const bytes=b.subarray(offset,offset+count*4);return a.componentType===5126?new Float32Array(Uint8Array.from(bytes).buffer):new Uint32Array(Uint8Array.from(bytes).buffer);}
const positions=read(primitive.attributes.POSITION),normals=read(primitive.attributes.NORMAL),indices=read(primitive.indices);
await MeshoptSimplifier.ready;
const [simplified,error]=MeshoptSimplifier.simplify(indices,positions,3,600000,0.0008,['Regularize']);
const [remap,count]=MeshoptSimplifier.compactMesh(simplified);
const p=new Float32Array(count*3),n=new Float32Array(count*3);
for(let i=0;i<remap.length;i++)if(remap[i]<count){p.set(positions.subarray(i*3,i*3+3),remap[i]*3);n.set(normals.subarray(i*3,i*3+3),remap[i]*3);}
// Morph normals must share the same neutral topology: retaining the dense
// source normals would create nonzero deltas across the whole simplified body.
const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(p,3));geometry.setIndex(new BufferAttribute(simplified,1));geometry.computeVertexNormals();n.set(geometry.attributes.normal.array);geometry.dispose();
g.bufferViews=[];g.accessors=[];const chunks=[];let offset=0;
function attr(a,type,componentType){const bytes=Buffer.from(a.buffer,a.byteOffset,a.byteLength),index=g.accessors.length;g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;const size=type==='VEC3'?3:1,min=Array(size).fill(Infinity),max=Array(size).fill(-Infinity);a.forEach((v,i)=>{min[i%size]=Math.min(min[i%size],v);max[i%size]=Math.max(max[i%size],v);});g.accessors.push({bufferView:index,componentType,type,count:a.length/size,min,max});return index;}
primitive.attributes={POSITION:attr(p,'VEC3',5126),NORMAL:attr(n,'VEC3',5126)};primitive.indices=attr(simplified,'SCALAR',5125);
g.buffers=[{byteLength:offset}];g.extras={...g.extras,animationWorkingMesh:{source:input.split('/').pop(),sourceVertices:positions.length/3,vertices:count,relativeError:error}};
let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks),head=Buffer.alloc(20),bh=Buffer.alloc(8);
head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+bin.length,8);head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
await writeFile(output,Buffer.concat([head,json,bh,bin]),{flag:'wx'});console.log({output,sourceVertices:positions.length/3,vertices:count,relativeError:error});
