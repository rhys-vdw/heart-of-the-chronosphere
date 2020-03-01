export interface IPoint {
  x: number;
  y: number;
}

export interface IRectangle extends IPoint {
  width: number;
  height: number;
}

export interface IEndPoint extends IPoint {
  beginsSegment?: boolean;
  segment: ISegment;
  angle?: number;
}

export interface ISegment {
  p1: IEndPoint;
  p2: IEndPoint;
  d: 0;
}

export function Segment(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ISegment;
