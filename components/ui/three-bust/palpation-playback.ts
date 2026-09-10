import * as THREE from 'three';

export interface PalpationStep {
  id: string;
  start: number;
  end: number;
  clipName?: string;
}

/** The video step owns the selected clip; elapsed time only advances its loop. */
export function createPalpationPlayback(
  root: THREE.Object3D,
  clips: THREE.AnimationClip[],
  steps: PalpationStep[],
) {
  const mixer = new THREE.AnimationMixer(root);
  const hand = root.getObjectByName('PalpationHand');
  let action: THREE.AnimationAction | null = null;
  let selected: string | undefined;
  let offset = 0;

  function selectStep(id?: string) {
    if (id === selected && action) return;
    selected = id;
    mixer.stopAllAction();
    const step = steps.find(step => step.id === id);
    const clip = id === undefined ? clips[0] : clips.find(clip => clip.name === step?.clipName);
    action = clip ? mixer.clipAction(clip).reset().setLoop(THREE.LoopRepeat, Infinity).play() : null;
    offset = step?.start ?? 0;
    // Observation is the neutral scan. Do not invent an arm-raising pose.
    if (hand) hand.visible = !!action;
    mixer.update(0);
  }
  selectStep();

  return {
    selectStep,
    update(delta: number) { if (action) mixer.update(delta); },
    seek(time: number) {
      selectStep();
      if (action) action.time = THREE.MathUtils.clamp(time, 0, clips[0]?.duration ?? 0);
      mixer.update(0);
    },
    get time() { return offset + (action?.time ?? 0); },
    get active() { return !!action; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
