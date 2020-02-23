import { times } from "lodash";

export enum Feature {
  None,
  Entry,
  Exit
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

  return maze;
}

function toCircumference(radius: number) {
  return 2 * Math.PI * radius;
}

function nextPowerOfTwo(i: number) {
  return Math.pow(2, Math.ceil(Math.log2(i)));
}
