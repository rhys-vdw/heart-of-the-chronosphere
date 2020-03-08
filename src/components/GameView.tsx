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
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  Material,
  LineDashedMaterial,
  Color
} from "three";
import { AppearanceType, Entity } from "../game/Entity";
import { Game, GameEvent, GameState } from "../game/Game";
import { generateSphereOptions, SphereOptions } from "../utility/mazeGenerator";
import { getMousePosition } from "../utility/mouse";
import { vec3to2, moveTowardsInPlace } from "../utility/threeJsUtility";
import { loadMap } from "../vendor/2d-visibility/src/loadMap";
import { Segment } from "../vendor/2d-visibility/src/types";
import { calculateVisibility } from "../vendor/2d-visibility/src/visibility";
import { GameLayout } from "./GameLayout";
import { EventLog } from "./EventLog";
import * as styles from "./GameView.css";
import { Reload } from "../game/Command";

const enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2
}

const enum KeyCode {
  Space = 32
}

// -- Heights --

const enum Height {
  Vision,
  Wall,
  Prop,
  Character,
  BulletTrace
}

// -- layers --

const enum Layer {
  Vision,
  Detector,
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
const detectorMaterial = new MeshBasicMaterial({
  color: 0xff00ff,
  opacity: 0.1,
  transparent: true,
  visible: false
});

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
  0.5,
  0.5,
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
const squarePoints = [
  new Vector3(-0.5, 0.5, 0),
  new Vector3(0.5, 0.5, 0),
  new Vector3(0.5, -0.5, 0),
  new Vector3(-0.5, -0.5, 0),
  new Vector3(-0.5, 0.5, 0)
];
const squareLineGeometry = new BufferGeometry().setFromPoints(squarePoints);
// TODO: Could use `PlaneGeometry` for this
const squareGeometry = new BufferGeometry().setFromPoints(squarePoints);
squareGeometry.setIndex(
  new BufferAttribute(new Uint32Array([0, 3, 2, 0, 2, 1]), 1)
);

// -- User data --

interface ViewUserData {
  entity: Entity;
}

function setUserData(object: Object3D, userData: ViewUserData) {
  object.userData = userData;
}

function getUserData(object: Object3D): ViewUserData | null {
  const key: keyof ViewUserData = "entity";
  return object.userData.hasOwnProperty(key)
    ? (object.userData as ViewUserData)
    : null;
}

function expectUserData(object: Object3D): ViewUserData {
  const userData = getUserData(object);
  if (userData === null) {
    console.error(object);
    throw new Error("Expected user data");
  }
  return userData;
}

// -- Factories --

function createStairs(isStairsUp: boolean) {
  const stairs = new Object3D();
  const material = getLineMaterial(0xffffff);

  const square = new Line(squareLineGeometry, material);
  stairs.attach(square);

  const arrow = new Line(stairsGeometry, material);
  arrow.scale.set(0.8, 0.8, 1);
  if (isStairsUp) {
    arrow.translateY(-0.1);
    arrow.rotateZ((Math.PI * 7) / 6);
  } else {
    arrow.translateY(0.1);
    arrow.rotateZ(Math.PI / 6);
  }
  stairs.attach(arrow);

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
  readonly tickDuration: number;
  readonly onVictory: () => void;
  readonly onGameOver: () => void;
}

interface State {
  readonly events: readonly GameEvent[];
}

export class GameView extends Component<Props, State> {
  private canvasRef = createRef<HTMLCanvasElement>();
  private renderer!: WebGLRenderer;
  private scene!: Scene;
  private camera!: Camera;
  private viewMesh!: Mesh;
  private indicatorLine!: Line;
  private wallLineSegments!: LineSegments;
  private lastTickTime: number = 0;
  private game: Game;
  private entityViews: Object3D[] = [];
  private viewByEntity: WeakMap<Entity, Object3D> = new WeakMap();
  private raycaster!: Raycaster;
  private visibleLevelIndex = -1;
  private navPathGeometry!: BufferGeometry;
  private bulletTraces: Line[] = [];

  state: State = {
    events: []
  };

  constructor(props: Props) {
    super(props);
    const mazeOptions = generateSphereOptions(props.sphereOptions);
    this.game = new Game(mazeOptions);
    this.addEvent(...this.game.startGame());
    this.raycaster = new Raycaster();
    this.raycaster.layers.set(Layer.Detector);
  }

  // -- Lifecycle --

  componentDidUpdate(prevProps: Props) {
    if (prevProps.sphereOptions !== this.props.sphereOptions) {
      this.game = new Game(generateSphereOptions(this.props.sphereOptions));
      this.addEvent(...this.game.startGame());
      this.updateWallLines();
      this.updateVisibilityPolygon();
    }
  }

  componentDidMount() {
    // Create scene.

    this.scene = new Scene();

    // Create view of map walls.

    this.wallLineSegments = new LineSegments(
      new BufferGeometry(),
      wallMaterial
    );
    this.wallLineSegments.position.set(0, 0, Height.Wall);
    this.wallLineSegments.layers.set(Layer.Environment);
    this.scene.add(this.wallLineSegments);

    // -- TEST visualize nav mesh --

    this.navPathGeometry = new BufferGeometry();
    const navLines = new LineSegments(
      this.navPathGeometry,
      new LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        visible: false
      })
    );
    navLines.frustumCulled = false;
    this.scene.add(navLines);

    // -- TEST pathfinding --

    // const { navMesh } = this.game.getCurrentLevel().maze;
    // const path = navMesh.findPath({ r: 0, t: 0 }, { r: 12, t: 20 });
    // console.log("path", path);
    // const pathG = new BufferGeometry();
    // if (path !== null) {
    //   pathG.setFromPoints(path.map(n => n.position));
    // }
    // const line = new Line(
    //   pathG,
    //   new LineBasicMaterial({
    //     color: 0xff0000
    //   })
    // );
    // line.position.setZ(10);
    // this.scene.add(line);

    // Create movement indicator line.

    const movementLineGeometry = new BufferGeometry();
    movementLineGeometry.setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, 0)
    ]);
    this.indicatorLine = new Line(
      movementLineGeometry,
      new LineDashedMaterial({
        color: this.game.player.type.color,
        dashSize: 3,
        gapSize: 1,
        transparent: true,
        opacity: 1
      })
    );
    this.indicatorLine.layers.set(Layer.Ui);
    this.indicatorLine.frustumCulled = false;
    this.indicatorLine.position.z = 100;
    this.scene.add(this.indicatorLine);

    // Create view polygon.

    this.viewMesh = new Mesh(new Geometry(), viewMaterial);
    this.viewMesh.layers.set(Layer.Vision);
    this.viewMesh.position.set(0, 0, Height.Vision);
    this.viewMesh.frustumCulled = false;
    this.scene.add(this.viewMesh);

    // Create camera.

    this.camera = new OrthographicCamera(-100, 100, 100, -100, 1, 1000);
    this.camera.translateZ(200);
    this.camera.layers.enable(Layer.Environment);
    this.camera.layers.enable(Layer.Vision);
    this.camera.layers.enable(Layer.Ui);
    this.camera.layers.enable(Layer.Detector);

    // Initialize renderer.

    const canvas = this.canvasRef.current!;
    this.renderer = new WebGLRenderer({ canvas });
    this.updateRendererSize();
    window.addEventListener("resize", this.updateRendererSize);

    // Add key handler.

    window.addEventListener("keydown", this.handleKeyDown);

    // Start rendering.

    this.lastTickTime = Date.now();
    const animate = () => {
      if (!this.game.isWaitingForCommand()) {
        const { tickDuration } = this.props;
        const time = Date.now();
        const delta = time - this.lastTickTime;
        const tickDelta = Math.floor(delta / tickDuration);
        for (let i = 0; i < tickDelta; i++) {
          const events = this.game.tick();
          this.addEvent(...events);
          this.lastTickTime += tickDuration;
          this.updateBulletTraces();
          if (this.game.isWaitingForCommand()) {
            break;
          }
        }
      } else {
        // Hack to pause game while running.
        this.lastTickTime = Date.now();
      }
      if (this.visibleLevelIndex !== this.game.getCurrentLevelIndex()) {
        this.updateWallLines();
        this.updateNavMesh();
      }
      this.updateEntities();
      this.updateVisibilityPolygon();
      this.updateCursor(getMousePosition());
      this.camera.position.set(
        this.game.player.position.x,
        this.game.player.position.y,
        this.camera.position.z
      );
      this.renderer.render(this.scene, this.camera);

      if (this.game.isGameOver()) {
        setTimeout(this.props.onGameOver, 4_000);
      } else if (this.game.isVictorious()) {
        setTimeout(this.props.onVictory, 4_000);
      } else {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateRendererSize);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  render() {
    const canvasProps = { ref: this.canvasRef, resize: true } as any;
    return (
      <GameLayout
        viewChild={
          <canvas
            className={styles.canvas}
            onMouseDown={this.handleMouseDown}
            onWheel={this.handleWheel}
            onContextMenu={this.handleContextMenu}
            {...canvasProps}
          />
        }
        logChild={<EventLog events={this.state.events} />}
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

  private setIndicatorLine(to: Vector2, color: number, opacity: number = 1) {
    const { player } = this.game;

    // Move starting point to edge of player circle.
    const from = player.position.clone();
    const radius = player.type.scale / 2;
    moveTowardsInPlace(from, to, radius);

    // Update line.
    const geo = this.indicatorLine.geometry as BufferGeometry;
    const positionBuffer = geo.attributes.position as BufferAttribute;
    positionBuffer.setXYZ(0, from.x, from.y, 0);
    positionBuffer.setXYZ(1, to.x, to.y, 0);
    positionBuffer.needsUpdate = true;

    // Update color.
    const mat = this.indicatorLine.material as LineDashedMaterial;
    mat.color = new Color(color);
    mat.opacity = opacity;

    // Recalculate line to updated dashes.
    this.indicatorLine.computeLineDistances();

    // Reveal line.
    this.indicatorLine.visible = true;
  }

  private hideIndicatorLine() {
    this.indicatorLine.visible = false;
  }

  private updateCursor = (position: { x: number; y: number }) => {
    if (this.game.isWaitingForCommand()) {
      const { player } = this.game;
      const object = this.raycastInteractive(position);
      if (object === null) {
        const target = this.raycastWorldPosition(position);
        const to = this.game.getMaximumMoveTowardsPoint(
          player,
          vec3to2(target)
        );
        const radius = player.type.scale / 2;
        const offset = to.clone().sub(player.position);
        if (offset.length() > radius) {
          this.setIndicatorLine(to, player.type.color);
        } else {
          this.hideIndicatorLine();
        }
      } else {
        const targetEntity = getUserData(object)?.entity;
        if (targetEntity != null && this.game.canFireAt(player, targetEntity)) {
          this.setIndicatorLine(
            targetEntity.position,
            0xffff00,
            player.held!.ammunition!.loaded === 0 ? 0.2 : 1
          );
        } else {
          this.hideIndicatorLine();
        }
      }
    } else {
      this.hideIndicatorLine();
    }
  };

  private updateBulletTraces() {
    const traceFadeSpeed = 0.05;
    remove(this.bulletTraces, trace => {
      const material = trace.material as Material;
      material.opacity -= traceFadeSpeed;
      if (material.opacity <= 0) {
        material.dispose();
        trace.geometry.dispose();
        this.scene.remove(trace);
        return true;
      }
      return false;
    });
  }

  private handleMouseDown = (event: MouseEvent) => {
    if (!this.game.isWaitingForCommand()) return;

    switch (event.button) {
      case MouseButton.Left:
        const object = this.raycastInteractive(event);
        if (object !== null) {
          const userData = expectUserData(object);
          const { entity } = userData;
          if (entity === this.game.player) {
            // Do nothing.
          } else if (this.game.isUsable(entity)) {
            if (this.game.isInReachOfPlayer(entity)) {
              this.game.use(entity);
            } else {
              this.addEvent({
                message: `${entity.type.noun} is out of range`,
                traces: []
              });
            }
          } else if (this.game.canFireAt(this.game.player, entity)) {
            this.game.fireAt(this.game.player, entity);
          }
        } else {
          const target = this.raycastWorldPosition(event);
          const to = this.game.getMaximumMoveTowardsPoint(
            this.game.player,
            vec3to2(target)
          );
          this.game.moveTo(to);
        }
        break;
      case MouseButton.Right:
        this.game.setPlayerCommand(new Reload());
        break;
    }
    return false;
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === KeyCode.Space) {
      if (this.game.isWaitingForCommand()) {
        this.game.rest(10);
      }
    }
  };

  private addEvent(...newEvents: GameEvent[]) {
    if (newEvents.length > 0) {
      this.setState(({ events }) => ({ events: events.concat(newEvents) }));
      newEvents.forEach(event => {
        event.traces.forEach(t => {
          const geo = new BufferGeometry();
          geo.setFromPoints([t.from, t.to]);
          const mat = getLineMaterial(t.isHit ? 0xff0000 : 0xcccccc);
          mat.transparent = true;
          mat.opacity = 1;
          const trace = new Line(geo, mat);
          trace.position.setZ(Height.BulletTrace);
          this.scene.add(trace);
          this.bulletTraces.push(trace);
        });
      });
    }
  }

  private zoom = 4;
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

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
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

    this.visibleLevelIndex = this.game.getCurrentLevelIndex();
    this.wallLineSegments.geometry.dispose();
    this.wallLineSegments.geometry = new Geometry().setFromPoints(
      createWallPoints(this.game.getCurrentLevel().map.walls)
    );
  }

  private updateNavMesh() {
    const { maze } = this.game.getCurrentLevel();
    const { navMesh } = maze;
    console.log("updated nav path");
    this.navPathGeometry.setFromPoints(
      navMesh.byCoordinate.flatMap(nodes =>
        nodes.flatMap(node =>
          node.connections.flatMap(n => [node.position, n.position])
        )
      )
    );
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

  private updateEntities() {
    const isVisible = new Set<Object3D>();
    this.game.getVisibleEntities().forEach(entity => {
      let obj = this.viewByEntity.get(entity) ?? null;
      if (obj === null) {
        let height: number;
        switch (entity.type.appearance) {
          case AppearanceType.Ring:
            obj = GameView.createRing(entity.type.color);
            height = Height.Character;
            break;
          case AppearanceType.StairsDown:
            obj = createStairs(false);
            height = Height.Prop;
            break;
          case AppearanceType.StairsUp:
            obj = createStairs(true);
            height = Height.Prop;
            break;
          default:
            console.error(
              `Unhandled appearance type: ${entity.type.appearance}`
            );
            return;
        }

        const detector = new Mesh(squareGeometry, detectorMaterial);
        detector.layers.set(Layer.Detector);
        obj.attach(detector);

        const userData = { entity };
        setUserData(detector, userData);
        setUserData(obj, userData);

        obj.position.setZ(height);
        obj.scale.set(entity.type.scale, entity.type.scale, 1);
        this.scene.add(obj);
        this.viewByEntity.set(entity, obj);
        this.entityViews.push(obj);
      }
      obj.position.setX(entity.position.x);
      obj.position.setY(entity.position.y);
      isVisible.add(obj);
    });
    remove(this.entityViews, (obj, i) => {
      if (isVisible.has(obj)) {
        return false;
      } else {
        const userData = expectUserData(obj);
        if (userData.entity === null) {
          throw new Error(`userData.entity === null`);
        }
        this.scene.remove(obj);
        this.viewByEntity.delete(userData.entity);
        return true;
      }
    });
  }

  private static createRing(color: number) {
    return new Line(ringGeometry, getLineMaterial(color));
  }
}
