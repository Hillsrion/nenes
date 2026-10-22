export const FRUIT_COVER_PROGRESS = 0.52;
export const FRUIT_COVER_DEPTH = -3;

/** Grow to mask the viewport at a distance, then shrink during the exit. */
export function fruitFlightScale(progress: number, aspect: number, fov: number, initialRadius: number) {
  const halfHeight = Math.tan(fov * Math.PI / 360);
  const diagonal = Math.hypot(halfHeight * aspect, halfHeight);
  const coverRadius = -FRUIT_COVER_DEPTH * diagonal / Math.hypot(1, diagonal) * 1.05;
  const coverScale = Math.max(1, coverRadius / (initialRadius * 0.65));
  const p = Math.max(0, Math.min(1, progress));
  const phase = p <= FRUIT_COVER_PROGRESS
    ? p / FRUIT_COVER_PROGRESS
    : (1 - p) / (1 - FRUIT_COVER_PROGRESS);
  const blend = phase * phase * (3 - 2 * phase);
  return 1 + (coverScale - 1) * blend;
}

/** Camera-local horizontal sweep, followed by a shallow arc away from the lens. */
export function fruitFlightPosition(progress: number, initialX: number, initialY: number, arcRadius = 4) {
  const p = Math.max(0, Math.min(1, progress));
  const approach = Math.min(1, p / FRUIT_COVER_PROGRESS);
  const center = approach * approach * (3 - 2 * approach);
  if (p <= FRUIT_COVER_PROGRESS) return {
    x: initialX * (1 - center) - arcRadius * 0.12 * Math.sin(Math.PI * approach),
    y: initialY * (1 - center),
    z: -8 + (8 + FRUIT_COVER_DEPTH) * Math.sin(approach * Math.PI / 2),
  };
  const angle = (p - FRUIT_COVER_PROGRESS) / (1 - FRUIT_COVER_PROGRESS) * Math.PI / 2;
  return {
    x: arcRadius * Math.sin(angle),
    y: 0,
    z: FRUIT_COVER_DEPTH - arcRadius * 0.25 * (1 - Math.cos(angle)),
  };
}
