import { h, createRef, Component } from "preact";
import * as styles from "./GameView.css";
import { generateMaze, Maze, MazeOptions } from "../utility/mazeGenerator";
import { Vector2 } from "three";

interface Props {
  mazeOptions: MazeOptions;
}

export class GameView extends Component<Props> {
  private canvasRef = createRef<HTMLCanvasElement>();

  // -- Lifecycle --

  componentDidMount() {
    this.redraw();
  }

  componentWillUpdate() {
    this.redraw();
  }

  // -- Private interface --

  private redraw() {
    const canvas = this.canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const cssBounds = canvas.getBoundingClientRect();
    const resolution = new Vector2(
      cssBounds.width,
      cssBounds.height
    ).multiplyScalar(window.devicePixelRatio);
    canvas.width = resolution.x;
    canvas.height = resolution.y;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const center = resolution.clone().divideScalar(2 * window.devicePixelRatio);

    const maze = generateMaze(this.props.mazeOptions);
    const { radius, rooms } = maze;
    const ringDepth = radius * (1 / rooms.length);
    rooms.forEach((rs, i) => {
      // Draw ring.
      const innerRadius = (i - 1) * ringDepth;
      const outerRadius = i * ringDepth;

      const firstRoomInner = center.clone().add(new Vector2(0, innerRadius));
      const firstRoomOuter = center.clone().add(new Vector2(0, outerRadius));

      // Draw radiual room separators.
      const roomAngle = (Math.PI * 2) / rs.length;
      rs.forEach((room, j) => {
        const clockwiseAngle = j * roomAngle;
        const counterClockwiseAngle = (j - 1) * roomAngle;

        if (room.isInnerBlocked) {
          ctx.beginPath();
          ctx.arc(
            center.x,
            center.y,
            outerRadius,
            counterClockwiseAngle,
            clockwiseAngle
          );
          ctx.strokeStyle = "white";
          ctx.stroke();
        }

        if (room.isClockwiseBlocked) {
          const roomInner = firstRoomInner
            .clone()
            .rotateAround(center, clockwiseAngle);
          const roomOuter = firstRoomOuter
            .clone()
            .rotateAround(center, clockwiseAngle);
          ctx.beginPath();
          ctx.moveTo(roomInner.x, roomInner.y);
          ctx.lineTo(roomOuter.x, roomOuter.y);
          ctx.stroke();
        }
      });
    });
  }

  render() {
    const props = { ref: this.canvasRef, resize: true } as any;
    return <canvas className={styles.canvas} {...props} />;
  }
}
