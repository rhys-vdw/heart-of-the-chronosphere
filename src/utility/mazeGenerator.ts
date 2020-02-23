import { times } from "lodash";

export enum Feature {
  None,
  Entry,
  Exit
}

export interface MazeOptions {
  readonly radius: number;
  readonly ringCount: number;
  readonly minRoomWidth: number;
}

export interface Room {
  isInnerBlocked: boolean;
  isClockwiseBlocked: boolean;
  feature: Feature;
}

function createRoom(): Room {
  return {
    isInnerBlocked: true,
    isClockwiseBlocked: true,
    feature: Feature.None
  };
}

export interface Maze {
  /** List of rings of rooms, from innermost to outermost */
  readonly rooms: ReadonlyArray<ReadonlyArray<Readonly<Room>>>;
  readonly radius: number;
}

export function generateMaze({
  radius,
  ringCount,
  minRoomWidth
}: MazeOptions): Maze {
  const maze = {
    radius,
    rooms: [] as Room[][]
  };

  if (ringCount < 1) return maze;

  maze.rooms[0] = [createRoom()];

  if (ringCount === 1) return maze;

  const remainingRooms = ringCount - 2;
  let roomCount = 2;
  for (let i = 0; i < remainingRooms; i++) {
    const ringRadius = i * radius * (1 / ringCount);
    const circumference = toCircumference(ringRadius);
    const maxRoomCount = Math.floor(circumference / minRoomWidth);
    roomCount = nextPowerOfTwo(maxRoomCount);
    // if (roomCount < maxRoomCount) {
    // roomCount *= 2;
    // }
    maze.rooms.push(times(roomCount, createRoom));
  }

  return maze;
}

function toCircumference(radius: number) {
  return 2 * Math.PI * radius;
}

function nextPowerOfTwo(i: number) {
  return Math.pow(2, Math.ceil(Math.log2(i)));
}
