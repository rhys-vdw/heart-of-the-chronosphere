import { h, createRef, Component } from "preact";
import * as styles from "./GameView.css";

export class GameView extends Component {
  private canvasRef = createRef<HTMLCanvasElement>();

  // -- Callbacks --

  private handleWheel = (event: WheelEvent) => {
    // TODO: Zoom
  };

  // -- Lifecycle --

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    document.addEventListener("wheel", this.handleWheel);
  }

  render() {
    const props = { ref: this.canvasRef, resize: true } as any;
    return <canvas className={styles.canvas} {...props} />;
  }
}
