import { Component, h } from "preact";
import { Css, boxStyle } from "./style";
import { Title } from "./Title";

const mainStyle: Css = {
  ...boxStyle,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column"
};

const gameStyle: Css = {
  ...boxStyle,
  flexGrow: 10,
  margin: "1em",
  marginBottom: 0
};

const statusStyle = {
  ...boxStyle,
  flexGrow: 1,
  margin: "1em"
};

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
      <main style={mainStyle}>
        <section style={gameStyle}>
          <Title onNewGame={this.handleNewGame} />
        </section>
        <section style={statusStyle}>Status bar</section>
      </main>
    );
  }
}
