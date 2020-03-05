import { range, sampleSize, sumBy, times } from "lodash";
import { Vector2 } from "three";
import { EntityType } from "../game/Entity";
import { entityTypes } from "../game/entityFactories";

export interface MazeOptions {
  readonly blockChance: number;
  readonly radius: number;
  readonly ringCount: number;
  readonly minTileWidth: number;
}

export interface Tile {
  isInnerBlocked: boolean;
  isClockwiseBlocked: boolean;
}

function createTile(): Tile {
  return {
    isInnerBlocked: false,
    isClockwiseBlocked: false
  };
}

export interface Spawn {
  readonly type: EntityType;
  readonly position: Vector2;
}

/** List of rings of tiles, from innermost to outermost */
export type Rings = ReadonlyArray<ReadonlyArray<Readonly<Tile>>>;

export interface Maze {
  readonly rings: Rings;
  readonly radius: number;
  readonly spawns: readonly Spawn[];
}

export function generateEmptyLevel(
  radius: number,
  ringCount: number,
  minTileWidth: number
) {
  if (ringCount < 1) throw new TypeError(`ringCount === ${ringCount}`);

  const rings = [[createTile()]];

  for (let i = 1; i < ringCount; i++) {
    const ringRadius = (i + 1) * radius * (1 / ringCount);
    const circumference = toCircumference(ringRadius);
    const maxTileCount = Math.floor(circumference / minTileWidth);
    rings.push(times(nextPowerOfTwo(maxTileCount), () => createTile()));
  }

  return { radius, rings, spawns: [] as Spawn[] };
}

export function generateRandomMaze({
  blockChance,
  radius,
  ringCount,
  minTileWidth
}: MazeOptions): Maze {
  const maze = generateEmptyLevel(radius, ringCount, minTileWidth);

  let tileCount = 0;
  maze.rings.forEach(ring => {
    tileCount += ring.length;
    ring.forEach(tile => {
      tile.isClockwiseBlocked = Math.random() < blockChance;
      tile.isInnerBlocked = Math.random() < blockChance;
    });
  });

  if (tileCount < 2) {
    throw new Error(`tileCount < 2: ${tileCount}`);
  }
  const tileIndexes = range(tileCount);
  const [downIndex, upIndex] = sampleSize(tileIndexes, 2);

  function spawnAtIndex(index: number, type: EntityType) {
    const [i, j] = getTileCoordinate(maze, index);
    const position = getTileCenter(maze.rings, maze.radius, i, j);
    maze.spawns.push({ position, type });
  }

  spawnAtIndex(downIndex, entityTypes.stairsDown);
  spawnAtIndex(upIndex, entityTypes.stairsUp);

  return maze;
}

function toCircumference(radius: number) {
  return 2 * Math.PI * radius;
}

function nextPowerOfTwo(i: number) {
  return Math.pow(2, Math.ceil(Math.log2(i)));
}

export interface SphereOptions {
  readonly capHeight: number;
  readonly blockChance: number;
  readonly radius: number;
  readonly sliceCount: number;
  readonly minRingDepth: number;
  readonly minTileWidth: number;
}

export function generateSphereOptions({
  radius,
  capHeight,
  sliceCount,
  blockChance,
  minRingDepth,
  minTileWidth
}: SphereOptions): MazeOptions[] {
  const totalSliceHeight = (radius - capHeight) * 2;
  const sliceHeight = totalSliceHeight / sliceCount;
  return times<MazeOptions>(sliceCount, i => {
    const a = totalSliceHeight / 2 - sliceHeight * i;
    const c = radius;
    const b = Math.sqrt(Math.pow(c, 2) - Math.pow(a, 2));
    return {
      radius: b,
      blockChance,
      ringCount: Math.max(1, Math.floor(b / minRingDepth)),
      minTileWidth
    };
  });
}

export const getRingDepth = (rings: Rings, radius: number) =>
  radius * (1 / rings.length);

export const getTileCoordinate = (
  maze: Maze,
  index: number
): [number, number] => {
  let tileCount = 0;
  for (let ringIndex = 0; ringIndex < maze.rings.length; ringIndex++) {
    const ringTileCount = maze.rings[ringIndex].length;
    if (index < tileCount + ringTileCount) {
      return [ringIndex, index - tileCount];
    }
    tileCount += ringTileCount;
  }
  throw new RangeError(`${index} out of range`);
};

export const getTileCenter = (
  rings: Rings,
  radius: number,
  ringIndex: number,
  tileIndex: number
): Vector2 => {
  const ringDepth = getRingDepth(rings, radius);
  const midRadius = (ringIndex + 0.5) * ringDepth;
  return new Vector2(0, midRadius).rotateAround(
    new Vector2(0, 0),
    (Math.PI * 2 * (tileIndex + 0.5)) / rings[ringIndex].length
  );
};
