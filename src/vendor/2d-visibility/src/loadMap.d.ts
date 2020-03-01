import { IRectangle, ISegment, IPoint, IEndPoint } from "./types";

export function loadMap(
  room: Readonly<IRectangle>,
  blocks: ReadonlyArray<Readonly<IRectangle>>,
  walls: ReadonlyArray<Readonly<ISegment>>,
  lightSource: Readonly<IPoint>
): ReadonlyArray<Readonly<IEndPoint>>;
