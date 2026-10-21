<template>
  <canvas ref="canvas" class="symptom-photo-animation" :class="{ 'is-ready': ready }" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { PhotoSymptom, createSymptomPhotoAnimation } from '~/utils/symptom-photo-animation';

const props = defineProps<{ symptom: PhotoSymptom; illustration: string }>();
const emit = defineEmits<{ ready: [value: boolean] }>();
const canvas = ref<HTMLCanvasElement>();
const ready = ref(false);
let controller: Awaited<ReturnType<typeof createSymptomPhotoAnimation>> | undefined;
let intersection: IntersectionObserver | undefined;
let resizeObserver: ResizeObserver | undefined;
let motion: MediaQueryList | undefined;
let visible = false;
let disposed = false;
let initializing = false;
let unavailable = false;
let contextLost = false;

function setReady(value: boolean) {
  ready.value = value;
  emit('ready', value);
}

async function update() {
  const shouldRun = visible && !document.hidden && !motion?.matches && !contextLost;
  if (!shouldRun) {
    controller?.setRunning(false);
    if (motion?.matches) setReady(false);
    return;
  }
  if (disposed || unavailable || !canvas.value) return;
  if (!controller) {
    if (initializing) return;
    initializing = true;
    try {
      const { createSymptomPhotoAnimation } = await import('~/utils/symptom-photo-animation');
      if (disposed || !canvas.value) return;
      const created = await createSymptomPhotoAnimation(canvas.value, props.symptom, props.illustration);
      if (disposed) { created.dispose(); return; }
      controller = created;
      resizeObserver = new ResizeObserver(() => controller?.resize());
      resizeObserver.observe(canvas.value);
      controller.resize();
    } catch {
      // The baked nipple points and SVG contours remain visible without WebGL.
      unavailable = true;
      setReady(false);
    } finally {
      initializing = false;
    }
  }
  if (!controller || disposed) return;
  const active = visible && !document.hidden && !motion?.matches && !contextLost;
  if (active) setReady(true);
  controller.setRunning(active);
}

function loseContext(event: Event) {
  event.preventDefault();
  contextLost = true;
  controller?.setRunning(false);
  setReady(false);
}
function restoreContext() { contextLost = false; controller?.resize(); void update(); }

onMounted(() => {
  if (!canvas.value) return;
  motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  canvas.value.addEventListener('webglcontextlost', loseContext);
  canvas.value.addEventListener('webglcontextrestored', restoreContext);
  intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; void update(); });
  intersection.observe(canvas.value);
});

onBeforeUnmount(() => {
  disposed = true;
  intersection?.disconnect();
  resizeObserver?.disconnect();
  motion?.removeEventListener('change', update);
  document.removeEventListener('visibilitychange', update);
  canvas.value?.removeEventListener('webglcontextlost', loseContext);
  canvas.value?.removeEventListener('webglcontextrestored', restoreContext);
  controller?.dispose();
});
</script>

<style scoped>
.symptom-photo-animation {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
  filter: drop-shadow(0 1px 1px rgb(128 48 76 / 24%));
}
.symptom-photo-animation.is-ready { opacity: 1; }
</style>
