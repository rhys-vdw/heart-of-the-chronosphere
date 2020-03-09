import { Component, h, ComponentChild } from "preact";
import * as styles from "./GameLayout.css";

interface Props {
  readonly viewChild: ComponentChild;
  readonly statsChild: ComponentChild;
  readonly logChild: ComponentChild;
}

export class GameLayout extends Component<Props> {
  render() {
    const { viewChild, logChild, statsChild } = this.props;
    return (
      <div className={styles.container}>
        <section className={styles.game}>{viewChild}</section>
        <div className={styles.bar}>
          <section className={styles.status}>{statsChild}</section>
          <section className={styles.log}>{logChild}</section>
        </div>
      </div>
    );
  }
}
