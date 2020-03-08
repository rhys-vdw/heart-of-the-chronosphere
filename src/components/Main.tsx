import { Component, h } from "preact";
import { Title } from "./Title";
import { GameView } from "./GameView";
import { SphereOptions } from "../utility/mazeGenerator";
import * as styles from "./Main.css";

interface State {
  readonly isPlaying: boolean;
  readonly sphereOptions: SphereOptions;
  readonly subtitle: string;
}

const defaultSubtitle = "Created by Rhys van der Waerden for 7DRL 2020";
const victorySubtitle = "You are victorious!";

export class Main extends Component<{}, State> {
  state: State = {
    isPlaying: false,
    sphereOptions: {
      blockChance: 0.3,
      minTileWidth: 30,
      minRingDepth: 20,
      minRadius: 50,
      maxRadius: 300,
      sliceCount: 11
    },
    subtitle: defaultSubtitle
  };

  private handleNewGame = () => {
    this.setState({ isPlaying: true });
  };

  private handleGameOver = () => {
    this.setState({ isPlaying: false, subtitle: defaultSubtitle });
  };

  private handleVictory = () => {
    this.setState({ isPlaying: false, subtitle: victorySubtitle });
  };

  render() {
    const { isPlaying, subtitle } = this.state;
    const view = isPlaying ? (
      <GameView
        sphereOptions={this.state.sphereOptions}
        tickDuration={1000 / 60}
        onGameOver={this.handleGameOver}
        onVictory={this.handleVictory}
      />
    ) : (
      <Title onNewGame={this.handleNewGame} subtitle={subtitle} />
    );
    return <main className={styles.main}>{view}</main>;
  }
}
