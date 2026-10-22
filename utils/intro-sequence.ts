/** Figma frames 1–7, in scroll order. Each format shares its own photo/cutout canvas. */
export const INTRO_END = 6.6;
export const INTRO_TIMELINE_DURATION = 3.2;
export const INTRO_BACKGROUNDS = [1, 2, 3, 4].map(
  (index) => `/images/intro/background-0${index}.webp`,
);
export const INTRO_CUTOUTS = [1, 2, 3].map(
  (index) => `/images/intro/cutout-0${index}.webp`,
);
// Cover can make the rendered photo wider than the viewport on tall screens.
export const INTRO_DESKTOP_SIZES = '(min-aspect-ratio: 16/9) 100vw, 177.78svh';
function desktopSrcset(src: string, nativeWidth: number) {
  const variants = [960, 1366].filter(width => width < nativeWidth).map(width =>
    `${src.replace('/intro/', '/intro/desktop/').replace('.webp', `-${width}.webp`)} ${width}w`,
  );
  return [...variants, `${src} ${nativeWidth}w`].join(', ');
}
export const INTRO_BACKGROUND_SRCSETS = INTRO_BACKGROUNDS.map((src, index) =>
  desktopSrcset(src, index === 0 ? 1366 : 1920),
);
export const INTRO_CUTOUT_SRCSETS = INTRO_CUTOUTS.map(src => desktopSrcset(src, 1920));
// Use the portrait exports on phones and portrait tablets, including large iPads.
export const INTRO_MOBILE_MEDIA = '(max-width: 768px), (max-width: 1366px) and (orientation: portrait)';
export const INTRO_MOBILE_BACKGROUNDS = [1, 2, 3, 4].map(
  (index) => `/images/intro/mobile/background-0${index}.webp`,
);
export const INTRO_MOBILE_CUTOUTS = [1, 2, 3].map(
  (index) => `/images/intro/mobile/cutout-0${index}.webp`,
);
export const INTRO_MOBILE_ANCHORS = [0.5, 0.5, 0.6, 0.8] as const;
export const INTRO_ASSETS = [
  ...INTRO_BACKGROUNDS, ...INTRO_CUTOUTS,
  ...INTRO_MOBILE_BACKGROUNDS, ...INTRO_MOBILE_CUTOUTS,
];

/** Match object-fit: cover so the shader and foreground never drift apart. */
export function getIntroCrop(width: number, height: number, mobile: boolean) {
  const photoAspect = mobile ? 2 / 3 : 1366 / 768;
  const ratio = (width / Math.max(1, height)) / photoAspect;
  return { x: Math.min(ratio, 1), y: Math.min(1 / Math.max(ratio, 0.001), 1) };
}
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
