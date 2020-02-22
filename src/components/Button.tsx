import { h } from "preact";
import * as styles from "./Button.css";

type Props = Omit<JSX.HTMLAttributes, "className">;

export const Button = (props: Props) => (
  <button className={styles.button} {...props} />
);
