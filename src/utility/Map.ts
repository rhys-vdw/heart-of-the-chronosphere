import { Vector2 } from "three";
import { Maze, Room, getRingDepth } from "../utility/mazeGenerator";
import { createSegment, Segment } from "../vendor/2d-visibility/src/types";
import { last, times } from "lodash";

export interface Map {
  walls: readonly Segment[];
}

const center = new Vector2(0, 0);

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
      isClockwiseBlocked: false
    })
  );
  processRing(outer, rooms.length);

  return { walls };
}
