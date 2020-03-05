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

function createTile(blockChance: number): Tile {
  return {
    isInnerBlocked: Math.random() <= blockChance,
    isClockwiseBlocked: Math.random() <= blockChance
  };
}

export interface Spawn {
  readonly type: EntityType;
  readonly position: Vector2;
}

export interface Maze {
  /** List of rings of tiles, from innermost to outermost */
  readonly rings: ReadonlyArray<ReadonlyArray<Readonly<Tile>>>;
  readonly radius: number;
  readonly spawns: readonly Spawn[];
}

export function generateMaze({
  blockChance,
  radius,
  ringCount,
  minTileWidth
}: MazeOptions): Maze {
  const maze = {
    radius,
    rings: [] as Tile[][],
    spawns: [] as Spawn[]
  };

  if (ringCount < 1) throw new TypeError(`ringCount === ${ringCount}`);

  maze.rings[0] = [createTile(0)];

  for (let i = 1; i < ringCount; i++) {
    const ringRadius = (i + 1) * radius * (1 / ringCount);
    const circumference = toCircumference(ringRadius);
    const maxTileCount = Math.floor(circumference / minTileWidth);
    maze.rings.push(
      times(nextPowerOfTwo(maxTileCount), () => createTile(blockChance))
    );
  }

  const tileCount = sumBy(maze.rings, ring => ring.length);
  if (tileCount < 2) {
    throw new Error(`tileCount < 2: ${tileCount}`);
  }
  const tileIndexes = range(tileCount);
  const [downIndex, upIndex] = sampleSize(tileIndexes, 2);

  function spawnAtIndex(index: number, type: EntityType) {
    const [i, j] = getTileCoordinate(maze, index);
    const position = getTileCenter(maze, i, j);
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

export const getRingDepth = ({ radius, rings }: Maze) =>
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
  maze: Maze,
  ringIndex: number,
  tileIndex: number
): Vector2 => {
  const ringDepth = getRingDepth(maze);
  const midRadius = (ringIndex + 0.5) * ringDepth;
  return new Vector2(0, midRadius).rotateAround(
    new Vector2(0, 0),
    (Math.PI * 2 * (tileIndex + 0.5)) / maze.rings[ringIndex].length
  );
};
