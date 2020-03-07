import { Maze, getTileCenter } from "./mazeGenerator";
import { sample, isEqual } from "lodash";
import { repeat } from "./math";
import { Vector2 } from "three";

export interface Coordinate {
  readonly r: number;
  readonly t: number;
}

export function getParent(maze: Maze, { r, t }: Coordinate): Coordinate {
  if (r === 0) {
    throw new RangeError("Tile has no parent");
  }
  if (r === 1) {
    return { r: r - 1, t: 0 };
  }
  const tileRing = maze.rings[r];
  const parentRing = maze.rings[r - 1];
  return {
    r: r - 1,
    t: parentRing.length < tileRing.length ? Math.floor(t / 2) : t
  };
}

export function getChildren(maze: Maze, { r, t }: Coordinate): Coordinate[] {
  if (r >= maze.rings.length) {
    throw new RangeError("Tile has no children");
  }
  const tileRing = maze.rings[r];
  const childRing = maze.rings[r + 1];
  if (tileRing.length < childRing.length) {
    const firstChildT = t * 2;
    return [
      {
        r: r + 1,
        t: firstChildT
      },
      {
        r: r + 1,
        t: (firstChildT + 1) % childRing.length
      }
    ];
  } else {
    return [{ r: r + 1, t }];
  }
}

interface Node {
  coordinate: Coordinate;
  connections: Node[];
  position: Vector2;
}

export class NavMesh {
  byCoordinate: Node[][] = [[]];

  constructor(maze: Maze) {
    let prevRingLength = 0;
    maze.rings.forEach((ring, r) => {
      this.byCoordinate[r] = [];
      ring.forEach((room, t) => {
        const node: Node = {
          coordinate: { r, t },
          connections: [],
          position: getTileCenter(maze.rings, maze.radius, r, t)
        };
        this.byCoordinate[r][t] = node;
      });
      this.byCoordinate[r].forEach((node, t, ringNodes) => {
        const room = maze.rings[r][t];
        // Connect to parent.
        if (prevRingLength > 0 && !room.isInnerBlocked) {
          const { r: pr, t: pt } = getParent(maze, node.coordinate);
          const parentNode = this.byCoordinate[pr][pt];
          parentNode.connections.push(node);
          node.connections.push(parentNode);
        }
        // Connect to sublings.
        if (!room.isClockwiseBlocked) {
          const cwNode = ringNodes[(t + 1) % ring.length];
          node.connections.push(cwNode);
          cwNode.connections.push(node);
        }
      });
      prevRingLength = ring.length;
    });
  }

  findPath(from: Coordinate, to: Coordinate): Node[] | null {
    interface SearchNode {
      readonly node: Node;
      readonly parent: SearchNode | null;
      readonly g: number;
      readonly h: number;
    }

    const fromNode = this.getNodeAtCoord(from);
    const toNode = this.getNodeAtCoord(to);
    const closedList = new Set<Node>();
    const openList: SearchNode[] = [
      {
        node: this.getNodeAtCoord(from),
        parent: null,
        g: 0,
        h: fromNode.position.distanceTo(toNode.position)
      }
    ];

    while (openList.length > 0) {
      // Get cheapest node.
      const searchNode = openList.shift()!;

      // Backtrace if this is the result.
      if (searchNode.node.coordinate === toNode.coordinate) {
        const path: Node[] = [];
        let s: SearchNode | null = searchNode;
        while (s !== null) {
          path.push(s.node);
          s = s.parent;
        }
        path.reverse();
        return path;
      }

      // Expand this node.
      searchNode.node.connections.forEach(node => {
        if (!closedList.has(node)) {
          const g =
            searchNode.g + searchNode.node.position.distanceTo(node.position);
          const h = node.position.distanceTo(toNode.position);
          const expandedSearchNode: SearchNode = {
            node,
            parent: searchNode,
            g,
            h
          };
          const i = openList.findIndex(sn => sn.g + sn.h > g + h);
          openList.splice(i, 0, expandedSearchNode);
          closedList.add(node);
        }
      });
    }

    // Nothing found.
    return null;
  }

  getNodeAtCoord({ r, t }: Coordinate): Readonly<Node> {
    return this.getNode(r, t);
  }

  getNode(r: number, t: number): Readonly<Node> {
    const nodeRing = this.byCoordinate[r];
    return nodeRing[repeat(t, nodeRing.length)];
  }
}

export function randomWalk(
  navMesh: NavMesh,
  start: Coordinate,
  maxVisited: number
): Coordinate[] {
  const seen = new Set<Coordinate>();
  const result: Coordinate[] = [];
  let current = navMesh.getNode(start.r, start.t);
  while (seen.size < maxVisited) {
    seen.add(current.coordinate);
    result.push(current.coordinate);
    if (current.connections.length === 0) {
      break;
    }
    current = sample(current.connections)!;
  }
  return result;
}
