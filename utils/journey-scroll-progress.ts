/** Both camera legs use the same document coordinates as the selection gate. */
export function journeyScrollProgress(scroll: number, start: number, fruitStop: number, arrival: number) {
  const ease = (value: number) => {
    const t = Math.max(0, Math.min(1, value));
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  };
  const holdEnd = start + (fruitStop - start) * 0.75;
  if (scroll <= holdEnd) return 0;
  if (scroll <= fruitStop) return 0.5 * ease((scroll - holdEnd) / Math.max(1, fruitStop - holdEnd));
  return 0.5 + 0.5 * ease((scroll - fruitStop) / Math.max(1, arrival - fruitStop));
}
