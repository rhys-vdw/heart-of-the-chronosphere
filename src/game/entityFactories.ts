import { EntityType, Entity, AppearanceType } from "./Entity";
import { Vector2 } from "three";
import { getController } from "./Ai";
import { TakeStairsCommand } from "./Command";

function fixTypes<T extends Record<string, EntityType>>(
  struct: T
): { [P in keyof T]: EntityType } {
  return struct;
}

const sixShooter: EntityType = {
  color: 0xff0000,
  noun: "six shooter",
  appearance: AppearanceType.Item,
  scale: 5,
  inititalStats: null,
  controllerName: "none",
  getUseCommand: null,
  rangedWeapon: {
    accuracy: 7,
    damage: 7,
    steadyTickCount: 3,
    recoverTickCount: 3,
    ammoCapacity: 6,
    reloadCount: 1,
    reloadTickCount: 20
  }
};

export const entityTypes = fixTypes({
  player: {
    color: 0x5555ff,
    noun: "player",
    appearance: AppearanceType.Ring,
    scale: 10,
    inititalStats: {
      moveSpeed: 5,
      health: 20,
      maxHealth: 20
    },
    initialHeld: sixShooter,
    controllerName: "none",
    getUseCommand: null
  },

  orc: {
    color: 0x33ff33,
    noun: "orc",
    appearance: AppearanceType.Ring,
    scale: 10,
    inititalStats: {
      moveSpeed: 3,
      health: 10,
      maxHealth: 10
    },
    controllerName: "randomMovement",
    getUseCommand: null
  },

  stairsUp: {
    color: 0xffffff,
    noun: "stairs up",
    appearance: AppearanceType.StairsUp,
    scale: 9,
    inititalStats: null,
    controllerName: "none",
    getUseCommand: () => new TakeStairsCommand(true)
  },

  stairsDown: {
    color: 0xffffff,
    noun: "stairs down",
    appearance: AppearanceType.StairsDown,
    scale: 9,
    inititalStats: null,
    controllerName: "none",
    getUseCommand: () => new TakeStairsCommand(false)
  },

  sixShooter
});

export type EntityTypeName = keyof typeof entityTypes;

export function createEntity(
  typeOrTypeName: EntityTypeName | EntityType,
  position = new Vector2()
): Entity {
  const type =
    typeof typeOrTypeName === "string"
      ? entityTypes[typeOrTypeName]
      : typeOrTypeName;

  return {
    position,
    type,
    stats: type.inititalStats === null ? null : { ...type.inititalStats },
    commandState: {
      currentCommand: null,
      currentCommandTickCount: 0
    },
    held: type.initialHeld && createEntity(type.initialHeld),
    controller: getController(type.controllerName),
    ammunition: type.rangedWeapon && { loaded: type.rangedWeapon.ammoCapacity }
  };
}
