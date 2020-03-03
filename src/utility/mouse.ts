const position = { x: 0, y: 0 };

document.addEventListener("mousemove", onMouseUpdate, false);
document.addEventListener("mouseenter", onMouseUpdate, false);

function onMouseUpdate(event: MouseEvent) {
  position.x = event.pageX;
  position.y = event.pageY;
}

export const getMousePosition = () => position;
