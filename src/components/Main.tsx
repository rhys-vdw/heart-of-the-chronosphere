import { Component, h } from "preact";
import { Title } from "./Title";
import { GameView } from "./GameView";
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
    const { isPlaying } = this.state;
    const view = isPlaying ? (
      <GameView />
    ) : (
      <Title onNewGame={this.handleNewGame} />
    );
    return (
      <main className={styles.main}>
        <section className={styles.game}>{view}</section>
        <section className={styles.status}>Status bar</section>
      </main>
    );
  }
}
