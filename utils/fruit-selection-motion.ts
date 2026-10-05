/** A short fall followed by the damped displacement of a buoyant object. */
export function fruitSelectionOffset(seconds: number, reducedMotion = false) {
  if (reducedMotion) return { y: 0, rotation: 0, ripple: 0 };
  const time = Math.max(0, seconds);
  const fallDuration = 0.78;
  if (time < fallDuration) {
    const progress = time / fallDuration;
    return { y: 8 * (1 - progress * progress), rotation: (1 - progress) * 0.32, ripple: 0 };
  }
  const waterTime = time - fallDuration;
  return {
    y: -0.42 * Math.exp(-2.7 * waterTime) * Math.sin(7 * waterTime)
      + Math.sin(waterTime * 1.45) * 0.045 * Math.min(1, waterTime / 2),
    rotation: Math.sin(waterTime * 1.1) * 0.025,
    ripple: Math.max(0, 1 - waterTime / 1.2),
  };
}
