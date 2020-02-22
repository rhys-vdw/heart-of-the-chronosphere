import { Component, h } from "preact";
import { StandardProperties as Css } from "csstype";
import { lineColor } from "../colors";

const box: Css = {
  border: `1px solid ${lineColor}`,
  color: lineColor
};

const mainStyle: Css = {
  ...box,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column"
};

const gameStyle: Css = {
  ...box,
  flexGrow: 10,
  margin: "1em",
  marginBottom: 0
};

const statusStyle = {
  ...box,
  flexGrow: 1,
  margin: "1em"
};

export class Main extends Component {
  render() {
    return (
      <main style={mainStyle}>
        <section style={gameStyle}>The game</section>
        <section style={statusStyle}>Status bar</section>
      </main>
    );
  }
}
