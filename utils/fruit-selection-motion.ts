import { journeyFruitChoices } from "../config/bust-fruit-catalog";

export const FRUIT_FALL_DURATION = 0.78;
export const FRUIT_FALL_STAGGER = 0.14;

/** Shared screen positions for the hit areas, meshes and departure camera. */
export function fruitSelectionColumn(index: number) {
  return (index - (journeyFruitChoices.length - 1) / 2) * 0.8;
}

export function fruitLandingCount(seconds: number, reducedMotion = false) {
  if (reducedMotion) return journeyFruitChoices.length;
  if (seconds < FRUIT_FALL_DURATION) return 0;
  return Math.min(journeyFruitChoices.length, 1 + Math.floor((seconds - FRUIT_FALL_DURATION) / FRUIT_FALL_STAGGER));
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
