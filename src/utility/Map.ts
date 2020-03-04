import { Vector2 } from "three";
import { Maze, Room, Feature } from "../utility/mazeGenerator";
import { createSegment, Segment } from "../vendor/2d-visibility/src/types";
import { last, times } from "lodash";

export interface Map {
  walls: readonly Segment[];
}

const center = new Vector2(0, 0);

const getRingDepth = ({ radius, rooms }: Maze) => radius * (1 / rooms.length);

export const forEachRoom = (
  maze: Maze,
  cb: (room: Room, ringIndex: number, roomIndex: number) => void
) => maze.rooms.forEach((ring, i) => ring.forEach((room, j) => cb(room, i, j)));

export const getRoomCenter = (
  maze: Maze,
  ringIndex: number,
  roomIndex: number
): Vector2 => {
  const ringDepth = getRingDepth(maze);
  const midRadius = (ringIndex + 0.5) * ringDepth;
  return new Vector2(0, midRadius).rotateAround(
    new Vector2(0, 0),
    (Math.PI * 2 * (roomIndex + 0.5)) / maze.rooms[ringIndex].length
  );
};

export function mazeToMap(maze: Maze): Map {
  const walls = [] as Segment[];
  const addWall = (from: Vector2, to: Vector2) => {
    walls.push(createSegment(from.x, from.y, to.x, to.y));
  };

  const { rooms } = maze;
  const ringDepth = getRingDepth(maze);

  const processRing = (rs: readonly Room[], i: number) => {
    // Get ring radii.
    const innerRadius = i * ringDepth;
    const outerRadius = (i + 1) * ringDepth;

    // Get the inner and router point of the first room.
    const firstRoomInner = new Vector2(0, innerRadius);
    const firstRoomOuter = new Vector2(0, outerRadius);

    // Calculate walls for each room.
    const roomAngle = (Math.PI * 2) / rs.length;
    rs.forEach((room, j) => {
      const clockwiseAngle = j * roomAngle;
      const counterClockwiseAngle = (j - 1) * roomAngle;

      const roomInner = firstRoomInner
        .clone()
        .rotateAround(center, clockwiseAngle);

      if (room.isInnerBlocked) {
        const roomInnerStart = firstRoomInner
          .clone()
          .rotateAround(center, counterClockwiseAngle);
        addWall(roomInnerStart, roomInner);
      }

      if (room.isClockwiseBlocked) {
        const roomOuter = firstRoomOuter
          .clone()
          .rotateAround(center, clockwiseAngle);
        addWall(roomInner, roomOuter);
      }
    });
  };

  rooms.forEach(processRing);
  const outer = times(
    last(rooms)!.length,
    (): Room => ({
      isInnerBlocked: true,
      isClockwiseBlocked: false,
      feature: Feature.None
    })
  );
  processRing(outer, rooms.length);

  return { walls };
}
