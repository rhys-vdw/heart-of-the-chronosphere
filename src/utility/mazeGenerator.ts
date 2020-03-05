import { range, sampleSize, sumBy, times } from "lodash";
import { Vector2 } from "three";
import { EntityType } from "../game/Entity";
import { entityTypes } from "../game/entityFactories";

export interface MazeOptions {
  readonly blockChance: number;
  readonly radius: number;
  readonly ringCount: number;
  readonly minRoomWidth: number;
}

export interface Room {
  isInnerBlocked: boolean;
  isClockwiseBlocked: boolean;
}

function createRoom(blockChance: number): Room {
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
  /** List of rings of rooms, from innermost to outermost */
  readonly rings: ReadonlyArray<ReadonlyArray<Readonly<Room>>>;
  readonly radius: number;
  readonly spawns: readonly Spawn[];
}

export function generateMaze({
  blockChance,
  radius,
  ringCount,
  minRoomWidth
}: MazeOptions): Maze {
  const maze = {
    radius,
    rings: [] as Room[][],
    spawns: [] as Spawn[]
  };

  if (ringCount < 1) throw new TypeError(`ringCount === ${ringCount}`);

  maze.rings[0] = [createRoom(0)];

  for (let i = 1; i < ringCount; i++) {
    const ringRadius = (i + 1) * radius * (1 / ringCount);
    const circumference = toCircumference(ringRadius);
    const maxRoomCount = Math.floor(circumference / minRoomWidth);
    maze.rings.push(
      times(nextPowerOfTwo(maxRoomCount), () => createRoom(blockChance))
    );
  }

  const roomCount = sumBy(maze.rings, ring => ring.length);
  if (roomCount < 2) {
    throw new Error(`roomCount < 2: ${roomCount}`);
  }
  const roomIndexes = range(roomCount);
  const [downIndex, upIndex] = sampleSize(roomIndexes, 2);

  function spawnAtIndex(index: number, type: EntityType) {
    const [i, j] = getRoomCoordinate(maze, index);
    const position = getRoomCenter(maze, i, j);
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
  readonly minRoomWidth: number;
}

export function generateSphereOptions({
  radius,
  capHeight,
  sliceCount,
  blockChance,
  minRingDepth,
  minRoomWidth
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
      minRoomWidth
    };
  });
}

export const getRingDepth = ({ radius, rings: rooms }: Maze) =>
  radius * (1 / rooms.length);

export const forEachRoom = (
  maze: Maze,
  cb: (room: Room, ringIndex: number, roomIndex: number) => void
) => maze.rings.forEach((ring, i) => ring.forEach((room, j) => cb(room, i, j)));

export const getRoomCoordinate = (
  maze: Maze,
  index: number
): [number, number] => {
  let roomCount = 0;
  for (let ringIndex = 0; ringIndex < maze.rings.length; ringIndex++) {
    const ringRoomCount = maze.rings[ringIndex].length;
    if (index < roomCount + ringRoomCount) {
      return [ringIndex, index - roomCount];
    }
    roomCount += ringRoomCount;
  }
  throw new RangeError(`${index} out of range`);
};

export const getRoomCenter = (
  maze: Maze,
  ringIndex: number,
  roomIndex: number
): Vector2 => {
  const ringDepth = getRingDepth(maze);
  const midRadius = (ringIndex + 0.5) * ringDepth;
  return new Vector2(0, midRadius).rotateAround(
    new Vector2(0, 0),
    (Math.PI * 2 * (roomIndex + 0.5)) / maze.rings[ringIndex].length
  );
};
