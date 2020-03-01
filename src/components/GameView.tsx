import { h, createRef, Component } from "preact";
import * as styles from "./GameView.css";
import { generateMaze, MazeOptions } from "../utility/mazeGenerator";
import * as THREE from "three";
// tslint:disable-next-line:no-duplicate-imports
import {
  Scene,
  WebGLRenderer,
  Vector2,
  PerspectiveCamera,
  Vector3
} from "three";
import * as p2 from "p2";

const wallWidth = 1;

const Layers = {
  Environment: 0x01
};

interface Props {
  mazeOptions: MazeOptions;
}

export class GameView extends Component<Props> {
  private canvasRef = createRef<HTMLCanvasElement>();
  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;

  private world!: p2.World;

  // -- Lifecycle --

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    // -- Initialize physics world --

    this.world = new p2.World();

    const addWall = (from: Vector2, to: Vector2) => {
      const wallLine = to.clone().sub(from);
      const shape = new p2.Box({
        collisionGroup: Layers.Environment,
        width: wallLine.length(),
        height: wallWidth
      });
      const wallCenter = from.add(wallLine.clone().divideScalar(2));
      const body = new p2.Body({
        position: wallCenter.toArray() as [number, number],
        angle: wallLine.angle()
      });
      body.addShape(shape);
      this.world.addBody(body);
    };

    const center = new Vector2(0, 0);
    const { radius, rooms } = generateMaze(this.props.mazeOptions);
    const ringDepth = radius * (1 / rooms.length);
    const points: Vector3[] = [];
    rooms.forEach((rs, i) => {
      // Draw ring.
      const innerRadius = i * ringDepth;
      const outerRadius = (i + 1) * ringDepth;

      // Get the inner and router point of the first room.
      const firstRoomInner = new Vector2(0, innerRadius);
      const firstRoomOuter = new Vector2(0, outerRadius);

      // Draw radiual room separators.
      const roomAngle = (Math.PI * 2) / rs.length;
      rs.forEach((room, j) => {
        const clockwiseAngle = j * roomAngle;
        const counterClockwiseAngle = (j - 1) * roomAngle;

        const roomInner = firstRoomInner
          .clone()
          .rotateAround(center, clockwiseAngle);

        if (room.isInnerBlocked) {
          const roomInnerStart = firstRoomInner
            .clone()
            .rotateAround(center, counterClockwiseAngle);
          points.push(
            new Vector3(roomInnerStart.x, roomInnerStart.y, 0),
            new Vector3(roomInner.x, roomInner.y, 0)
          );
          addWall(roomInnerStart, roomInner);
        }

        if (room.isClockwiseBlocked) {
          const roomOuter = firstRoomOuter
            .clone()
            .rotateAround(center, clockwiseAngle);
          points.push(
            new Vector3(roomInner.x, roomInner.y, 0),
            new Vector3(roomOuter.x, roomOuter.y, 0)
          );
          addWall(roomInner, roomOuter);
        }
      });
    });

    // -- Initialize renderer --

    const canvas = this.canvasRef.current!;
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.z = 400;
    window.addEventListener("wheel", this.handleWheel);

    this.renderer = new WebGLRenderer({ canvas });

    this.updateRendererSize();
    window.addEventListener("resize", this.updateRendererSize);

    const wallGeometry = new THREE.Geometry();
    wallGeometry.vertices = points;
    const wallLineSegments = new THREE.LineSegments(
      wallGeometry,
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    wallLineSegments.visible = true;
    this.scene.add(wallLineSegments);

    const animate = () => {
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateRendererSize);
  }

  // -- Event handlers --

  private handleWheel = (event: WheelEvent) => {
    this.camera.position.z += event.deltaY * 0.01;
  };

  private updateRendererSize = () => {
    const canvas = this.canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();

    this.camera.aspect = bounds.width / bounds.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(bounds.width, bounds.height, false);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  };

  // -- Private interface --

  render() {
    const canvasProps = { ref: this.canvasRef, resize: true } as any;
    return <canvas className={styles.canvas} {...canvasProps} />;
  }
}
