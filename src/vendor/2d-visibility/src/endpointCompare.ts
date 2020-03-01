import { IEndPoint } from "./types";

export function endpointCompare(
  pointA: IEndPoint,
  pointB: IEndPoint
): -1 | 0 | 1 {
  if (pointA.angle > pointB.angle) return 1;
  if (pointA.angle < pointB.angle) return -1;
  if (!pointA.beginsSegment && pointB.beginsSegment) return 1;
  if (pointA.beginsSegment && !pointB.beginsSegment) return -1;
  return 0;
}
