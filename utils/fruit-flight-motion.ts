export const FRUIT_COVER_PROGRESS = 0.52;

/** Camera-local flight: center the fruit, pass through the lens, then clear it. */
export function fruitFlightPosition(progress: number, initialX: number, initialY: number) {
  const p = Math.max(0, Math.min(1, progress));
  const approach = Math.min(1, p / FRUIT_COVER_PROGRESS);
  const center = approach * approach * (3 - 2 * approach);
  return {
    x: initialX * (1 - center),
    y: initialY * (1 - center),
    z: p <= FRUIT_COVER_PROGRESS
      ? -8 + 7.88 * approach * approach
      : -0.12 + 2.62 * (p - FRUIT_COVER_PROGRESS) / (1 - FRUIT_COVER_PROGRESS),
  };
}
