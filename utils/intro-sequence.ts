/** Figma frames 1–7, in scroll order. Coordinates share the 1366 × 768 artboard. */
export const INTRO_END = 6.6;
export const INTRO_TIMELINE_DURATION = 3.2;
export const INTRO_BACKGROUNDS = [1, 2, 3, 4].map(
  (index) => `/images/intro/background-0${index}.webp`,
);
export const INTRO_CUTOUTS = [1, 2, 3].map(
  (index) => `/images/intro/cutout-0${index}.webp`,
);
export const INTRO_ASSETS = [...INTRO_BACKGROUNDS, ...INTRO_CUTOUTS];
const arrivals = [[0.3, 1], [2.35, 3.05], [4.4, 5.1]] as const;
const transitions = [[1.25, 2.05], [3.3, 4.1], [5.35, 6.15]] as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function getIntroState(position: number) {
  const time = Number.isFinite(position) ? Math.max(0, position) : 0;
  let from = 0;
  let to = 0;
  let progress = 0;
  for (const [index, [start, end]] of transitions.entries()) {
    if (time < start) break;
    from = index;
    to = index + 1;
    progress = clamp((time - start) / (end - start));
  }
  const cutouts = arrivals.map(([start, end], index) => {
    const arrival = clamp((time - start) / (end - start));
    // Once aligned with its full photo, the older cutout is redundant. Removing
    // it at the next wipe lets that photo carry the old subject away naturally.
    const retired = index < 2 && time >= transitions[index + 1]![0];
    return { visible: arrival > 0 && !retired, arrival };
  });
  return { from, to, progress, cutouts };
}
