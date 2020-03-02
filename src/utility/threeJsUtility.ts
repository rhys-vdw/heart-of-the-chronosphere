import { Vector2, Vector3 } from "three";

export function vec3to2({ x, y }: Vector3): Vector2 {
  return new Vector2(x, y);
}

export function vec2to3({ x, y }: Vector2): Vector3 {
  return new Vector3(x, y, 0);
}
