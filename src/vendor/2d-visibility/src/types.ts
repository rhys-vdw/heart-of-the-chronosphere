export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box extends Point {
  readonly width: number;
  readonly height: number;
}

export interface EndPoint extends Point {
  beginsSegment?: boolean;
  segment: Segment;
  angle: number;
}

export interface Segment {
  readonly p1: EndPoint;
  readonly p2: EndPoint;
}

export const createSegment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Segment => {
  const p1: any = { x: x1, y: y1, angle: 0, segment: null };
  const p2: any = { x: x2, y: y2, angle: 0, segment: null };
  const segment = { p1, p2 };

  p1.segment = segment;
  p2.segment = segment;

  return segment;
};
