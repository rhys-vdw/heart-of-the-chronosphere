import { Component, h } from "preact";
import { Title } from "./Title";
import * as styles from "./Main.css";

interface State {
  readonly isPlaying: boolean;
}

export class Main extends Component<{}, State> {
  state: State = {
    isPlaying: false
  };

  private handleNewGame = () => {
    this.setState({ isPlaying: true });
  };

  render() {
    return (
      <main className={styles.main}>
        <section className={styles.game}>
          <Title onNewGame={this.handleNewGame} />
        </section>
        <section className={styles.status}>Status bar</section>
      </main>
    );
  }
}
