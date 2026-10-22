// Extend the teaching sequences without stretching their introductions.
export const SYMPTOMS_HEIGHT_SVH = 1000;
export const symptomIntroPosition = (percent: number) =>
  `${percent * 600 / SYMPTOMS_HEIGHT_SVH}% top`;

export function examinationScrollTiming(stepsCount: number) {
  const firstChange = 0.65;
  const stepSpan = 0.30;
  const end = firstChange + Math.max(0, stepsCount - 1) * stepSpan + 0.25;
  // The original introduction used 500svh per timeline unit, plus the viewport.
  return { firstChange, stepSpan, end, heightSvh: 100 + end * 500 };
}
