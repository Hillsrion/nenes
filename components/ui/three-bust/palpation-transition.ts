import * as THREE from 'three';

const TRANSITION_DURATION = 1.2;
const smooth = (value: number) => THREE.MathUtils.smoothstep(value, 0, 1);

/** Capture the displayed pose, including an interrupted transition, instead of
 * restarting the previous gesture. The hand withdraws before changing zones. */
export function createPalpationTransition(root: THREE.Object3D, hand: THREE.Object3D, clips: THREE.AnimationClip[]) {
  const tracks = new Map(clips.flatMap(clip => clip.tracks.map(track => [track.name, track] as const)));
  const bindings = Array.from(tracks.values(), track => {
    const binding = new THREE.PropertyBinding(root, track.name) as THREE.PropertyBinding & {
      getValue(values: number[], offset: number): void;
    };
    binding.bind();
    const rest: number[] = [];
    binding.getValue(rest, 0);
    return { track, binding, rest, path: THREE.PropertyBinding.parseTrackName(track.name) };
  });

  function clearance() {
    root.updateWorldMatrix(true, true);
    const parentInverse = new THREE.Matrix4().copy(hand.parent?.matrixWorld ?? root.matrixWorld).invert();
    const bodyBounds = new THREE.Box3();
    const handBounds = new THREE.Box3();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      let partOfHand = false;
      for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) {
        if (ancestor === hand) { partOfHand = true; break; }
      }
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox;
      if (!bounds) return;
      const transform = new THREE.Matrix4();
      if (partOfHand) {
        // Exclude the hand's own scale: a side change can pass through scale X
        // zero, but the next pose still needs clearance for the complete hand.
        for (let ancestor: THREE.Object3D | null = object; ancestor && ancestor !== hand; ancestor = ancestor.parent) {
          transform.premultiply(ancestor.matrix);
        }
      } else transform.multiplyMatrices(parentInverse, object.matrixWorld);
      (partOfHand ? handBounds : bodyBounds).union(bounds.clone().applyMatrix4(transform));
    });
    // The enclosing radius also clears the palm while its orientation changes.
    const radius = handBounds.isEmpty() ? 0 : new THREE.Vector3(
      Math.max(Math.abs(handBounds.min.x), Math.abs(handBounds.max.x)),
      Math.max(Math.abs(handBounds.min.y), Math.abs(handBounds.max.y)),
      Math.max(Math.abs(handBounds.min.z), Math.abs(handBounds.max.z)),
    ).length() * Math.max(1, Math.abs(hand.scale.x), Math.abs(hand.scale.y), Math.abs(hand.scale.z));
    return bodyBounds.isEmpty() ? hand.position.z + 0.06 : bodyBounds.max.z + radius + 0.012;
  }

  return {
    between(next: THREE.AnimationClip) {
      const targetTracks = new Map(next.tracks.map(track => [track.name, track]));
      const poses = bindings.map(({ track, binding, rest, path }) => {
        const source: number[] = [];
        binding.getValue(source, 0);
        const target = targetTracks.get(track.name)?.values.slice(0, track.getValueSize()) ?? rest;
        return { track, path, source, target };
      });
      if (poses.every(({ source, target }) => source.every((value, i) => Math.abs(value - target[i]!) < 1e-6))) return null;
      const travelZ = Math.max(clearance(), hand.position.z);
      const frames = 48;
      const times = Float32Array.from({ length: frames + 1 }, (_, frame) => frame / frames * TRANSITION_DURATION);
      const transitionTracks = poses.map(({ track, path, source, target }) => {
        const size = track.getValueSize();
        const values = new Float32Array(times.length * size);
        const handPosition = (path.nodeName === hand.name || path.nodeName === hand.uuid) && path.propertyName === 'position';
        for (let frame = 0; frame <= frames; frame++) {
          const progress = frame / frames;
          // Release the tissue during withdrawal; change the hand and fingers
          // only in front of the bust, then approach the new contact pose.
          const blend = smooth(path.propertyName === 'morphTargetInfluences' ? progress / 0.25 : (progress - 0.25) / 0.5);
          for (let i = 0; i < size; i++) values[frame * size + i] = THREE.MathUtils.lerp(source[i]!, target[i]!, blend);
          if (track instanceof THREE.QuaternionKeyframeTrack) {
            THREE.Quaternion.slerpFlat(values, frame * size, source, 0, target, 0, blend);
          }
          if (handPosition && size === 3) {
            const liftedZ = Math.max(travelZ, target[2]!);
            values[frame * size + 2] = progress < 0.25
              ? THREE.MathUtils.lerp(source[2]!, liftedZ, smooth(progress / 0.25))
              : THREE.MathUtils.lerp(liftedZ, target[2]!, smooth((progress - 0.75) / 0.25));
          }
        }
        const result = track.clone();
        result.times = times;
        result.values = values;
        result.setInterpolation(THREE.InterpolateLinear);
        return result;
      });
      return new THREE.AnimationClip('Palpation · transition', TRANSITION_DURATION, transitionTracks);
    },
    dispose() { bindings.forEach(({ binding }) => binding.unbind()); },
  };
}
