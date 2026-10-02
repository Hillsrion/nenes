import { ref, computed, watch, onUnmounted } from "vue";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createPalpationPlayback } from "~/components/ui/three-bust/palpation-playback";

interface PlaybackContext {
  getStep: () => string | undefined;
  isEnabled: () => boolean;
  scheduleRender: () => void;
}

export function useBustPlayback(context: PlaybackContext) {
  let animationPlayback: ReturnType<typeof createPalpationPlayback> | null = null;
  const animationDuration = ref(0);
  const animationTime = ref(0);
  const animationPlaying = ref(false);
  interface AnimationStep { clipName?: string; id: string; title: string; content: string; start: number; end: number }
  interface AnimationSegment { kind: string; side: number; start: number; end: number }
  const animationSteps = ref<AnimationStep[]>([]);
  const animationSegments = ref<AnimationSegment[]>([]);
  const selectedPreviewStep = ref<string>();
  const currentAnimationStep = computed(() =>
    animationSteps.value.find(step => step.id === (context.getStep() ?? selectedPreviewStep.value))
    ?? animationSteps.value.find(step => animationTime.value >= step.start && animationTime.value < step.end)
    ?? animationSteps.value[0]
  );
  const currentAnimationSegment = computed(() => animationSegments.value.find(segment => animationTime.value >= segment.start && animationTime.value < segment.end));
  const animationGestureLabel = computed(() => {
    const segment = currentAnimationSegment.value;
    if (!segment) return '';
    const hand = segment.side === 1 ? 'Main droite · sein gauche' : 'Main gauche · sein droit';
    const phase = animationTime.value - segment.start;
    const gesture = segment.kind === 'nipple' ? 'Geste au mamelon' : segment.kind === 'axilla' ? 'Aisselle / liaison' : 'Parcours du sein';
    const pressure = segment.kind === 'nipple' || phase > 2.85 ? '' : ` · pression ${['légère', 'moyenne', 'forte'][Math.min(2, Math.max(0, Math.floor((phase - 0.15) / 0.92)))]}`;
    return `${hand} · ${gesture}${pressure}`;
  });
  const selectAnimationStep = (event: Event) => {
    const step = animationSteps.value.find(step => step.id === (event.target as HTMLSelectElement).value);
    if (!step) return;
    selectedPreviewStep.value = step.id;
    animationTime.value = step.start;
    animationPlayback?.selectStep(step.id);
    previousAnimationTimestamp = 0;
    context.scheduleRender();
  };
  let previousAnimationTimestamp = 0;
  const toggleAnimation = () => {
    animationPlaying.value = !animationPlaying.value;
    previousAnimationTimestamp = 0;
    context.scheduleRender();
  };
  const seekAnimation = (event: Event) => {
    selectedPreviewStep.value = undefined;
    animationPlaying.value = false;
    animationTime.value = Number((event.target as HTMLInputElement).value);
    animationPlayback?.seek(animationTime.value);
    previousAnimationTimestamp = 0;
    context.scheduleRender();
  };
  watch(() => context.getStep(), (step) => {
    animationPlayback?.selectStep(step);
    animationTime.value = animationPlayback?.time ?? 0;
    previousAnimationTimestamp = 0;
    context.scheduleRender();
  });
  watch(() => context.isEnabled(), () => {
    previousAnimationTimestamp = 0;
    context.scheduleRender();
  });

  onUnmounted(() => { animationPlayback?.dispose(); animationPlayback = null; });
  return {
    animationDuration, animationTime, animationPlaying, animationSteps,
    currentAnimationStep, currentAnimationSegment, animationGestureLabel,
    selectAnimationStep, toggleAnimation, seekAnimation,
    get hasAnimation() { return !!animationPlayback; },
    get needsFrames() { return animationPlaying.value && context.isEnabled() && !!animationPlayback?.active; },
    load(gltf: GLTF) {
      selectedPreviewStep.value = undefined;
      if (gltf.animations.length) {
        const clip = gltf.animations[0]!;
        animationDuration.value = clip.duration;
        const study = gltf.parser.json.extras?.palpationStudy;
        animationSteps.value = study?.steps ?? [];
        animationSegments.value = study?.segments ?? [];
        animationPlayback = createPalpationPlayback(gltf.scene, gltf.animations, animationSteps.value);
        animationPlayback.selectStep(context.getStep());
        animationPlaying.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    },
    tick(timestamp: number) {
      if (animationPlayback && animationPlaying.value && context.isEnabled()) {
        const delta = previousAnimationTimestamp ? Math.min((timestamp - previousAnimationTimestamp) / 1000, 0.1) : 0;
        animationPlayback.update(delta);
        animationTime.value = animationPlayback.time;
      }
      previousAnimationTimestamp = timestamp;

    },
  };
}
