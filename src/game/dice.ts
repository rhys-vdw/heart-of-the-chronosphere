/**
 * Get value in exclusive range [min, max)
 * @see https://stackoverflow.com/a/1527820/317135
 */
export function getRandomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min));
}

export function rollDie(sides: number) {
  return getRandomInt(1, sides + 1);
}

export function rollDice(count: number, sides: number) {
  let result = 0;
  for (let i = 0; i < count; i++) {
    result += rollDie(sides);
  }
  return result;
}
