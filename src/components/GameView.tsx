import { h, createRef, Component } from "preact";
import * as styles from "./GameView.css";
import { generateMaze, Maze } from "../utility/mazeGenerator";
import { Vector2 } from "three";

interface State {
  readonly maze: Maze;
}

export class GameView extends Component<{}, State> {
  private canvasRef = createRef<HTMLCanvasElement>();
  state: State = {
    maze: generateMaze({ minRoomWidth: 60, radius: 300, ringCount: 10 })
  };

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
    const canvas = this.canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    const center = new Vector2(width / 2, height / 2);

    const { maze } = this.state;
    const { radius, rooms } = maze;
    const ringDepth = radius * (1 / rooms.length);
    rooms.forEach(({ length: roomCount }, i) => {
      // Draw ring.
      const innerRadius = (i - 1) * ringDepth;
      const outerRadius = i * ringDepth;
      ctx.beginPath();
      ctx.arc(center.x, center.y, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "white";
      ctx.stroke();

      const firstRoomInner = center.clone().add(new Vector2(0, innerRadius));
      const firstRoomOuter = center.clone().add(new Vector2(0, outerRadius));

      // Draw radiual room separators.
      const roomAngle = (Math.PI * 2) / roomCount;
      for (let j = 0; j < roomCount; j++) {
        const angle = j * roomAngle;
        const roomInner = firstRoomInner.clone().rotateAround(center, angle);
        const roomOuter = firstRoomOuter.clone().rotateAround(center, angle);
        ctx.beginPath();
        ctx.moveTo(roomInner.x, roomInner.y);
        ctx.lineTo(roomOuter.x, roomOuter.y);
        ctx.stroke();
      }
    });
  }

  render() {
    const props = { ref: this.canvasRef, resize: true } as any;
    return <canvas className={styles.canvas} {...props} />;
  }
}
