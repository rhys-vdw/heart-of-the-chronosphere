import { times, sampleSize, sample } from "lodash";

export enum Feature {
  None,
  StairsUp,
  StairsDown
}

export interface MazeOptions {
  readonly blockChance: number;
  readonly radius: number;
  readonly ringCount: number;
  readonly minRoomWidth: number;
}

export interface Room {
  isInnerBlocked: boolean;
  isClockwiseBlocked: boolean;
  feature: Feature;
}

function createRoom(blockChance: number): Room {
  return {
    isInnerBlocked: Math.random() <= blockChance,
    isClockwiseBlocked: Math.random() <= blockChance,
    feature: Feature.None
  };
}

export interface Maze {
  /** List of rings of rooms, from innermost to outermost */
  readonly rooms: ReadonlyArray<ReadonlyArray<Readonly<Room>>>;
  readonly radius: number;
}

export function generateMaze({
  blockChance,
  radius,
  ringCount,
  minRoomWidth
}: MazeOptions): Maze {
  const maze = {
    radius,
    rooms: [] as Room[][]
  };

  if (ringCount < 1) return maze;

  maze.rooms[0] = [createRoom(0)];

  if (ringCount === 1) return maze;

  for (let i = 1; i < ringCount; i++) {
    const ringRadius = (i + 1) * radius * (1 / ringCount);
    const circumference = toCircumference(ringRadius);
    const maxRoomCount = Math.floor(circumference / minRoomWidth);
    maze.rooms.push(
      times(nextPowerOfTwo(maxRoomCount), () => createRoom(blockChance))
    );
  }

  if (maze.rooms.length === 0) {
    throw new Error("Maze has no rings!");
  }
  const rings = [
    sample(maze.rooms)!,
    sample(maze.rooms.filter(rs => rs.length > 1))!
  ];
  let enterExit: Room[];
  if (rings[0] === rings[1]) {
    if (rings[0].length <= 2) {
      console.error({ rings });
      throw new Error("Too few rooms!");
    }
    enterExit = sampleSize(rings[0], 2);
  } else {
    enterExit = rings.map(rooms => sample(rooms)) as Room[];
  }

  enterExit[0]!.feature = Feature.StairsUp;
  enterExit[1]!.feature = Feature.StairsDown;

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
