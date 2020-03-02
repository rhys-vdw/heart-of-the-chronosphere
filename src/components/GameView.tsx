import { h, createRef, Component } from "preact";
import { remove } from "lodash";
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
  Raycaster,
  Object3D,
  Material
} from "three";
import { loadMap } from "../vendor/2d-visibility/src/loadMap";
import { calculateVisibility } from "../vendor/2d-visibility/src/visibility";
import { Segment } from "../vendor/2d-visibility/src/types";
import { mazeToMap, Map } from "../utility/Map";
import { Game, CommandStatus, MoveCommand, Character } from "../game/Game";

const wallMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const viewMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  opacity: 0.1,
  transparent: true
});
const horizontalPlane = new Plane(new Vector3(0, 0, 1), 0);

const circleCurve = new THREE.EllipseCurve(
  0,
  0,
  // x, y radius.
  1,
  1,
  // Full circle.
  0,
  2 * Math.PI,
  false, // clockwise
  0 // rotation
);
const ringGeometry = new THREE.BufferGeometry().setFromPoints(
  circleCurve.getPoints(32)
);

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

const tickDuration = 1000 / 60;

export class GameView extends Component<Props, State> {
  private canvasRef = createRef<HTMLCanvasElement>();
  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private viewMesh!: Mesh;
  private wallLineSegments!: LineSegments;
  private lastTickTime: number = 0;
  private game: Game;
  private characterViews: THREE.Line[] = [];
  private viewByCharacter: WeakMap<Character, THREE.Line> = new WeakMap();

  constructor(props: Props) {
    super(props);
    this.state = generateState(props.mazeOptions);
    this.game = new Game(this.state.map, {
      position: { x: 0, y: 0 },
      species: { name: "Human", color: 0x3333ff },
      stats: {
        moveSpeed: 5,
        radius: 5
      },
      currentCommand: null,
      currentCommandTickCount: 0
    });
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
    this.viewMesh.translateZ(0);
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

    this.lastTickTime = Date.now();
    const animate = () => {
      if (!this.game.isWaitingForCommand()) {
        const time = Date.now();
        const delta = time - this.lastTickTime;
        const tickDelta = Math.floor(delta / tickDuration);
        for (let i = 0; i < tickDelta; i++) {
          const status = this.game.tick();
          this.lastTickTime += tickDuration;
          if (status === CommandStatus.Complete) {
            break;
          }
        }
      }
      this.updateCharacters();
      this.updateVisibilityPolygon();
      this.renderer.render(this.scene, this.camera);

      requestAnimationFrame(animate);
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
        onMouseDown={this.handleMouseDown}
        {...canvasProps}
      />
    );
  }

  // -- Event handlers --

  private raycaster = new Raycaster();
  private handleMouseDown = (event: MouseEvent) => {
    if (!this.game.isWaitingForCommand()) return;
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
    this.game.setCommand(new MoveCommand({ x: target.x, y: target.y }));
    this.lastTickTime = Date.now();
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
    const { position } = this.game.player;

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

  private updateCharacters() {
    const isVisible = new Set<THREE.Line>();
    this.game.getVisibleCharacters().forEach(character => {
      let obj = this.viewByCharacter.get(character) ?? null;
      if (obj === null) {
        obj = GameView.createRing(
          character.stats.radius,
          character.species.color
        );
        obj.translateZ(-0.1);
        this.scene.add(obj);
        this.viewByCharacter.set(character, obj);
      } else if (obj.parent === null) {
        this.scene.add(obj);
      }
      isVisible.add(obj);

      obj.position.x = character.position.x;
      obj.position.y = character.position.y;
    });
    remove(this.characterViews, obj => {
      if (isVisible.has(obj)) {
        return false;
      } else {
        this.scene.remove(obj);
        return true;
      }
    });
  }

  static lineMaterialByColor = new Map<number, Material>();
  private static createRing(radius: number, color: number) {
    let material = this.lineMaterialByColor.get(color) ?? null;
    if (material === null) {
      material = new THREE.LineBasicMaterial({ color });
      this.lineMaterialByColor.set(color, material);
    }
    const ring = new THREE.Line(ringGeometry, material);
    ring.scale.x = radius;
    ring.scale.y = radius;
    return ring;
  }
}
