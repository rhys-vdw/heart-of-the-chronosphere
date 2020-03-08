import { h } from "preact";
import logo from "../img/logo.svg";
import { Button } from "./Button";
import * as styles from "./Title.css";

interface Props {
  readonly onNewGame: () => void;
  readonly subtitle: string;
}

export const Title = ({ onNewGame, subtitle }: Props) => (
  <div className={styles.title}>
    <img className={styles.logo} src={logo} />
    <p>{subtitle}</p>
    <Button onClick={onNewGame}>New game</Button>
  </div>
);
