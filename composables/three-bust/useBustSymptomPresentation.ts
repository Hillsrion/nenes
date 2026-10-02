import { ref, watch, onUnmounted } from "vue";
import * as THREE from "three";
import { gsap } from "gsap";
import type { createSymptomEffects, SymptomType } from "~/components/ui/three-bust/symptom-effects";

interface PresentationContext {
  getGroup: () => THREE.Group | null;
  getRotation: () => number;
  getSymptom: () => SymptomType;
  effects: ReturnType<typeof createSymptomEffects>;
  refreshProfileContour: () => void;
  scheduleRender: (duration?: number) => void;
  onSymptomReady: (symptom: SymptomType) => void;
}

export function useBustSymptomPresentation(context: PresentationContext) {
  const profileLabelOpacity = ref(1);
  let modelIsRotating = false;
  let profileTurnTimer = 0;
  let queuedSymptom: SymptomType | null = null;
  let lastSettledSymptom: SymptomType = "none";
  watch(
    () => context.getRotation(),
    (rotationY) => {
      if (!context.getGroup()) return;
      window.clearTimeout(profileTurnTimer);
      const returnsToProfile = Math.abs(Math.abs(rotationY) - Math.PI / 2) < 0.01;
      modelIsRotating = true;

      const turn = () => {
        gsap.to(context.getGroup()!.rotation, {
          y: rotationY,
          duration: 0.7,
          ease: "power2.inOut",
          overwrite: true,
          onUpdate: () => context.scheduleRender(),
          onComplete: () => {
            modelIsRotating = false;
            if (returnsToProfile) {
              context.refreshProfileContour();
              profileLabelOpacity.value = 1;
            } else if (queuedSymptom) {
              const symptom = queuedSymptom;
              queuedSymptom = null;
              context.effects.update(symptom);
            }
            context.scheduleRender(120);
          },
        });
      };

      // The curved label belongs to the profile view. Fade it out completely
      // before the bust turns so the two motions never compete visually.
      if (!returnsToProfile && profileLabelOpacity.value > 0) {
        profileLabelOpacity.value = 0;
        profileTurnTimer = window.setTimeout(turn, 250);
      } else {
        turn();
      }
    }
  );

  watch(
    () => context.getSymptom(),
    (newSymptom) => {
      lastSettledSymptom = "none";
      if (newSymptom === "none") {
        queuedSymptom = null;
        context.effects.update(newSymptom);
      } else if (modelIsRotating) {
        // The card can become active while the label is fading. Keep its visual
        // effect queued until the bust has completed the profile-to-front turn.
        queuedSymptom = newSymptom;
        return;
      } else {
        context.effects.update(newSymptom);
      }
      context.scheduleRender(newSymptom === "nipple" ? 0 : 150);
    }
  );

  onUnmounted(() => {
    window.clearTimeout(profileTurnTimer);
    const group = context.getGroup();
    if (group) gsap.killTweensOf(group.rotation);
  });

  return {
    profileLabelOpacity,
    get isRotating() { return modelIsRotating; },
    notifySymptomReady() {
      if (context.effects.isTransitioning() || modelIsRotating || queuedSymptom ||
        lastSettledSymptom === context.getSymptom()) return;
      lastSettledSymptom = context.getSymptom();
      if (lastSettledSymptom !== "none") context.onSymptomReady(lastSettledSymptom);
    },
  };
}
