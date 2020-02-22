import { h, ComponentChild } from "preact";
import { Css, boxStyle } from "./style";

const style: Css = {
  ...boxStyle,
  background: "transparent",
  borderRadius: 0,
  padding: "0.5em 1em",
  fontSize: "inherit",
  cursor: "pointer"
};

export const Button = (props: JSX.HTMLAttributes) =>
  props.style === undefined ? (
    <button style={style} {...props} />
  ) : (
    <button
      style={props.style !== undefined ? { ...props.style, ...style } : style}
      {...props}
    />
  );
