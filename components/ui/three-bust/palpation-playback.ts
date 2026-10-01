import * as THREE from 'three';
import { createPalpationTransition } from './palpation-transition';

export interface PalpationStep {
  id: string;
  start: number;
  end: number;
  clipName?: string;
  entryClipName?: string;
  exitClipName?: string;
}

/** The video step owns the selected clip; elapsed time only advances its loop. */
export function createPalpationPlayback(
  root: THREE.Object3D,
  clips: THREE.AnimationClip[],
  steps: PalpationStep[],
) {
  if (steps.some(step => step.entryClipName && step.exitClipName)) {
    return createAuthoredPlayback(root, clips, steps);
  }
  const hand = root.getObjectByName('PalpationHand');
  let skeletal = false;
  root.traverse(object => { if (object instanceof THREE.SkinnedMesh) skeletal = true; });
  if (hand && !skeletal) return createHandPlayback(root, hand, clips, steps);
  const mixer = new THREE.AnimationMixer(root);
  let action: THREE.AnimationAction | null = null;
  let retiring: THREE.AnimationAction | null = null;
  let fadeRemaining = 0;
  let selected: string | undefined;
  let offset = 0;

  function selectStep(id?: string) {
    if (id === selected && action) return;
    selected = id;
    if (retiring) retiring.stop();
    retiring = skeletal && action ? action.fadeOut(1.2) : null;
    fadeRemaining = retiring ? 1.2 : 0;
    if (!skeletal) mixer.stopAllAction();
    const step = steps.find(step => step.id === id);
    const clip = id === undefined ? clips[0] : clips.find(clip => clip.name === step?.clipName);
    action = clip ? mixer.clipAction(clip).reset().setLoop(THREE.LoopRepeat, Infinity).play() : null;
    if (skeletal && action && id !== undefined) action.fadeIn(1.2);
    offset = step?.start ?? 0;
    if (hand) hand.visible = !!action;
    mixer.update(0);
  }
  selectStep();

  return {
    selectStep,
    update(delta: number) {
      if (action || retiring) mixer.update(delta);
      if (retiring && (fadeRemaining -= delta) <= 0) {
        retiring.stop(); retiring = null;
      }
    },
    seek(time: number) {
      selectStep();
      if (retiring) { retiring.stop(); retiring = null; }
      if (action) action.stopFading().setEffectiveWeight(1);
      if (action) action.time = THREE.MathUtils.clamp(time, 0, clips[0]?.duration ?? 0);
      mixer.update(0);
    },
    get time() { return offset + (action?.time ?? 0); },
    get active() { return !!action || !!retiring; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}

function createHandPlayback(root: THREE.Object3D, hand: THREE.Object3D, clips: THREE.AnimationClip[], steps: PalpationStep[]) {
  const transition = createPalpationTransition(root, hand, clips);
  const mixer = new THREE.AnimationMixer(root);
  let action: THREE.AnimationAction | null = null;
  let transitionClip: THREE.AnimationClip | null = null;
  let destination: THREE.AnimationClip | undefined;
  let selected: string | undefined;
  let offset = 0;

  function stop() {
    mixer.stopAllAction();
    if (transitionClip) mixer.uncacheClip(transitionClip);
    transitionClip = null;
    action = null;
  }
  function play(clip: THREE.AnimationClip | undefined, once = false) {
    action = clip ? mixer.clipAction(clip).reset().setEffectiveWeight(1).setEffectiveTimeScale(1) : null;
    if (action) {
      action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = once;
      action.play();
    }
    hand.visible = !!action;
    mixer.update(0);
  }
  function selectStep(id?: string) {
    if (id === selected && action) return;
    const step = steps.find(step => step.id === id);
    destination = id === undefined ? clips[0] : clips.find(clip => clip.name === step?.clipName);
    // Sample before stopping the mixer, which restores the neutral pose.
    const nextTransition = action && hand.visible && destination ? transition.between(destination) : null;
    selected = id;
    offset = step?.start ?? 0;
    stop();
    transitionClip = nextTransition;
    play(transitionClip ?? destination, !!transitionClip);
  }
  selectStep();
  return {
    selectStep,
    update(delta: number) {
      let remaining = Math.max(0, delta);
      if (action && transitionClip) {
        const toBoundary = transitionClip.duration - action.time;
        const tick = Math.min(remaining, Math.max(0, toBoundary));
        mixer.update(tick);
        remaining -= tick;
        if (tick + 1e-7 >= toBoundary) { stop(); play(destination); }
      }
      if (action && remaining > 0) mixer.update(remaining);
    },
    seek(time: number) {
      stop();
      selected = undefined;
      offset = 0;
      destination = clips[0];
      play(destination);
      if (action) action.time = THREE.MathUtils.clamp(time, 0, destination?.duration ?? 0);
      mixer.update(0);
    },
    get time() { return offset + (transitionClip ? 0 : action?.time ?? 0); },
    get active() { return !!action; },
    dispose() { stop(); transition.dispose(); mixer.uncacheRoot(root); },
  };
}

/** Keep the baked collision-safe approach and retreat intact. Quaternion
 * crossfades between two distant hand poses cut straight through the torso. */
function createAuthoredPlayback(root: THREE.Object3D, clips: THREE.AnimationClip[], steps: PalpationStep[]) {
  const mixer = new THREE.AnimationMixer(root);
  let action: THREE.AnimationAction | null = null;
  let requested: string | undefined;
  let current: PalpationStep | undefined;
  let phase: 'full' | 'entry' | 'loop' | 'exit' | 'reverse-entry' | 'idle' = 'idle';
  const findClip = (name?: string) => clips.find(clip => clip.name === name);

  function play(clip: THREE.AnimationClip | undefined, nextPhase: typeof phase, time = 0) {
    mixer.stopAllAction();
    phase = clip ? nextPhase : 'idle';
    action = clip ? mixer.clipAction(clip).reset() : null;
    if (action) {
      action.setEffectiveWeight(1).setEffectiveTimeScale(nextPhase === 'reverse-entry' ? -1 : 1);
      action.setLoop(nextPhase === 'full' || nextPhase === 'loop' ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = true;
      action.time = time;
      action.play();
    }
    mixer.update(0);
  }
  function enterRequested() {
    current = steps.find(step => step.id === requested);
    play(findClip(current?.entryClipName), 'entry');
  }
  function selectStep(id?: string) {
    if (id === requested && phase !== 'idle') return;
    requested = id;
    if (id === undefined) { current = undefined; play(clips[0], 'full'); return; }
    if (phase === 'idle') { enterRequested(); return; }
    if (phase === 'exit' || phase === 'reverse-entry') return;
    if (phase === 'full') {
      // Scrubbing/full preview uses the first side's complete authored cycle.
      current = steps.find(step => step.entryClipName);
      const time = action?.time ?? 0;
      const enter = findClip(current?.entryClipName);
      const loop = findClip(current?.clipName);
      if (enter && time < enter.duration) {
        if (time < 1e-6) { play(undefined, 'idle'); enterRequested(); }
        else play(enter, 'reverse-entry', time);
      } else {
        play(findClip(current?.exitClipName), 'exit', Math.max(0, time - (enter?.duration ?? 0) - (loop?.duration ?? 0)));
      }
    } else if (phase === 'entry' && action) {
      action.paused = false;
      action.setEffectiveTimeScale(-1);
      phase = 'reverse-entry';
    } else if (phase === 'loop') {
      play(findClip(current?.exitClipName), 'exit');
    }
  }
  play(clips[0], 'full');
  return {
    selectStep,
    update(delta: number) {
      let remaining = Math.max(0, delta);
      while (action && remaining > 0) {
        if (phase === 'full' || phase === 'loop') { mixer.update(remaining); break; }
        const toBoundary = phase === 'reverse-entry' ? action.time : action.getClip().duration - action.time;
        const tick = Math.min(remaining, Math.max(0, toBoundary));
        mixer.update(tick); remaining -= tick;
        if (tick + 1e-7 < toBoundary) break;
        if (phase === 'entry') play(findClip(current?.clipName), 'loop');
        else { play(undefined, 'idle'); enterRequested(); }
      }
    },
    seek(time: number) {
      requested = undefined;
      current = undefined;
      play(clips[0], 'full', THREE.MathUtils.clamp(time, 0, clips[0]?.duration ?? 0));
    },
    get time() { return action?.time ?? 0; },
    get active() { return action !== null; },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(root); action = null; },
  };
}
