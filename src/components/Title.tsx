import { h } from "preact";
import logo from "../img/logo.svg";
import { Css } from "./style";
import { Button } from "./Button";

const titleStyles: Css = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%"
};

const logoStyles = {
  width: "80%"
};

interface Props {
  readonly onNewGame: () => void;
}

export const Title = ({ onNewGame }: Props) => (
  <div style={titleStyles}>
    <img style={logoStyles} src={logo} />
    <p>Created by Rhys van der Waerden for 7DRL 2020</p>
    <Button onClick={onNewGame}>New game</Button>
  </div>
);
