export interface IPoint {
  readonly x: number;
  readonly y: number;
}

export interface IRectangle extends IPoint {
  readonly width: number;
  readonly height: number;
}

export interface IEndPoint extends IPoint {
  beginsSegment?: boolean;
  segment: ISegment;
  angle: number;
}

export interface ISegment {
  readonly p1: IEndPoint;
  readonly p2: IEndPoint;
  /** Distance from light source to midpoint of segment */
  d: number;
}

export const createSegment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ISegment => {
  const p1: any = { x: x1, y: y1, angle: 0, segment: null };
  const p2: any = { x: x2, y: y2, angle: 0, segment: null };
  const segment: any = { p1, p2, d: 0 };

  p1.segment = segment;
  p2.segment = segment;

  return segment;
};
