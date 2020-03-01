import {
  createSegment,
  Box,
  Segment,
  Point,
  EndPoint,
  EndPointMeta
} from "./types";

const getCorners = ({ x, y, width, height }: Box) => ({
  nw: [x, y] as const,
  sw: [x, y + height] as const,
  ne: [x + width, y] as const,
  se: [x + width, y + height] as const
});

function pointsToSegment(
  a: readonly [number, number],
  b: readonly [number, number]
): Segment {
  return createSegment(a[0], a[1], b[0], b[1]);
}
function rectangleToSegments(rectangle: Box): Segment[] {
  const { nw, sw, ne, se } = getCorners(rectangle);
  return [
    pointsToSegment(nw, ne),
    pointsToSegment(nw, sw),
    pointsToSegment(ne, se),
    pointsToSegment(sw, se)
  ];
}

function getEndPointMetas(
  lightSource: Point,
  segment: Segment
): [EndPointMeta, EndPointMeta] {
  const { x, y } = lightSource;
  const angle1 = Math.atan2(segment.p1.y - y, segment.p1.x - x);
  const angle2 = Math.atan2(segment.p2.y - y, segment.p2.x - x);
  let dAngle = angle2 - angle1;

  if (dAngle <= -Math.PI) dAngle += 2 * Math.PI;
  if (dAngle > Math.PI) dAngle -= 2 * Math.PI;

  const does1BeginSegment = dAngle > 0;
  return [
    { beginsSegment: does1BeginSegment, angle: angle1 },
    { beginsSegment: !does1BeginSegment, angle: angle2 }
  ];
}

interface LoadedMap {
  readonly endPoints: readonly EndPoint[];
  readonly meta: WeakMap<EndPoint, EndPointMeta>;
}

export function loadMap(
  room: Box,
  blocks: readonly Box[],
  walls: readonly Segment[],
  lightSource: Point
): LoadedMap {
  const segments = [
    ...rectangleToSegments(room),
    ...blocks.flatMap(rectangleToSegments),
    ...walls
  ];
  return segments.reduce(
    (acc, segment) => {
      acc.endPoints.push(segment.p1, segment.p2);
      const [m1, m2] = getEndPointMetas(lightSource, segment);
      acc.meta.set(segment.p1, m1);
      acc.meta.set(segment.p2, m2);
      return acc;
    },
    { endPoints: [] as EndPoint[], meta: new WeakMap<EndPoint, EndPointMeta>() }
  );
}
