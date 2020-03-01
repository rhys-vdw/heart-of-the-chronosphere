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

export const Rectangle = (
  x: number,
  y: number,
  width: number,
  height: number
): IRectangle => ({
  x,
  y,
  width,
  height
});

export const Block = Rectangle;
export const Room = Rectangle;

export const Point = (x: number, y: number) => ({
  x,
  y
});

export const EndPoint = (
  x: number,
  y: number,
  beginsSegment: boolean,
  segment: ISegment,
  angle: number
) => ({
  ...Point(x, y),
  beginsSegment,
  segment,
  angle
});

export const Segment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ISegment => {
  const p1: any = { x: x1, y: y1 };
  const p2: any = { x: x2, y: y2 };
  const segment: any = { p1, p2, d: 0 };

  p1.segment = segment;
  p2.segment = segment;

  return segment;
};
