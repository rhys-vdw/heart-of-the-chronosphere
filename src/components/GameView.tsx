import { clamp, remove } from "lodash";
import { Component, createRef, h } from "preact";
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  EllipseCurve,
  Face3,
  Geometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  Object3D
} from "three";
import { Character, Game } from "../game/Game";
import { MoveCommand, CommandStatus, TakeStairsCommand } from "../game/Command";
import { forEachRoom, getRoomCenter } from "../utility/Map";
import {
  Feature,
  generateSphereOptions,
  SphereOptions
} from "../utility/mazeGenerator";
import { getMousePosition } from "../utility/mouse";
import { vec2to3, vec3to2 } from "../utility/threeJsUtility";
import { loadMap } from "../vendor/2d-visibility/src/loadMap";
import { Segment } from "../vendor/2d-visibility/src/types";
import { calculateVisibility } from "../vendor/2d-visibility/src/visibility";
import * as styles from "./GameView.css";

// -- Heights --

const visionZ = 0;
const wallZ = 1;
const featureZ = 2;
const characterZ = 3;

// -- layers --

const enum Layer {
  Vision,
  Interactive,
  Environment,
  Ui
}

// -- Materials --

const wallMaterial = new LineBasicMaterial({ color: 0xffffff });
const viewMaterial = new MeshBasicMaterial({
  color: 0xffffff,
  opacity: 0.1,
  transparent: true
});
const horizontalPlane = new Plane(new Vector3(0, 0, 1), 0);

const lineMaterialByColor = new Map<number, LineBasicMaterial>();
function getLineMaterial(color: number) {
  let material = lineMaterialByColor.get(color) ?? null;
  if (material === null) {
    material = new LineBasicMaterial({ color });
    lineMaterialByColor.set(color, material);
  }
  return material;
}

// -- Geometry --

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

const stairsGeometry = new BufferGeometry().setFromPoints(
  circleCurve.getPoints(3)
);
const squareGeometry = new BufferGeometry().setFromPoints([
  new Vector3(-0.5, 0.5, 0),
  new Vector3(0.5, 0.5, 0),
  new Vector3(0.5, -0.5, 0),
  new Vector3(-0.5, -0.5, 0),
  new Vector3(-0.5, 0.5, 0)
]);

// -- User data --

interface ViewUserData {
  feature: Feature;
  character: Character | null;
}

function setUserData(object: Object3D, userData: ViewUserData) {
  object.userData = userData;
}

function getUserData(object: Object3D): ViewUserData | null {
  return object.userData.hasOwnProperty("feature")
    ? (object.userData as ViewUserData)
    : null;
}

function expectUserData(object: Object3D): ViewUserData {
  const userData = getUserData(object);
  if (userData === null) {
    throw new Error("Expected user data");
  }
  return userData;
}

// -- Factories --

function createStairs(isStairsUp: boolean, position: Vector2) {
  const stairs = new Object3D();
  const material = getLineMaterial(0xffffff);

  const square = new Line(squareGeometry, material);
  square.scale.set(10, 10, 1);
  square.layers.set(Layer.Interactive);
  stairs.attach(square);

  const arrow = new Line(stairsGeometry, material);
  arrow.layers.set(Layer.Interactive);
  arrow.scale.set(4, 4, 1);
  if (isStairsUp) {
    arrow.translateY(-0.4);
    arrow.rotateZ((Math.PI * 7) / 6);
  } else {
    arrow.translateY(0.4);
    arrow.rotateZ(Math.PI / 6);
  }
  stairs.add(arrow);

  // TODO: Add detector
  const userData = {
    feature: isStairsUp ? Feature.StairsUp : Feature.StairsDown,
    character: null
  };
  setUserData(square, userData);
  setUserData(arrow, userData);

  stairs.position.set(position.x, position.y, featureZ);

  return stairs;
}

function createWallPoints(walls: readonly Segment[]) {
  return walls.flatMap(w => [
    new Vector2(w.p1.x, w.p1.y),
    new Vector2(w.p2.x, w.p2.y)
  ]);
}

interface Props {
  readonly sphereOptions: SphereOptions;
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
  private raycaster!: Raycaster;

  constructor(props: Props) {
    super(props);
    const mazeOptions = generateSphereOptions(props.sphereOptions);
    this.game = new Game(mazeOptions, {
      position: new Vector2(0, 0),
      species: { name: "Human", color: 0x5555ff },
      stats: {
        moveSpeed: 5,
        radius: 5
      },
      currentCommand: null,
      currentCommandTickCount: 0
    });
    this.raycaster = new Raycaster();
    this.raycaster.layers.set(Layer.Interactive);
  }

  // -- Lifecycle --

  componentDidUpdate() {
    this.game.regenerateMaze_TEMP(
      generateSphereOptions(this.props.sphereOptions)
    );
    this.updateWallLines();
    this.updateVisibilityPolygon();
  }

