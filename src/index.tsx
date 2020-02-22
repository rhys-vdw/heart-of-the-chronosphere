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

html, body {
  font-family: 'Comfortaa', monospace, sans-serif;
  color: magenta;
}
`;

render(<Main />, document.getElementById("root")!);
