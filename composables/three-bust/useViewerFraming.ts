import { watch, onUnmounted } from "vue";
import * as THREE from "three";
import { gsap } from "gsap";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BustViewerProps } from "~/components/ui/three-bust/types";

type FramingProps = Required<Pick<BustViewerProps,
  "focusSymptoms" | "palpationProgress" | "modelScale" | "modelHorizontalAlignment"
>>;
interface FramingContext {
  getGroup: () => THREE.Group | null;
  getCamera: () => THREE.PerspectiveCamera | null;
  getControls: () => OrbitControls | null;
  isVisible: () => boolean;
  isRotating: () => boolean;
  onFramingReady: () => void;
  refreshProfileContour: () => void;
  scheduleRender: () => void;
}

export function useViewerFraming(props: FramingProps, context: FramingContext) {
  const symptomFraming = { progress: props.focusSymptoms || props.palpationProgress > 0 ? 1 : 0 };
  let framingNotified = false;
  const notifyFramingReady = () => {
    const modelGroup = context.getGroup();
    if (!framingNotified && context.isVisible() && props.focusSymptoms && symptomFraming.progress >= 0.999 &&
      !context.isRotating() && modelGroup && Math.abs(modelGroup.rotation.y) < 0.001) {
      framingNotified = true;
      context.onFramingReady();
    }
  };

  const alignModelHorizontally = () => {
    const modelGroup = context.getGroup();
    const camera = context.getCamera();
    if (!modelGroup || !camera || modelGroup.children.length === 0) return;

    modelGroup.position.x = 0;

    if (props.modelHorizontalAlignment !== "left") return;

    modelGroup.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(modelGroup);
    const nearestDepth = Math.max(0.1, camera.position.z - bounds.max.z);
    const halfFrustumWidth =
      Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
      nearestDepth *
      camera.aspect / camera.zoom;
    const edgeBleed = Math.max(0.04, halfFrustumWidth * 0.085);

    modelGroup.position.x = -halfFrustumWidth - bounds.min.x - edgeBleed;
    // Narrow screens need both breasts inside the close-up, rather than a left bleed.
    if (camera.aspect < 1) modelGroup.position.x *= 1 - symptomFraming.progress;
    modelGroup.updateMatrixWorld(true);
  };

  const updateSymptomFraming = () => {
    const camera = context.getCamera();
    const controls = context.getControls();
    if (!camera || !controls) return;
    const focus = symptomFraming.progress;
    camera.zoom = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(1, 1.9, focus), 1.65,
      THREE.MathUtils.clamp(props.palpationProgress, 0, 1)
    );
    camera.position.y = 0.8 + 0.08 * props.modelScale * focus;
    controls.target.y = 0.08 * props.modelScale * focus;
    camera.updateProjectionMatrix();
    controls.update();
    alignModelHorizontally();
    context.scheduleRender();
  };

  watch([() => props.focusSymptoms, () => props.palpationProgress > 0], ([focused, palpating]) => {
    framingNotified = false;
    gsap.to(symptomFraming, {
      progress: focused || palpating ? 1 : 0,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.9,
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: updateSymptomFraming,
      onComplete: () => {
        context.refreshProfileContour();
        notifyFramingReady();
      },
    });
  });

  watch(() => props.palpationProgress, updateSymptomFraming);

  watch(
    () => props.modelHorizontalAlignment,
    () => {
      alignModelHorizontally();
      context.scheduleRender();
    }
  );

  onUnmounted(() => gsap.killTweensOf(symptomFraming));
  return { alignModelHorizontally, updateSymptomFraming, notifyFramingReady };
}
