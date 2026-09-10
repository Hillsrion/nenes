// Exact projected-triangle queries for this frontal palpation study. The grid
// accelerates triangle lookup; it does not approximate the surface by voxels.
export class PalpationSurface {
  constructor(geometry) {
    this.base = geometry.attributes.position.array;
    this.morphs = (geometry.morphAttributes.position ?? []).map(a => a.array);
    this.relative = geometry.morphTargetsRelative;
    this.minX = -0.45; this.minY = -0.20; this.cell = 0.006;
    this.nx = 150; this.ny = 135;
    this.bins = Array.from({length:this.nx*this.ny},()=>[]);
    this.triangles = []; const vertices = new Set();
    const ids = geometry.index.array, p = this.base;
    for (let i=0;i<ids.length;i+=3) {
      const a=ids[i]*3,b=ids[i+1]*3,c=ids[i+2]*3;
      // Includes margin around the hand's entire swept region, and both front
      // and side-facing triangles. Rear triangles cannot be the first hit.
      if (Math.max(p[a],p[b],p[c]) < -0.40 || Math.min(p[a],p[b],p[c]) > 0.40 ||
          Math.max(p[a+1],p[b+1],p[c+1]) < -0.15 || Math.min(p[a+1],p[b+1],p[c+1]) > 0.55 ||
          Math.max(p[a+2],p[b+2],p[c+2]) < -0.08) continue;
      this.triangles.push(a,b,c); vertices.add(a);vertices.add(b);vertices.add(c);
    }
    this.vertices = [...vertices]; this.positions = new Float32Array(p.length);
    this.coefficients = new Float64Array(this.triangles.length/3*9);
  }
  update(weights) {
    const active = weights.map((w,i)=>[w,this.morphs[i]]).filter(([w,m])=>w && m);
    const p=this.positions, base=this.base;
    for (const i of this.vertices) for(let k=0;k<3;k++) {
      let value=base[i+k];
      for(const [w,m] of active) value+=w*(this.relative?m[i+k]:m[i+k]-base[i+k]);
      p[i+k]=value;
    }
    for(const bin of this.bins) bin.length=0;
    const ts=this.triangles, co=this.coefficients;
    for(let i=0;i<ts.length;i+=3) {
      const a=ts[i],b=ts[i+1],c=ts[i+2], ax=p[a],ay=p[a+1],bx=p[b],by=p[b+1],cx=p[c],cy=p[c+1];
      const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if(Math.abs(det)<1e-14)continue;
      const j=i*3;
      co[j]=(by-cy)/det;co[j+1]=(cx-bx)/det;co[j+2]=cx;co[j+3]=cy;
      co[j+4]=(cy-ay)/det;co[j+5]=(ax-cx)/det;
      co[j+6]=p[a+2]-p[c+2];co[j+7]=p[b+2]-p[c+2];co[j+8]=p[c+2];
      const x0=Math.max(0,Math.floor((Math.min(ax,bx,cx)-this.minX)/this.cell));
      const x1=Math.min(this.nx-1,Math.floor((Math.max(ax,bx,cx)-this.minX)/this.cell));
      const y0=Math.max(0,Math.floor((Math.min(ay,by,cy)-this.minY)/this.cell));
      const y1=Math.min(this.ny-1,Math.floor((Math.max(ay,by,cy)-this.minY)/this.cell));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)this.bins[y*this.nx+x].push(j);
    }
  }
  height(x,y) {
    const ix=Math.floor((x-this.minX)/this.cell),iy=Math.floor((y-this.minY)/this.cell);
    if(ix<0||ix>=this.nx||iy<0||iy>=this.ny)throw new Error('Hand left the collision query region');
    let z=-Infinity; const co=this.coefficients;
    for(const j of this.bins[iy*this.nx+ix]) {
      const dx=x-co[j+2],dy=y-co[j+3];
      const a=co[j]*dx+co[j+1]*dy,b=co[j+4]*dx+co[j+5]*dy;
      if(a>=-1e-7&&b>=-1e-7&&a+b<=1+1e-7)z=Math.max(z,co[j+8]+a*co[j+6]+b*co[j+7]);
    }
    return z;
  }
}

// Include triangle interiors: checking three fingertip origins misses the
// width of the pads, the phalanges, palm, thumb and wrist.
export function collisionSamples(geometry, subdivisions=2) {
  const p=geometry.attributes.position, ids=geometry.index.array, samples=[];
  for(let i=0;i<p.count;i++)samples.push(p.getX(i),p.getY(i),p.getZ(i));
  for(let i=0;i<ids.length;i+=3) {
    const a=ids[i],b=ids[i+1],c=ids[i+2];
    for(let u=0;u<=subdivisions;u++)for(let v=0;v<=subdivisions-u;v++){
      const wa=u/subdivisions,wb=v/subdivisions,wc=1-wa-wb;
      samples.push(wa*p.getX(a)+wb*p.getX(b)+wc*p.getX(c),wa*p.getY(a)+wb*p.getY(b)+wc*p.getY(c),wa*p.getZ(a)+wb*p.getZ(b)+wc*p.getZ(c));
    }
    samples.push((p.getX(a)+p.getX(b)+p.getX(c))/3,(p.getY(a)+p.getY(b)+p.getY(c))/3,(p.getZ(a)+p.getZ(b)+p.getZ(c))/3);
  }
  // Adjacent triangles repeat vertices and edge midpoints. Removing identical
  // Float32 positions preserves the tested surface while avoiding duplicate work.
  const raw=new Float32Array(samples),seen=new Set(),unique=[];
  for(let i=0;i<raw.length;i+=3) {
    const key=`${raw[i]},${raw[i+1]},${raw[i+2]}`;
    if(seen.has(key))continue;
    seen.add(key);unique.push(raw[i],raw[i+1],raw[i+2]);
  }
  return new Float32Array(unique);
}
