if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // tslint:disable-next-line:no-var-requires
  // require("preact/debug");
}

import { render, h } from "preact";
import { Main } from "./components/Main";
import comfortaaRegular from "./fonts/Comfortaa-Regular.woff";
import comfortaaRegular2 from "./fonts/Comfortaa-Regular.woff2";
import comfortaaBold from "./fonts/Comfortaa-Bold.woff";
import comfortaaBold2 from "./fonts/Comfortaa-Bold.woff2";
import comfortaaLight from "./fonts/Comfortaa-Light.woff";
import comfortaaLight2 from "./fonts/Comfortaa-Light.woff2";

document.getElementsByTagName("style")[0]!.innerHTML += `
@font-face {
  font-family: 'Comfortaa';
  src: url('${comfortaaLight2}') format('woff2'),
    url('${comfortaaLight}') format('woff');
  font-weight: 300;
  font-style: normal;
}

@font-face {
  font-family: 'Comfortaa';
  src: url('${comfortaaRegular2}') format('woff2'),
    url('${comfortaaRegular}') format('woff');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Comfortaa';
  src: url('${comfortaaBold2}') format('woff2'),
    url('${comfortaaBold}') format('woff');
  font-weight: bold;
  font-style: normal;
}

html, body, button {
  font-family: 'Comfortaa', monospace, sans-serif;
}
`;

render(<Main />, document.getElementById("root")!);

// import * as THREE from "three";
// // tslint:disable-next-line:no-duplicate-imports
// import { Scene, WebGLRenderer, Vector2, PerspectiveCamera } from "three";

// // const canvas = this.canvasRef.current!;
// const scene = new Scene();

// // const bounds = canvas.getBoundingClientRect();
// const camera = new PerspectiveCamera(
//   75,
//   window.innerWidth / window.innerHeight,
//   0.1,
//   1000
// );
// const renderer = new WebGLRenderer();
// renderer.setSize(window.innerHeight, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
// const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);
// camera.position.z = 5;

// const animate = () => {
//   requestAnimationFrame(animate);
//   renderer.render(scene, camera);
// };
// animate();

// this.redraw();
