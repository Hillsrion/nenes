/**
 * Utility: Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/**
 * Utility: Modulo operation that handles negative numbers
 */
export const modulo = (value: number, modulus: number): number =>
  ((value % modulus) + modulus) % modulus;

/**
 * Utility: Linear interpolation
 */
export const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * factor;

/**
 * Utility: Wrap value within range
 */
export const wrap = (min: number, max: number, value: number): number => {
  const range = max - min;
  return min + modulo(value - min, range);
};
