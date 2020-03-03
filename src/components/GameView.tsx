import { remove, clamp } from "lodash";
import { Component, createRef, h } from "preact";
import * as THREE from "three";
// tslint:disable-next-line:no-duplicate-imports
import {
  BufferGeometry,
  Geometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  MeshBasicMaterial,
  EllipseCurve,
  Face3,
  OrthographicCamera,
  Camera
} from "three";
import { Character, CommandStatus, Game, MoveCommand } from "../game/Game";
import { MazeOptions } from "../utility/mazeGenerator";
import { vec2to3, vec3to2 } from "../utility/threeJsUtility";
import { loadMap } from "../vendor/2d-visibility/src/loadMap";
import { Segment } from "../vendor/2d-visibility/src/types";
import { calculateVisibility } from "../vendor/2d-visibility/src/visibility";
import * as styles from "./GameView.css";

const wallMaterial = new LineBasicMaterial({ color: 0xffffff });
const viewMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  opacity: 0.1,
  transparent: true
});
const horizontalPlane = new Plane(new Vector3(0, 0, 1), 0);

const circleCurve = new EllipseCurve(
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
const ringGeometry = new BufferGeometry().setFromPoints(
  circleCurve.getPoints(32)
);

function createWallPoints(walls: readonly Segment[]) {
  return walls.flatMap(w => [
    new Vector2(w.p1.x, w.p1.y),
    new Vector2(w.p2.x, w.p2.y)
  ]);
}

interface Props {
  readonly mazeOptions: MazeOptions;
}

const tickDuration = 1000 / 60;

export class GameView extends Component<Props> {
  private canvasRef = createRef<HTMLCanvasElement>();
  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: Camera;
  private viewMesh!: Mesh;
  private movementLine!: Line;
  private wallLineSegments!: LineSegments;
  private lastTickTime: number = 0;
  private game: Game;
  private characterViews: Line[] = [];
  private viewByCharacter: WeakMap<Character, Line> = new WeakMap();

  constructor(props: Props) {
    super(props);
    this.game = new Game(props.mazeOptions, {
      position: new Vector2(0, 0),
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

  componentDidUpdate() {
    this.game.regenerateMaze_TEMP(this.props.mazeOptions);
    this.updateWallLines();
    this.updateVisibilityPolygon();
  }

  componentDidMount() {
    // Create scene.

    this.scene = new Scene();

    // Create view of map walls.

    const wallGeometry = new Geometry();
    this.wallLineSegments = new LineSegments(wallGeometry, wallMaterial);
    this.scene.add(this.wallLineSegments);
    this.updateWallLines();

    // Create movement indicator line.

    const movementLineGeometry = new BufferGeometry();
    movementLineGeometry.setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0)
    ]);
    this.movementLine = new Line(
      movementLineGeometry,
      GameView.getLineMaterial(this.game.player.species.color)
    );
    this.scene.add(this.movementLine);

    // Create view polygon.

    this.viewMesh = new Mesh(new Geometry(), viewMaterial);
    this.viewMesh.translateZ(0);
    this.scene.add(this.viewMesh);

    // Create camera.

    this.camera = new OrthographicCamera(-100, 100, 100, -100, 1, 1000);
    this.camera.position.z = 200;
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
      this.camera.position.x = this.game.player.position.x;
      this.camera.position.y = this.game.player.position.y;
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
        onMouseMove={this.handleMouseMove}
        {...canvasProps}
      />
    );
  }

  // -- Event handlers --

  private raycaster = new Raycaster();
  private raycastWindowPosition(pos: { x: number; y: number }) {
    const {
      x,
      y,
      width,
      height
    } = this.canvasRef.current!.getBoundingClientRect();
    const position = new Vector2(
      ((pos.x - x) / width) * 2 - 1,
      -((pos.y - y) / height) * 2 + 1
    );
    this.raycaster.setFromCamera(position, this.camera);
    const target = new Vector3();
    this.raycaster.ray.intersectPlane(horizontalPlane, target);
    return target;
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (this.game.isWaitingForCommand()) {
      this.movementLine.visible = true;
      const from = this.game.player.position;
      const target = this.raycastWindowPosition(event);
      const to = this.game.getMaximumMoveTowardsPoint(
        this.game.player,
        vec3to2(target)
      );
      const geo = this.movementLine.geometry as BufferGeometry;
      geo.setFromPoints([vec2to3(from), vec2to3(to)]);
    } else {
      this.movementLine.visible = false;
    }
  };

  private handleMouseDown = (event: MouseEvent) => {
    if (!this.game.isWaitingForCommand()) return;
    const target = this.raycastWindowPosition(event);
    const to = this.game.getMaximumMoveTowardsPoint(
      this.game.player,
      vec3to2(target)
    );
    this.game.setPlayerCommand(new MoveCommand(to));
    this.lastTickTime = Date.now();
  };

  private zoom = 2;
  private readonly minZoom = 1.5;
  private readonly maxZoom = 5;
  private handleWheel = (event: WheelEvent) => {
    this.zoom = clamp(
      this.zoom - event.deltaY * 0.01,
      this.minZoom,
      this.maxZoom
    );
    this.updateRendererSize();
  };

  private updateRendererSize = () => {
    const canvas = this.canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();

    if (this.camera instanceof PerspectiveCamera) {
      // Tweak these numbers:
      this.camera.position.z = 200 + this.zoom;
      this.camera.aspect = bounds.width / bounds.height;
      this.camera.updateProjectionMatrix();
    } else if (this.camera instanceof OrthographicCamera) {
      const extentX = bounds.width / (2 * this.zoom);
      const extentY = bounds.height / (2 * this.zoom);
      this.camera.left = -extentX;
      this.camera.right = extentX;
      this.camera.top = extentY;
      this.camera.bottom = -extentY;
      this.camera.updateProjectionMatrix();
    } else {
      throw new TypeError(`Unexpected Camera type: {typeof(this.camera)}`);
    }

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
    const geometry = new Geometry();
    geometry.setFromPoints(
      createWallPoints(this.game.getCurrentLevel().map.walls)
    );
    this.wallLineSegments.geometry = geometry;
  }

  private updateVisibilityPolygon() {
    const { map, maze } = this.game.getCurrentLevel();
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
      acc.faces.push(new Face3(0, i * 2 + 1, i * 2 + 2));
      return acc;
    }, viewGeometry);
    viewGeometry.elementsNeedUpdate = true;
  }

  private updateCharacters() {
    const isVisible = new Set<Line>();
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

  static lineMaterialByColor = new Map<number, LineBasicMaterial>();
  private static getLineMaterial(color: number) {
    let material = this.lineMaterialByColor.get(color) ?? null;
    if (material === null) {
      material = new LineBasicMaterial({ color });
      this.lineMaterialByColor.set(color, material);
    }
    return material;
  }

  private static createRing(radius: number, color: number) {
    const ring = new Line(ringGeometry, this.getLineMaterial(color));
    ring.scale.x = radius;
    ring.scale.y = radius;
    return ring;
  }
}
