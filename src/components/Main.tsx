import { Component, h } from "preact";
import { Title } from "./Title";
import { GameView } from "./GameView";
import { MazeOptions, SphereOptions } from "../utility/mazeGenerator";
import * as styles from "./Main.css";
import { Form } from "./Form";

interface State {
  readonly isPlaying: boolean;
  readonly mazeOptions: MazeOptions;
  readonly sphereOptions: SphereOptions;
}

export class Main extends Component<{}, State> {
  state: State = {
    isPlaying: true,
    mazeOptions: {
      blockChance: 0.5,
      minRoomWidth: 60,
      radius: 300,
      ringCount: 10
    },
    sphereOptions: {
      blockChance: 0.5,
      minRoomWidth: 60,
      minRingDepth: 30,
      radius: 300,
      capHeight: 20,
      sliceCount: 10
    }
  };

  private handleNewGame = () => {
    this.setState({ isPlaying: true });
  };

  private handleSphereOptionsChange = (sphereOptions: SphereOptions) => {
    this.setState({ sphereOptions });
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
          <Form
            initialValues={this.state.sphereOptions}
            onChange={this.handleSphereOptionsChange}
            submitVerb="Generate"
          />
        </section>
      </main>
    );
  }
}
