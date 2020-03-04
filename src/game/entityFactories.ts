import { EntityType, Entity, AppearanceType } from "./Entity";
import { Vector2 } from "three";

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
    }
  },

  orc: {
    color: 0x33ff33,
    noun: "orc",
    appearance: AppearanceType.Ring,
    scale: 5,
    inititalStats: {
      moveSpeed: 3
    }
  },

  stairsUp: {
    color: 0xffffff,
    noun: "stairs down",
    appearance: AppearanceType.StairsDown,
    scale: 4,
    inititalStats: null
  },

  stairsDown: {
    color: 0xffffff,
    noun: "stairs down",
    appearance: AppearanceType.StairsDown,
    scale: 4,
    inititalStats: null
  }
});

export type EntityTypeName = keyof typeof entityTypes;

export function createEntity(
  typeName: EntityTypeName,
  position = new Vector2()
): Entity {
  const type = entityTypes[typeName];
  return {
    position,
    type,
    stats: type.inititalStats === null ? null : { ...type.inititalStats },
    commandState: {
      currentCommand: null,
      currentCommandTickCount: 0
    }
  };
}
