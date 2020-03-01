import { EndPoint } from "./types";

export function endpointCompare(
  pointA: EndPoint,
  pointB: EndPoint
): -1 | 0 | 1 {
  if (pointA.angle > pointB.angle) return 1;
  if (pointA.angle < pointB.angle) return -1;
  if (!pointA.beginsSegment && pointB.beginsSegment) return 1;
  if (pointA.beginsSegment && !pointB.beginsSegment) return -1;
  return 0;
}
