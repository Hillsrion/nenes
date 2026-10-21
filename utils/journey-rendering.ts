/** The fruit entrance and flight need smooth motion, including on phones. */
export function getJourneyRenderFps(constrained: boolean, fruitMotion: boolean, rotating: boolean) {
  return fruitMotion ? 60 : constrained ? 24 : rotating ? 60 : 30;
}

/** Keep the elapsed remainder so a 24/30/60 Hz budget works on any display. */
export function nextJourneyRenderTime(timestamp: number, previous: number, fps: number) {
  const interval = 1000 / fps;
  const elapsed = timestamp - previous;
  if (elapsed < interval - 0.5) return null;
  return elapsed < interval ? timestamp : timestamp - elapsed % interval;
}