  componentDidMount() {
    // Create scene.

    this.scene = new Scene();

    // Create view of map walls.

    const wallGeometry = new Geometry();
    this.wallLineSegments = new LineSegments(wallGeometry, wallMaterial);
    this.wallLineSegments.position.set(0, 0, wallZ);
    this.wallLineSegments.layers.set(Layer.Environment);
    this.scene.add(this.wallLineSegments);
    this.updateWallLines();

    // Add the features.

    const { maze } = this.game.getCurrentLevel();
    forEachRoom(maze, (room, i, j) => {
      if (room.feature === Feature.None) {
        return;
      }
      console.log(`Found ${room.feature} at (${i}, ${j})`);
      const midPoint = getRoomCenter(maze, i, j);
      switch (room.feature) {
        case Feature.StairsUp:
          this.scene.add(createStairs(true, midPoint));
          break;
        case Feature.StairsDown:
          this.scene.add(createStairs(false, midPoint));
          break;
        default:
          console.error(`Unmatched map feature: ${room.feature}`);
          break;
      }
    });

    // Create movement indicator line.

    const movementLineGeometry = new BufferGeometry();
    movementLineGeometry.setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0)
    ]);
    this.movementLine = new Line(
      movementLineGeometry,
      getLineMaterial(this.game.player.species.color)
    );
    this.movementLine.layers.set(Layer.Ui);
    this.movementLine.frustumCulled = false;
    this.movementLine.position.z = 100;
    this.scene.add(this.movementLine);

    // Create view polygon.

    this.viewMesh = new Mesh(new Geometry(), viewMaterial);
    this.viewMesh.layers.set(Layer.Vision);
    this.viewMesh.position.set(0, 0, visionZ);
    this.viewMesh.frustumCulled = false;
    this.scene.add(this.viewMesh);

    // Create camera.

    this.camera = new OrthographicCamera(-100, 100, 100, -100, 1, 1000);
    this.camera.translateZ(200);
    this.camera.layers.enable(Layer.Environment);
    this.camera.layers.enable(Layer.Vision);
    this.camera.layers.enable(Layer.Ui);
    this.camera.layers.enable(Layer.Interactive);
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
      this.updateCursor(getMousePosition());
      this.camera.position.set(
        this.game.player.position.x,
        this.game.player.position.y,
        this.camera.position.z
      );
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

  private windowToCameraPosition(pos: { x: number; y: number }) {
    const {
      x,
      y,
      width,
      height
    } = this.canvasRef.current!.getBoundingClientRect();
    return new Vector2(
      ((pos.x - x) / width) * 2 - 1,
      -((pos.y - y) / height) * 2 + 1
    );
  }

  private raycastInteractive(pos: { x: number; y: number }): Object3D | null {
    this.raycaster.setFromCamera(this.windowToCameraPosition(pos), this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    return intersections.length === 0 ? null : intersections[0].object;
  }

  private raycastWorldPosition(pos: { x: number; y: number }): Vector3 {
    this.raycaster.setFromCamera(this.windowToCameraPosition(pos), this.camera);
    const target = new Vector3();
    this.raycaster.ray.intersectPlane(horizontalPlane, target);
    return target;
  }

  private updateCursor = (position: { x: number; y: number }) => {
    if (this.game.isWaitingForCommand()) {
      const object = this.raycastInteractive(position);
      if (object === null) {
        const target = this.raycastWorldPosition(position);
        const to = this.game.getMaximumMoveTowardsPoint(
          this.game.player,
          vec3to2(target)
        );
        const geo = this.movementLine.geometry as BufferGeometry;
        const positionBuffer = geo.attributes.position as BufferAttribute;
        const from = this.game.player.position;
        positionBuffer.setXYZ(0, from.x, from.y, 0);
        positionBuffer.setXYZ(1, to.x, to.y, 0);
        positionBuffer.needsUpdate = true;
        this.movementLine.visible = true;
      } else {
        this.movementLine.visible = false;
      }
    } else {
      this.movementLine.visible = false;
    }
  };

  private handleMouseDown = (event: MouseEvent) => {
    if (!this.game.isWaitingForCommand()) return;
    const object = this.raycastInteractive(event);
    if (object !== null) {
      const userData = getUserData(object);
      if (userData === null) {
        console.error("No user data for object", object);
        return;
      }
      const { feature } = userData;
      switch (feature) {
        case Feature.StairsUp:
          this.game.setPlayerCommand(new TakeStairsCommand(true));
          break;
        case Feature.StairsDown:
          this.game.setPlayerCommand(new TakeStairsCommand(false));
          break;
      }
    } else {
      const target = this.raycastWorldPosition(event);
      const to = this.game.getMaximumMoveTowardsPoint(
        this.game.player,
        vec3to2(target)
      );
      this.game.setPlayerCommand(new MoveCommand(to));
      this.lastTickTime = Date.now();
    }
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
        setUserData(obj, { feature: Feature.None, character });
        obj.layers.set(Layer.Interactive);
        obj.position.set(0, 0, characterZ);
        this.scene.add(obj);
        this.viewByCharacter.set(character, obj);
        this.characterViews.push(obj);
      }
      isVisible.add(obj);

      obj.position.x = character.position.x;
      obj.position.y = character.position.y;
    });
    remove(this.characterViews, (obj, i) => {
      if (isVisible.has(obj)) {
        return false;
      } else {
        const userData = expectUserData(obj);
        if (userData.character === null) {
          throw new Error("Expected character!");
        }
        this.scene.remove(obj);
        this.viewByCharacter.delete(userData.character);
        return true;
      }
    });
  }

  private static createRing(radius: number, color: number) {
    const ring = new Line(ringGeometry, getLineMaterial(color));
    ring.scale.x = radius;
    ring.scale.y = radius;
    return ring;
  }
}
