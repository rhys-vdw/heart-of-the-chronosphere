import { Component, h } from "preact";
import { Title } from "./Title";
import { GameView } from "./GameView";
import { SphereOptions } from "../utility/mazeGenerator";
import * as styles from "./Main.css";

interface State {
  readonly isPlaying: boolean;
  readonly sphereOptions: SphereOptions;
}

export class Main extends Component<{}, State> {
  state: State = {
    isPlaying: true,
    sphereOptions: {
      blockChance: 0.3,
      minTileWidth: 30,
      minRingDepth: 20,
      radius: 300,
      capHeight: 200,
      sliceCount: 10
    }
  };

  private handleNewGame = () => {
    this.setState({ isPlaying: true });
  };

  render() {
    const { isPlaying } = this.state;
    const view = isPlaying ? (
      <GameView
        sphereOptions={this.state.sphereOptions}
        tickDuration={1000 / 60}
      />
    ) : (
      <Title onNewGame={this.handleNewGame} />
    );
    return <main className={styles.main}>{view}</main>;
  }
}
