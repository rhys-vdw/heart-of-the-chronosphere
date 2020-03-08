export const clamp = (v: number, min: number, max: number) => {
  if (v < min) {
    return min;
  }
  if (v > max) {
    return max;
  }
  return v;
};

export const repeat = (v: number, max: number) => ((v % max) + max) % max;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * @see https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve/49434653#49434653
 */
export function getNormalRandom(): number {
  let u = 0;
  let v = 0;
  // Conver [0,1) to (0,1)
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  // Translate to 0 -> 1
  num = num / 10.0 + 0.5;
  if (num > 1 || num < 0) {
    // Resample between 0 and 1.
    return getNormalRandom();
  }
  return num;
}
