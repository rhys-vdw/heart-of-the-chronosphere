import { Vector2, Vector3 } from "three";

export function vec3to2({ x, y }: Vector3): Vector2 {
  return new Vector2(x, y);
}

export function vec2to3({ x, y }: Vector2, z = 0): Vector3 {
  return new Vector3(x, y, z);
}

export function moveTowardsInPlace(
  from: Vector2,
  to: Vector2,
  maxDistance: number
): void {
  const distance = from.distanceTo(to);
  if (distance > maxDistance) {
    from.copy(to);
  } else {
    const step = to
      .clone()
      .sub(from)
      .normalize()
      .multiplyScalar(maxDistance);
    from.add(step);
  }
}
