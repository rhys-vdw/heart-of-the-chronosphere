import { range, sampleSize, times, sample } from "lodash";
import { Vector2 } from "three";
import { EntityType } from "../game/Entity";
import { entityTypes } from "../game/entityFactories";
import { NavMesh, Coordinate, areCoordinatesEqual } from "./navigation";

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
  readonly navMesh: NavMesh;
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

  return {
    radius,
    rings,
    spawns: [] as Spawn[],
    navMesh: null as NavMesh | null
  };
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

  // Find random entrace node.
  const tileIndexes = range(tileCount);
  const downIndex = sample(tileIndexes)!;
  const downCoord = getTileCoordinate(maze.rings, downIndex);

  // Knock its walls out to ensure it's not completely isolated.
  maze.rings[downCoord.r][downCoord.t].isClockwiseBlocked = false;
  maze.rings[downCoord.r][downCoord.t].isInnerBlocked = false;

  // Generate nav mesh.
  maze.navMesh = new NavMesh(maze.rings, maze.radius);

  // Get a random reachable position for exit.
  const reachable = maze.navMesh
    .getReachableNodes(downCoord)
    .filter(n => !areCoordinatesEqual(n.coordinate, downCoord));
  const upCoord = sample(reachable)!.coordinate;

  function spawnAt({ r, t }: Coordinate, type: EntityType) {
    const position = getTileCenter(maze.rings, maze.radius, r, t);
    maze.spawns.push({ position, type });
  }

  spawnAt(downCoord, entityTypes.stairsDown);
  spawnAt(upCoord, entityTypes.stairsUp);

  return maze as Maze;
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

export const getRingDepth = (ringCount: number, radius: number) =>
  radius * (1 / ringCount);

export const getTileCoordinate = (rings: Rings, index: number): Coordinate => {
  let tileCount = 0;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
    const ringTileCount = rings[ringIndex].length;
    if (index < tileCount + ringTileCount) {
      return { r: ringIndex, t: index - tileCount };
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
  const ringDepth = getRingDepth(rings.length, radius);
  const midRadius = (ringIndex + 0.5) * ringDepth;
  return new Vector2(0, midRadius).rotateAround(
    new Vector2(0, 0),
    (Math.PI * 2 * (tileIndex + 0.5)) / rings[ringIndex].length
  );
};
