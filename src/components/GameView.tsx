import { h, createRef, Component } from "preact";
import * as styles from "./GameView.css";
import { generateMaze, MazeOptions } from "../utility/mazeGenerator";
import * as THREE from "three";
// tslint:disable-next-line:no-duplicate-imports
import { Scene, WebGLRenderer, Vector2, PerspectiveCamera } from "three";
import * as p2 from "p2";

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

    const addStaticBox = (
      x: number,
      y: number,
      angle: number,
      width: number,
      height: number
    ) => {
      const shape = new p2.Box({
        collisionGroup: Layers.Environment,
        width,
        height
      });
      const body = new p2.Body({
        position: [x, y],
        angle
      });
      body.addShape(shape);
      this.world.addBody(body);
    };

    for (let i = 0; i < 10; i++) {
      addStaticBox(
        Math.random() * 40 - 20,
        Math.random() * 40 - 20,
        Math.random() * 360,
        Math.random() * 8 + 2,
        Math.random() * 8 + 2
      );
    }

    // -- Initialize renderer --

    const canvas = this.canvasRef.current!;
    this.scene = new Scene();

    this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    this.camera.position.z = 20;
    window.addEventListener("wheel", this.handleWheel);

    this.renderer = new WebGLRenderer({ canvas });

    this.updateRendererSize();
    window.addEventListener("resize", this.updateRendererSize);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);

    for (const body of this.world.bodies) {
      const shape = body.shapes[0]!;
      if (shape instanceof p2.Box) {
        const g = new THREE.BoxGeometry(shape.width, shape.height, 0.01);
        const box = new THREE.Mesh(g, material);
        box.translateX(body.position[0]);
        box.translateY(body.position[1]);
        box.rotateZ(body.angle);
        console.log(`pos=${shape.position}, angle=${shape.angle}`);
        this.scene.add(box);
      } else {
        console.error(`Unhandled shape type ${typeof shape}`);
      }
    }

    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      this.renderer.render(this.scene, this.camera);
    };
    animate();

    // this.redraw();
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

    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "magenta";
    ctx.stroke();
    ctx.strokeStyle = "white";

    const ringDepth = radius * (1 / rooms.length);
    rooms.forEach((rs, i) => {
      // Draw ring.
      const innerRadius = i * ringDepth;
      const outerRadius = (i + 1) * ringDepth;

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
            innerRadius,
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
    const canvasProps = { ref: this.canvasRef, resize: true } as any;
    return <canvas className={styles.canvas} {...canvasProps} />;
  }
}
