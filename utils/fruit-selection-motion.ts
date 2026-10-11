export const FRUIT_FALL_DURATION = 0.78;
export const FRUIT_FALL_STAGGER = 0.14;

export function fruitLandingCount(seconds: number, reducedMotion = false) {
  if (reducedMotion) return 3;
  if (seconds < FRUIT_FALL_DURATION) return 0;
  return Math.min(3, 1 + Math.floor((seconds - FRUIT_FALL_DURATION) / FRUIT_FALL_STAGGER));
}

/** A short fall followed by the damped displacement of a buoyant object. */
export function fruitSelectionOffset(seconds: number, reducedMotion = false) {
  if (reducedMotion) return { y: 0, rotation: 0 };
  const time = Math.max(0, seconds);
  const fallDuration = FRUIT_FALL_DURATION;
  if (time < fallDuration) {
    const progress = time / fallDuration;
    return { y: 8 * (1 - progress * progress), rotation: (1 - progress) * 0.32 };
  }
  const waterTime = time - fallDuration;
  return {
    y: -0.42 * Math.exp(-2.7 * waterTime) * Math.sin(7 * waterTime)
      + Math.sin(waterTime * 1.45) * 0.045 * Math.min(1, waterTime / 2),
    rotation: Math.sin(waterTime * 1.1) * 0.025,
  };
}
