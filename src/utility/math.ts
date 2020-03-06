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
