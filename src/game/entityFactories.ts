import { EntityType, Entity, AppearanceType } from "./Entity";
import { Vector2 } from "three";
import { getController } from "./Ai";

function fixTypes<T extends Record<string, EntityType>>(
  struct: T
): { [P in keyof T]: EntityType } {
  return struct;
}

export const entityTypes = fixTypes({
  human: {
    color: 0x5555ff,
    noun: "human",
    appearance: AppearanceType.Ring,
    scale: 5,
    inititalStats: {
      moveSpeed: 5
    },
    controllerName: "none"
  },

  orc: {
    color: 0x33ff33,
    noun: "orc",
    appearance: AppearanceType.Ring,
    scale: 5,
    inititalStats: {
      moveSpeed: 3
    },
    controllerName: "randomMovement"
  },

  stairsUp: {
    color: 0xffffff,
    noun: "stairs up",
    appearance: AppearanceType.StairsUp,
    scale: 4,
    inititalStats: null,
    controllerName: "none"
  },

  stairsDown: {
    color: 0xffffff,
    noun: "stairs down",
    appearance: AppearanceType.StairsDown,
    scale: 4,
    inititalStats: null,
    controllerName: "none"
  }
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
    controller: getController(type.controllerName)
  };
}
