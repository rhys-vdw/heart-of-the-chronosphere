import { Command } from "./Command";
import { Vector2 } from "three";
import { AiController, ControllerName } from "./Ai";

// -- Entity --

export interface Entity {
  position: Vector2;
  readonly type: EntityType;
  readonly stats: Stats | null;
  readonly commandState: CommandState;
  readonly controller: AiController | null;
}

// -- Components --

export interface EntityType {
  readonly noun: string;
  readonly appearance: AppearanceType;
  readonly color: number;
  readonly scale: number;
  readonly inititalStats: Readonly<Stats> | null;
  readonly controllerName: ControllerName;
}

export enum AppearanceType {
  Ring,
  StairsDown,
  StairsUp
}

export interface Stats {
  moveSpeed: number;
}

export interface CommandState {
  currentCommand: Command | null;
  currentCommandTickCount: number;
}
