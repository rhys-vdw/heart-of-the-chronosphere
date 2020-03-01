import { h, createRef, Component } from "preact";
import * as styles from "./GameView.css";
import { generateMaze, MazeOptions, Maze } from "../utility/mazeGenerator";
import * as THREE from "three";
// tslint:disable-next-line:no-duplicate-imports
import {
  Scene,
  WebGLRenderer,
  Vector2,
  PerspectiveCamera,
  Vector3,
  Mesh,
  Geometry,
  LineSegments,
  Plane,
  Raycaster
} from "three";
import { loadMap } from "../vendor/2d-visibility/src/loadMap";
import { calculateVisibility } from "../vendor/2d-visibility/src/visibility";
import { Segment, Point } from "../vendor/2d-visibility/src/types";
import { mazeToMap, Map } from "../utility/Map";

const wallMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const viewMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  opacity: 0.2,
  transparent: true
});
const horizontalPlane = new Plane(new Vector3(0, 0, 1), 0);

function createWallPoints(walls: readonly Segment[]) {
  return walls.flatMap(w => [
    new Vector2(w.p1.x, w.p1.y),
    new Vector2(w.p2.x, w.p2.y)
  ]);
}

function generateState(mazeOptions: MazeOptions) {
  const maze = generateMaze(mazeOptions);
  const map = mazeToMap(maze);
  return {
    maze,
    map
  };
}

interface Props {
  readonly mazeOptions: MazeOptions;
}

interface State {
  readonly maze: Maze;
  readonly map: Map;
}

export class GameView extends Component<Props, State> {
  private canvasRef = createRef<HTMLCanvasElement>();
  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private viewMesh!: Mesh;
  private position: Point = { x: 40, y: 60 };
  private wallLineSegments!: LineSegments;

  constructor(props: Props) {
    super(props);
    this.state = generateState(props.mazeOptions);
  }

  // -- Lifecycle --

  componentWillReceiveProps(nextProps: Props) {
    this.setState(generateState(nextProps.mazeOptions));
  }

  componentDidUpdate() {
    this.updateWallLines();
    this.updateVisibilityPolygon();
  }

  componentDidMount() {
    // Create scene.

    this.scene = new Scene();

    // Create view of map walls.

    const wallGeometry = new THREE.Geometry();
    this.wallLineSegments = new THREE.LineSegments(wallGeometry, wallMaterial);
    this.scene.add(this.wallLineSegments);
    this.updateWallLines();

    // Calculate view polygon.

    this.viewMesh = new THREE.Mesh(new THREE.Geometry(), viewMaterial);
    this.scene.add(this.viewMesh);

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

  render() {
    const canvasProps = { ref: this.canvasRef, resize: true } as any;
    return (
      <canvas
        className={styles.canvas}
        onMouseMove={this.handleMouseDown}
        {...canvasProps}
      />
    );
  }

  // -- Event handlers --

  private raycaster = new Raycaster();
  private handleMouseDown = (event: MouseEvent) => {
    const {
      x,
      y,
      width,
      height
    } = this.canvasRef.current!.getBoundingClientRect();
    const position = new Vector2(
      ((event.x - x) / width) * 2 - 1,
      -((event.y - y) / height) * 2 + 1
    );
    this.raycaster.setFromCamera(position, this.camera);
    const target = new Vector3();
    this.raycaster.ray.intersectPlane(horizontalPlane, target);
    this.position = { x: target.x, y: target.y };
    this.updateVisibilityPolygon();
    console.log("Click!", this.position);
  };

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

  private updateWallLines() {
    // Doesn't update excess points
    // Fix: https://stackoverflow.com/a/31411794/317135
    //
    // const geometry = this.wallLineSegments.geometry as Geometry;
    // geometry.setFromPoints(createWallPoints(this.state.map.walls));
    // geometry.verticesNeedUpdate = true;

    this.wallLineSegments.geometry.dispose();
    const geometry = new THREE.Geometry();
    geometry.setFromPoints(createWallPoints(this.state.map.walls));
    this.wallLineSegments.geometry = geometry;
  }

  private updateVisibilityPolygon() {
    const { map, maze } = this.state;
    const { position } = this;

    // Update view polygon.

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
    const viewGeometry = this.viewMesh.geometry as Geometry;
    viewGeometry.vertices = [new Vector3(position.x, position.y, 0)];
    viewGeometry.faces.length = 0;
    visibility.reduce((acc, [a, b], i) => {
      acc.vertices.push(new Vector3(a.x, a.y, 0));
      acc.vertices.push(new Vector3(b.x, b.y, 0));
      acc.faces.push(new THREE.Face3(0, i * 2 + 1, i * 2 + 2));
      return acc;
    }, viewGeometry);
    viewGeometry.elementsNeedUpdate = true;
  }
}
