import { h } from "preact";
import logo from "../img/logo.svg";
import { Button } from "./Button";
import styles from "./Title.css";
import * as foo from "./Title.css";
console.log(foo);

interface Props {
  readonly onNewGame: () => void;
}

export const Title = ({ onNewGame }: Props) => (
  <div className={styles.title}>
    <img className={styles.logo} src={logo} />
    <p>Created by Rhys van der Waerden for 7DRL 2020</p>
    <Button onClick={onNewGame}>New game</Button>
  </div>
);
