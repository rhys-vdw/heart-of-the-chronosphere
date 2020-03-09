import { Command } from "./Command";
import { Vector2 } from "three";
import { AiController, ControllerName } from "./Ai";

// -- Entity --

export interface Entity {
  position: Vector2;
  held?: Entity | null;
  ammunition?: Ammunition;
  lastHitTick: number;
  readonly type: EntityType;
  stats: Stats | null;
  isVisible: boolean;
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
  readonly initialHeld?: EntityType | null;
  readonly controllerName: ControllerName;
  readonly getUseCommand: ((entity: Entity) => Command) | null;
  readonly rangedWeapon?: RangedWeapon;
}

export interface RangedWeapon {
  readonly accuracy: number;
  readonly damageBonus: number;
  readonly damageRoll: [number, number];
  readonly steadyTickCount: number;
  readonly recoverTickCount: number;
  readonly ammoCapacity: number;
  readonly reloadCount: number;
  readonly reloadTickCount: number;
}

export interface Ammunition {
  readonly loaded: number;
}

export enum AppearanceType {
  Ring,
  StairsDown,
  StairsUp,
  Item
}

export interface Stats {
  readonly moveSpeed: number;
  readonly health: number;
  readonly maxHealth: number;
}

export interface CommandState {
  currentCommand: Command | null;
  currentCommandTickCount: number;
}
