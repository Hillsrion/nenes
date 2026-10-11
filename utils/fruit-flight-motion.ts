export const FRUIT_COVER_PROGRESS = 0.52;

/** Camera-local horizontal sweep, followed by a circular exit in front of the lens. */
export function fruitFlightPosition(progress: number, initialX: number, initialY: number, arcRadius = 4) {
  const p = Math.max(0, Math.min(1, progress));
  const approach = Math.min(1, p / FRUIT_COVER_PROGRESS);
  const center = approach * approach * (3 - 2 * approach);
  if (p <= FRUIT_COVER_PROGRESS) return {
    x: initialX * (1 - center) - arcRadius * 0.12 * Math.sin(Math.PI * approach),
    y: initialY * (1 - center),
    z: -8 + 7.88 * Math.sin(approach * Math.PI / 2),
  };
  const angle = (p - FRUIT_COVER_PROGRESS) / (1 - FRUIT_COVER_PROGRESS) * Math.PI / 2;
  return {
    x: arcRadius * Math.sin(angle),
    y: 0,
    z: -0.12 - arcRadius * (1 - Math.cos(angle)),
  };
}
