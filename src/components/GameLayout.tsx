import { Component, h, ComponentChild } from "preact";
import * as styles from "./GameLayout.css";

interface Props {
  readonly viewChild: ComponentChild;
  readonly logChild: ComponentChild;
}

export class GameLayout extends Component<Props> {
  render() {
    const { viewChild, logChild } = this.props;
    return (
      <div className={styles.container}>
        <section className={styles.game}>{viewChild}</section>
        <section className={styles.log}>{logChild}</section>
      </div>
    );
  }
}
