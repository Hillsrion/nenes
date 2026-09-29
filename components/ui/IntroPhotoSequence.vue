<template>
  <div ref="root" class="intro-photos" role="img" aria-label="Des femmes réunies, une succession de portraits et de moments partagés dans un salon">
    <div class="intro-backgrounds" aria-hidden="true">
      <img
        v-for="(src, index) in INTRO_BACKGROUNDS" :key="src"
        :ref="element => { if (element) backgrounds[index] = element as HTMLImageElement }"
        :src="src" alt="" :class="`intro-photo intro-photo-${index}`"
        :style="{ opacity: index === 0 ? 1 : 0 }"
        :fetchpriority="index === 0 ? 'high' : 'auto'" decoding="async"
      />
    </div>
    <canvas ref="canvas" class="intro-canvas" :class="{ 'is-ready': webglReady }" aria-hidden="true" />
    <img
      v-for="(src, index) in INTRO_CUTOUTS" :key="src"
      :ref="element => { if (element) cutouts[index] = element as HTMLImageElement }"
      :src="src" alt="" :class="`intro-photo intro-cutout intro-photo-${index + 1}`"
      aria-hidden="true" decoding="async" draggable="false"
    />
  </div>
</template>

<script setup lang="ts">
import { INTRO_BACKGROUNDS, INTRO_CUTOUTS, getIntroState } from '~/utils/intro-sequence';
import type { WebGLRenderer, Texture, ShaderMaterial, PlaneGeometry } from 'three';

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const backgrounds: HTMLImageElement[] = [];
const cutouts: HTMLImageElement[] = [];
const webglReady = ref(false);
let position = 0;
let renderer: WebGLRenderer | undefined;
let material: ShaderMaterial | undefined;
let geometry: PlaneGeometry | undefined;
let textures: Texture[] = [];
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let isInView = true;
let paintedPosition = Number.NaN;
let frame = 0;
let disposed = false;
let renderScene: (() => void) | undefined;
let width = 1;
let height = 1;

const curtainSeeds = [2.4, 8.7, 15.2] as const;

