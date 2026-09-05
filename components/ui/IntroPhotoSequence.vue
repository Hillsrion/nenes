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
let frame = 0;
let disposed = false;
let renderScene: (() => void) | undefined;
let width = 1;
let height = 1;

// An original photo curtain: an uneven paper edge, a broad moving fold and a
// narrow lit lip. Only the background is sampled; foreground cutouts stay crisp.
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
float hash(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
float noise(float x) {
  float i = floor(x), f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}
vec2 crop(vec2 uv, float anchor) {
  return vec2(uv.x * uCrop.x + (1.0 - uCrop.x) * anchor,
              uv.y * uCrop.y + (1.0 - uCrop.y) * 0.5);
}
void main() {
  float p = uProgress;
  if (p <= 0.0) { gl_FragColor = texture2D(uFrom, crop(vUv, uFromAnchor)); return; }
  if (p >= 1.0) { gl_FragColor = texture2D(uTo, crop(vUv, uToAnchor)); return; }
  float envelope = sin(p * 3.14159265);
  float broad = sin(vUv.x * 5.3 + p * 2.2) * 0.065;
  float torn = (noise(vUv.x * 37.0) - 0.5) * 0.014
             + (noise(vUv.x * 173.0) - 0.5) * 0.004;
  float edge = mix(-0.14, 1.14, p) + (broad + torn) * envelope;
  float distanceToEdge = vUv.y - edge;
  float fold = exp(-pow(distanceToEdge / 0.095, 2.0)) * envelope;
  vec2 departingUv = vUv;
  departingUv.y -= fold * 0.075;
  departingUv.x += fold * 0.012 * sin(vUv.x * 5.3 + p * 2.2);
  vec3 departing = texture2D(uFrom, crop(departingUv, uFromAnchor)).rgb;
  vec3 arriving = texture2D(uTo, crop(vUv, uToAnchor)).rgb;
  departing *= 1.0 - fold * 0.19;
  float lip = exp(-pow(distanceToEdge / 0.006, 2.0)) * envelope;
  departing = mix(departing, vec3(0.96, 0.94, 0.90), lip * 0.55);
  float revealed = 1.0 - smoothstep(-uPixel, uPixel, distanceToEdge);
  gl_FragColor = vec4(mix(departing, arriving, revealed), 1.0);
}`;

function paint() {
  frame = 0;
  if (disposed) return;
  const state = getIntroState(position);
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
  if (material && textures.length === 4) {
    const anchors = width <= 768 ? [0.55, 0.60, 0.50, 0.30] : [0.5, 0.5, 0.5, 0.5];
    material.uniforms.uFrom!.value = textures[state.from];
    material.uniforms.uTo!.value = textures[state.to];
    material.uniforms.uProgress!.value = state.progress;
    material.uniforms.uFromAnchor!.value = anchors[state.from];
    material.uniforms.uToAnchor!.value = anchors[state.to];
    renderScene?.();
  }
}
function schedulePaint() {
  if (!frame && !disposed) frame = requestAnimationFrame(paint);
}
function setProgress(value: number) {
  position = value;
  schedulePaint();
}
function onContextLost(event: Event) {
  event.preventDefault();
  webglReady.value = false;
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
    paint();
    webglReady.value = true;
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
.intro-canvas { z-index: 1; opacity: 0; pointer-events: none; }
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
