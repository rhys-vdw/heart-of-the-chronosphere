import { Component, h } from "preact";
import { Title } from "./Title";
import { GameView } from "./GameView";
import { MazeOptions } from "../utility/mazeGenerator";
import * as styles from "./Main.css";
import { MazeGenerationForm } from "./MazeGenerationForm";

interface State {
  readonly isPlaying: boolean;
  readonly mazeOptions: MazeOptions;
}

export class Main extends Component<{}, State> {
  state: State = {
    isPlaying: true,
    mazeOptions: {
      blockChance: 0.5,
      minRoomWidth: 60,
      radius: 300,
      ringCount: 10
    }
  };

  private handleNewGame = () => {
    this.setState({ isPlaying: true });
  };

  private handleMazeOptionsChange = (mazeOptions: MazeOptions) => {
    this.setState({ mazeOptions });
  };

  render() {
    const { isPlaying } = this.state;
    const view = isPlaying ? (
      <GameView mazeOptions={this.state.mazeOptions} />
    ) : (
      <Title onNewGame={this.handleNewGame} />
    );
    return (
      <main className={styles.main}>
        <section className={styles.game}>{view}</section>
        <section className={styles.status}>
          <MazeGenerationForm
            initialValues={this.state.mazeOptions}
            onChange={this.handleMazeOptionsChange}
          />
        </section>
      </main>
    );
  }
}
