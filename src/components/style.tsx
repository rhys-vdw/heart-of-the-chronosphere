import { StandardProperties as Css } from "csstype";
import { lineColor } from "../colors";

export { Css };
export const boxStyle: Css = {
  border: `1px solid ${lineColor}`,
  color: lineColor
};
