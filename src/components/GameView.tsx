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
import { loadMap } from "../vendor/2d-visibility/src/loadMap";
import { calculateVisibility } from "../vendor/2d-visibility/src/visibility";
import { ISegment, Segment } from "../vendor/2d-visibility/src/types";

const Layers = {
  Environment: 0x01
};

interface Props {
  mazeOptions: MazeOptions;
}

const wallMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const viewMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  opacity: 0.2,
  transparent: true
});

export class GameView extends Component<Props> {
  private canvasRef = createRef<HTMLCanvasElement>();
  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;

  // -- Lifecycle --

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    // -- Initialize physics world --

    const segments: ISegment[] = [];
    const points: Vector3[] = [];

    const addWall = (from: Vector2, to: Vector2) => {
      segments.push(Segment(from.x, from.y, to.x, to.y));
      points.push(new Vector3(from.x, from.y, 0), new Vector3(to.x, to.y, 0));
    };

    const center = new Vector2(0, 0);
    const { radius, rooms } = generateMaze(this.props.mazeOptions);
    const ringDepth = radius * (1 / rooms.length);
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
          addWall(roomInnerStart, roomInner);
        }

        if (room.isClockwiseBlocked) {
          const roomOuter = firstRoomOuter
            .clone()
            .rotateAround(center, clockwiseAngle);
          addWall(roomInner, roomOuter);
        }
      });
    });

    const position = { x: 40, y: 60 };
    const endPoints = loadMap(
      { x: -radius, y: -radius, width: radius * 2, height: radius * 2 },
      [],
      segments,
      position
    );
    const visibility = calculateVisibility(position, endPoints);
    console.log({ segments, endPoints, visibility });
    const viewGeometry = new THREE.Geometry();
    viewGeometry.vertices = [new Vector3(position.x, position.y, 0)];
    visibility.reduce((acc, [a, b], i) => {
      acc.vertices.push(new Vector3(a.x, a.y, 0));
      acc.vertices.push(new Vector3(b.x, b.y, 0));
      acc.faces.push(new THREE.Face3(0, i * 2 + 1, i * 2 + 2));
      return acc;
    }, viewGeometry);
    const viewMesh = new THREE.Mesh(viewGeometry, viewMaterial);

    // -- Initialize renderer --

    const canvas = this.canvasRef.current!;
    this.scene = new Scene();

    this.scene.add(viewMesh);

    const shape = (this.camera = new PerspectiveCamera(75, 1, 0.1, 1000));
    this.camera.position.z = 400;
    window.addEventListener("wheel", this.handleWheel);

    this.renderer = new WebGLRenderer({ canvas });

    this.updateRendererSize();
    window.addEventListener("resize", this.updateRendererSize);

    const wallGeometry = new THREE.Geometry();
    wallGeometry.vertices = points;
    const wallLineSegments = new THREE.LineSegments(wallGeometry, wallMaterial);
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
