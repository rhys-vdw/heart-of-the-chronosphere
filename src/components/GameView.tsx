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
import { Segment, createSegment } from "../vendor/2d-visibility/src/types";
import { mazeToMap } from "../utility/Map";

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

function createWallGeometry(walls: readonly Segment[]) {
  const wallGeometry = new THREE.Geometry();
  wallGeometry.vertices = walls.flatMap(w => [
    new Vector3(w.p1.x, w.p1.y, 0),
    new Vector3(w.p2.x, w.p2.y, 0)
  ]);
  return new THREE.LineSegments(wallGeometry, wallMaterial);
}

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
    // Initialize map.

    const maze = generateMaze(this.props.mazeOptions);
    const map = mazeToMap(maze);

    // Create scene.

    this.scene = new Scene();

    // Create view of map walls.

    const wallLineSegments = createWallGeometry(map.walls);
    this.scene.add(wallLineSegments);

    // Calculate view polygon.

    const position = { x: 40, y: 60 };
    const { endPoints, meta } = loadMap(
      {
        x: -maze.radius,
        y: -maze.radius,
        width: maze.radius * 2,
        height: maze.radius * 2
      },
      [],
      map.walls,
      position
    );
    const visibility = calculateVisibility(position, endPoints, meta);
    const viewGeometry = new THREE.Geometry();
    viewGeometry.vertices = [new Vector3(position.x, position.y, 0)];
    visibility.reduce((acc, [a, b], i) => {
      acc.vertices.push(new Vector3(a.x, a.y, 0));
      acc.vertices.push(new Vector3(b.x, b.y, 0));
      acc.faces.push(new THREE.Face3(0, i * 2 + 1, i * 2 + 2));
      return acc;
    }, viewGeometry);
    const viewMesh = new THREE.Mesh(viewGeometry, viewMaterial);
    this.scene.add(viewMesh);

    // Create camera.

    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.z = 400;
    window.addEventListener("wheel", this.handleWheel);

    // Initialize renderer.

    const canvas = this.canvasRef.current!;
    this.renderer = new WebGLRenderer({ canvas });
    this.updateRendererSize();
    window.addEventListener("resize", this.updateRendererSize);

    // Start rendering.

    const animate = () => {
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateRendererSize);
    window.removeEventListener("wheel", this.handleWheel);
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