// Two staggered torn-paper edges rise from the bottom. The first
// reveals the paper; the second reveals the next image. Cutouts stay crisp.
const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;
uniform vec2 uCrop;
uniform float uFromAnchor;
uniform float uToAnchor;
uniform float uPixel;
uniform float uAspect;
uniform float uSeed;
uniform float uTime;
float hash(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
float noise(float x) {
  float i = floor(x), f = fract(x);
  return mix(hash(i), hash(i + 1.0), f);
}
float hash2(vec2 point) {
  return fract(sin(dot(point, vec2(41.37, 289.11))) * 45758.5453);
}
float surfaceNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  return mix(
    mix(hash2(cell), hash2(cell + vec2(1.0, 0.0)), local.x),
    mix(hash2(cell + vec2(0.0, 1.0)), hash2(cell + vec2(1.0)), local.x),
    local.y
  );
}
vec2 crop(vec2 uv, float anchor) {
  return vec2(uv.x * uCrop.x + (1.0 - uCrop.x) * anchor,
              uv.y * uCrop.y + (1.0 - uCrop.y) * 0.5);
}
float tornEdge(float x, float seed) {
  // The noise evolves through time, so the edge changes shape at rest too.
  // Fine angular cuts sit on broader, slowly changing folds.
  float bend = (surfaceNoise(vec2(x * 4.2 + seed, uTime * 0.38 + seed)) - 0.5) * 0.075;
  float tears = (surfaceNoise(vec2(x * 17.0 + seed * 2.3, uTime * 0.55)) - 0.5) * 0.025;
  float cuts = (noise(x * 67.0 + seed + sin(uTime * 0.7) * 0.65) - 0.5) * 0.008;
  float fibres = (noise(x * 193.0 + seed * 4.1 + sin(uTime * 0.9) * 0.4) - 0.5) * 0.003;
  return bend + tears + cuts + fibres;
}
void main() {
  float p = uProgress;
  if (p <= 0.0) { gl_FragColor = texture2D(uFrom, crop(vUv, uFromAnchor)); return; }
  if (p >= 1.0) { gl_FragColor = texture2D(uTo, crop(vUv, uToAnchor)); return; }

  float paperTravel = smoothstep(0.0, 0.76, p);
  float photoTravel = smoothstep(0.25, 1.0, p);
  float paperHead = mix(-0.14, 1.14, paperTravel);
  float photoHead = mix(-0.14, 1.14, photoTravel);
  float edgeX = vUv.x * clamp(uAspect, 0.8, 2.0);
  float paperDistance = vUv.y - paperHead - tornEdge(edgeX, uSeed);
  float photoDistance = vUv.y - photoHead - tornEdge(edgeX, uSeed + 13.7);
  float softness = max(uPixel, 0.0007);
  float paperMask = 1.0 - smoothstep(-softness, softness, paperDistance);
  float photoMask = 1.0 - smoothstep(-softness, softness, photoDistance);

  vec2 paperUv = vec2(vUv.x * min(uAspect, 1.8), vUv.y);
  float broadGrain = surfaceNoise(paperUv * 28.0 + uSeed);
  float fineGrain = surfaceNoise(paperUv * 190.0 + uSeed * 2.7);
  float fibres = surfaceNoise(vec2(paperUv.x * 13.0, paperUv.y * 430.0) + uSeed);

  vec3 departing = texture2D(uFrom, crop(vUv, uFromAnchor)).rgb;
  vec3 arriving = texture2D(uTo, crop(vUv, uToAnchor)).rgb;
  vec3 paper = vec3(0.965, 0.925, 0.895);
  paper *= 0.94 + broadGrain * 0.095 + fineGrain * 0.025;
  paper += vec3(0.018, 0.009, 0.004) * smoothstep(0.7, 1.0, fibres);
  // Each exposed edge has its own uneven inner tear, like separated fibres.
  float paperLip = 0.005 + noise(edgeX * 26.0 + uSeed) * 0.009;
  float photoLip = 0.005 + noise(edgeX * 31.0 + uSeed + 7.0) * 0.009;
  float paperRim = smoothstep(-paperLip - softness, -paperLip + softness, paperDistance) * paperMask;
  float photoRim = smoothstep(-photoLip - softness, -photoLip + softness, photoDistance) * photoMask;
  float paperShadow = exp(-max(paperDistance, 0.0) / 0.009) * (1.0 - paperMask);
  float photoShadow = exp(-max(photoDistance, 0.0) / 0.009) * (1.0 - photoMask);
  departing *= 1.0 - paperShadow * 0.16;
  vec3 color = mix(departing, paper, paperMask);
  color *= 1.0 - photoShadow * paperMask * 0.14;
  color = mix(color, arriving, photoMask);
  vec3 exposedFibres = vec3(0.995, 0.978, 0.950) * (0.975 + fineGrain * 0.025);
  color = mix(color, exposedFibres, max(paperRim * (1.0 - photoMask), photoRim));
  gl_FragColor = vec4(color, 1.0);
}`;

function paint(now = performance.now()) {
  frame = 0;
  if (disposed) return;
  const state = getIntroState(position);
  if (position !== paintedPosition) {
    paintedPosition = position;
    backgrounds.forEach((image, index) => {
      image.style.opacity = index === state.from ? '1' : index === state.to ? String(state.progress) : '0';
    });
    state.cutouts.forEach(({ visible, arrival }, index) => {
      const image = cutouts[index];
      if (!image) return;
      const eased = 1 - Math.pow(1 - arrival, 3);
      image.style.visibility = visible ? 'visible' : 'hidden';
      image.style.opacity = String(Math.min(1, arrival * 4));
      image.style.transform = `translate3d(0, ${(1 - eased) * 105}%, 0)`;
    });
  }
  if (material && textures.length === 4 && !renderer?.getContext().isContextLost()) {
    const anchors = width <= 768 ? [0.55, 0.60, 0.50, 0.30] : [0.5, 0.5, 0.5, 0.5];
    const seed = curtainSeeds[Math.min(state.from, curtainSeeds.length - 1)]!;
    material.uniforms.uFrom!.value = textures[state.from];
    material.uniforms.uTo!.value = textures[state.to];
    material.uniforms.uProgress!.value = state.progress;
    material.uniforms.uFromAnchor!.value = anchors[state.from];
    material.uniforms.uToAnchor!.value = anchors[state.to];
    material.uniforms.uSeed!.value = seed;
    material.uniforms.uTime!.value = now / 1000;
    renderScene?.();
  }
  // Keep only a visible, unfinished curtain alive between scroll events.
  if (webglReady.value && isInView && state.progress > 0 && state.progress < 1) schedulePaint();
}
function schedulePaint() {
  if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(paint);
}
function setProgress(value: number) {
  position = value;
  schedulePaint();
}
function onContextLost(event: Event) {
  event.preventDefault();
  webglReady.value = false;
  cancelAnimationFrame(frame);
  frame = 0;
}
function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else {
    schedulePaint();
  }
}
function onContextRestored() {
  webglReady.value = true;
  schedulePaint();
}
defineExpose({ setProgress });

onMounted(async () => {
  if (!root.value || !canvas.value) return;
  paint();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('visibilitychange', onVisibilityChange);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    isInView = entry?.isIntersecting ?? false;
    if (isInView) schedulePaint();
  });
  intersectionObserver.observe(root.value);
  try {
    const THREE = await import('three');
    if (disposed) return;
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: {
        uFrom: { value: null }, uTo: { value: null }, uProgress: { value: 0 },
        uCrop: { value: new THREE.Vector2(1, 1) },
        uFromAnchor: { value: 0.5 }, uToAnchor: { value: 0.5 }, uPixel: { value: 0.001 },
        uAspect: { value: 1 }, uSeed: { value: curtainSeeds[0] }, uTime: { value: 0 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader,
    });
    scene.add(new THREE.Mesh(geometry, material));
    renderScene = () => renderer?.render(scene, camera);
    const resize = () => {
      if (!root.value || !renderer || !material) return;
      width = root.value.clientWidth;
      height = root.value.clientHeight;
      renderer.setSize(width, height, false);
      const ratio = (width / height) / (1366 / 768);
      material.uniforms.uCrop!.value.set(Math.min(ratio, 1), Math.min(1 / ratio, 1));
      material.uniforms.uPixel!.value = 1 / (height * renderer.getPixelRatio());
      material.uniforms.uAspect!.value = width / height;
      schedulePaint();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root.value);
    resize();
    const loader = new THREE.TextureLoader();
    const loaded = await Promise.allSettled(INTRO_BACKGROUNDS.map(src => loader.loadAsync(src)));
    const successful = loaded.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    if (disposed || successful.length !== 4) {
      successful.forEach(texture => texture.dispose());
      return;
    }
    textures = successful;
    textures.forEach(texture => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
    });
    webglReady.value = true;
    schedulePaint();
    canvas.value?.addEventListener('webglcontextlost', onContextLost);
    canvas.value?.addEventListener('webglcontextrestored', onContextRestored);
  } catch (error) {
    // The same DOM sequence remains available on devices without WebGL.
    console.warn('Photo curtain unavailable; using the image transition.', error);
    renderer?.dispose();
    renderer = undefined;
  }
});

onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  canvas.value?.removeEventListener('webglcontextlost', onContextLost);
  canvas.value?.removeEventListener('webglcontextrestored', onContextRestored);
  textures.forEach(texture => texture.dispose());
  material?.dispose();
  geometry?.dispose();
  renderer?.dispose();
});
</script>

<style scoped>
.intro-photos, .intro-backgrounds, .intro-canvas, .intro-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.intro-photos { overflow: hidden; isolation: isolate; }
.intro-photo { object-fit: cover; object-position: center; }
.intro-canvas { z-index: 1; opacity: 0; pointer-events: none; transition: opacity 180ms ease-out; }
.intro-canvas.is-ready { opacity: 1; }
.intro-cutout { z-index: 2; visibility: hidden; pointer-events: none; will-change: transform; }
@media (max-width: 768px) {
  .intro-photo-0 { object-position: 55% center; }
  .intro-photo-1 { object-position: 60% center; }
  .intro-photo-2 { object-position: 50% center; }
  .intro-photo-3 { object-position: 30% center; }
}
@media (prefers-reduced-motion: reduce) {
  .intro-cutout { will-change: auto; }
}
</style>
