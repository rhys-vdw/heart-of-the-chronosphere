import { Vector2 } from "three";
import { Segment } from "../vendor/2d-visibility/src/types";

/**
 * @returns distance to intersection point or `null` if there is no hit.
 * @see https://stackoverflow.com/a/32146853/317135
 */
export function rayCastSegment(
  origin: Vector2,
  direction: Vector2,
  s1: Vector2,
  s2: Vector2
): number | null {
  const v1 = origin.clone().sub(s1);
  const v2 = s2.clone().sub(s1);
  const v3 = new Vector2(-direction.y, direction.x);

  const dot = v2.dot(v3);
  if (Math.abs(dot) < 0.000001) return null;

  const t1 = v2.cross(v1) / dot;
  const t2 = v1.dot(v3) / dot;

  if (t1 >= 0.0 && t2 >= 0.0 && t2 <= 1.0) return t1;

  return null;
}

interface RayCastResult {
  distance: number;
  segment: Segment | null;
}

export function rayCastSegmentsDetailed(
  origin: Vector2,
  direction: Vector2,
  segments: readonly Segment[]
): RayCastResult {
  let distance = Infinity;
  let segment: null | Segment = null;
  for (const s of segments) {
    const v1 = new Vector2(s.p1.x, s.p1.y);
    const v2 = new Vector2(s.p2.x, s.p2.y);
    const d = rayCastSegment(origin, direction, v1, v2);
    if (d !== null && d < distance) {
      distance = d;
      segment = s;
    }
  }
  return { distance, segment };
}

export function rayCastSegments(
  origin: Vector2,
  direction: Vector2,
  segments: readonly Segment[]
): number {
  let closest = Infinity;
  for (const segment of segments) {
    const v1 = new Vector2(segment.p1.x, segment.p1.y);
    const v2 = new Vector2(segment.p2.x, segment.p2.y);
    const d = rayCastSegment(origin, direction, v1, v2);
    if (d !== null && d < closest) {
      closest = d;
    }
  }
  return closest;
}
