import { h } from "preact";
import logo from "../img/logo.svg";
import { StandardProperties as Css } from "csstype";

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

export const Title = () => (
  <div style={titleStyles}>
    <img style={logoStyles} src={logo} />
    <p>Created by Rhys van der Waerden for 7DRL 2020</p>
  </div>
);
