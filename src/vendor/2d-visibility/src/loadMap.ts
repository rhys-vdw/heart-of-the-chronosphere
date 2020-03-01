import { Segment, IRectangle, ISegment, IPoint, IEndPoint } from "./types";

const getCorners = ({ x, y, width, height }: IRectangle) => ({
  nw: [x, y] as const,
  sw: [x, y + height] as const,
  ne: [x + width, y] as const,
  se: [x + width, y + height] as const
});

function pointsToSegment(
  a: readonly [number, number],
  b: readonly [number, number]
): ISegment {
  return Segment(a[0], a[1], b[0], b[1]);
}
function rectangleToSegments(rectangle: IRectangle): ISegment[] {
  const { nw, sw, ne, se } = getCorners(rectangle);
  return [
    pointsToSegment(nw, ne),
    pointsToSegment(nw, sw),
    pointsToSegment(ne, se),
    pointsToSegment(sw, se)
  ];
}

function calculateEndPointAngles(
  lightSource: Readonly<IPoint>,
  segment: ISegment
): void {
  const { x, y } = lightSource;
  const dx = 0.5 * (segment.p1.x + segment.p2.x) - x;
  const dy = 0.5 * (segment.p1.y + segment.p2.y) - y;

  segment.d = dx * dx + dy * dy;
  segment.p1.angle = Math.atan2(segment.p1.y - y, segment.p1.x - x);
  segment.p2.angle = Math.atan2(segment.p2.y - y, segment.p2.x - x);
}

function setSegmentBeginning(segment: ISegment): void {
  let dAngle = segment.p2.angle - segment.p1.angle;

  if (dAngle <= -Math.PI) dAngle += 2 * Math.PI;
  if (dAngle > Math.PI) dAngle -= 2 * Math.PI;

  segment.p1.beginsSegment = dAngle > 0;
  segment.p2.beginsSegment = !segment.p1.beginsSegment;
}

function processSegments(
  lightSource: Readonly<IPoint>,
  segments: ReadonlyArray<ISegment>
): ReadonlyArray<ISegment> {
  segments.forEach(segment => {
    calculateEndPointAngles(lightSource, segment);
    setSegmentBeginning(segment);
  });
  return segments;
}

export function loadMap(
  room: Readonly<IRectangle>,
  blocks: ReadonlyArray<Readonly<IRectangle>>,
  walls: ReadonlyArray<Readonly<ISegment>>,
  lightSource: Readonly<IPoint>
): ReadonlyArray<Readonly<IEndPoint>> {
  const segments = processSegments(lightSource, [
    ...rectangleToSegments(room),
    ...blocks.flatMap(rectangleToSegments),
    ...walls
  ]);

  return segments.flatMap(({ p1, p2 }) => [p1, p2]);
}
