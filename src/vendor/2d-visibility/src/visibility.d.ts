import { IPoint, IEndPoint } from "./types";

export type IVisibility = ReadonlyArray<
  Readonly<[Readonly<IPoint>, Readonly<IPoint>]>
>;

export function calculateVisibility(
  origin: Readonly<IPoint>,
  endpoints: readonly Readonly<IEndPoint>[]
): IVisibility;
