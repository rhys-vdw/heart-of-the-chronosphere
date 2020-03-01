import { EndPointMeta } from "./types";

export function endpointCompare(a: EndPointMeta, b: EndPointMeta): -1 | 0 | 1 {
  if (a.angle > b.angle) return 1;
  if (a.angle < b.angle) return -1;
  if (!a.beginsSegment && b.beginsSegment) return 1;
  if (a.beginsSegment && !b.beginsSegment) return -1;
  return 0;
}
