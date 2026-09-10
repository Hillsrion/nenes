import {readFile,writeFile} from 'node:fs/promises';
const [animationPath,symptomsPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('Usage: node scripts/combine-palpation-symptoms.mjs animation.glb symptoms.glb output.glb');
function parse(bytes){const length=bytes.readUInt32LE(12);return {json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};}
const base=parse(await readFile(animationPath)),symptoms=parse(await readFile(symptomsPath));
const g=base.json,s=symptoms.json;
const mesh=g.meshes.find(m=>m.extras?.targetNames?.includes('asymmetry')===false&&m.primitives[0].targets?.length>3);
const source=s.meshes.find(m=>m.extras?.targetNames?.includes('asymmetry'));
if(!mesh||!source)throw new Error('Expected separate palpation and symptom morphs');
const primitive=mesh.primitives[0],sp=source.primitives[0];
if(g.accessors[primitive.attributes.POSITION].count!==s.accessors[sp.attributes.POSITION].count)throw new Error('Meshes must share the same vertex ordering and topology');
function positionValues(asset,index){const a=asset.json.accessors[index],v=asset.json.bufferViews[a.bufferView];if(a.componentType!==5126||a.type!=="VEC3"||a.sparse)throw new Error('Expected dense float positions');return Array.from({length:a.count*3},(_,i)=>asset.bin.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+Math.floor(i/3)*(v.byteStride??12)+(i%3)*4));}
const originalPositions=positionValues(base,primitive.attributes.POSITION),symptomPositions=positionValues(symptoms,sp.attributes.POSITION);
if(originalPositions.some((value,i)=>Math.abs(value-symptomPositions[i])>1e-7))throw new Error('Symptom mesh does not have the same neutral vertices');
const chunks=[base.bin];let length=base.bin.length;
function append(bytes){const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}const offset=length;chunks.push(bytes);length+=bytes.length;return offset;}
const sourceOffset=append(symptoms.bin),viewOffset=g.bufferViews.length,accessorOffset=g.accessors.length;
for(const view of s.bufferViews)g.bufferViews.push({...view,buffer:0,byteOffset:(view.byteOffset??0)+sourceOffset});
for(const accessor of s.accessors){const a=structuredClone(accessor);if(a.bufferView!==undefined)a.bufferView+=viewOffset;if(a.sparse){a.sparse.indices.bufferView+=viewOffset;a.sparse.values.bufferView+=viewOffset;}g.accessors.push(a);}
const previousCount=primitive.targets.length,addedCount=sp.targets.length;
primitive.targets.push(...sp.targets.map(target=>Object.fromEntries(Object.entries(target).map(([key,index])=>[key,index+accessorOffset]))));
mesh.extras.targetNames.push(...source.extras.targetNames);mesh.weights=Array(previousCount+addedCount).fill(0);
const meshIndex=g.meshes.indexOf(mesh),node=g.nodes.find(n=>n.mesh===meshIndex),sourceNode=s.nodes.find(n=>n.mesh===s.meshes.indexOf(source));
node.extras={...node.extras,...sourceNode.extras};delete node.weights;
// glTF weight tracks address the complete array. Pad each sample with neutral
// symptom weights so the existing hand/contact animation remains unchanged.
for(const clip of g.animations)for(const channel of clip.channels){if(channel.target.path!=='weights')continue;const sampler=clip.samplers[channel.sampler],a=g.accessors[sampler.output],view=g.bufferViews[a.bufferView];const input=new Float32Array(base.bin.buffer,base.bin.byteOffset+(view.byteOffset??0)+(a.byteOffset??0),a.count);const samples=a.count/previousCount,values=new Float32Array(samples*(previousCount+addedCount));for(let f=0;f<samples;f++)values.set(input.subarray(f*previousCount,(f+1)*previousCount),f*(previousCount+addedCount));const offset=append(Buffer.from(values.buffer));const v=g.bufferViews.push({buffer:0,byteOffset:offset,byteLength:values.byteLength})-1;sampler.output=g.accessors.push({bufferView:v,componentType:5126,count:values.length,type:'SCALAR'})-1;}
g.extras.modelLabel='Zou · symptômes et palpation';g.buffers[0].byteLength=length;
let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);await writeFile(outputPath,Buffer.concat([header,json,bh,bin]),{flag:'wx'});console.log('Combined',previousCount+addedCount,'morphs and',g.animations.length,'clips');
