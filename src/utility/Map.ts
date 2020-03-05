import { Vector2 } from "three";
import { Maze, Tile, getRingDepth } from "../utility/mazeGenerator";
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

  const { rings } = maze;
  const ringDepth = getRingDepth(maze);

  const processRing = (tiles: readonly Tile[], i: number) => {
    // Get ring radii.
    const innerRadius = i * ringDepth;
    const outerRadius = (i + 1) * ringDepth;

    // Get the inner and router point of the first tile.
    const firstTileInner = new Vector2(0, innerRadius);
    const firstTileOuter = new Vector2(0, outerRadius);

    // Calculate walls for each tile.
    const tileAngle = (Math.PI * 2) / tiles.length;
    tiles.forEach((tile, j) => {
      const clockwiseAngle = j * tileAngle;
      const counterClockwiseAngle = (j - 1) * tileAngle;

      const tileInner = firstTileInner
        .clone()
        .rotateAround(center, clockwiseAngle);

      if (tile.isInnerBlocked) {
        const tileInnerStart = firstTileInner
          .clone()
          .rotateAround(center, counterClockwiseAngle);
        addWall(tileInnerStart, tileInner);
      }

      if (tile.isClockwiseBlocked) {
        const tileOuter = firstTileOuter
          .clone()
          .rotateAround(center, clockwiseAngle);
        addWall(tileInner, tileOuter);
      }
    });
  };

  rings.forEach(processRing);
  const outer = times(
    last(rings)!.length,
    (): Tile => ({
      isInnerBlocked: true,
      isClockwiseBlocked: false
    })
  );
  processRing(outer, rings.length);

  return { walls };
}
