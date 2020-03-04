import { Entity } from "./Entity";
import { Game } from "./Game";
import { Command, MoveCommand, IdleCommand } from "./Command";

export interface AiController {
  readonly nextCommand: (entity: Entity, game: Game) => Command;
}

type AiFactory = () => AiController;

function fixTypes<T extends Record<string, AiFactory>>(
  struct: T
): { [P in keyof T]: AiFactory } {
  return struct;
}

const randomMovement: AiController = {
  nextCommand(entity: Entity, game: Game): Command {
    const target = game.randomPointInMap();
    const to = game.getMaximumMoveTowardsPoint(entity, target);
    return new MoveCommand(to);
  }
};

const idle: AiController = {
  nextCommand(entity: Entity, game: Game): Command {
    return new IdleCommand();
  }
};

const factories = fixTypes({
  randomMovement: () => randomMovement
});

export type ControllerName = keyof typeof factories | "none";

export function getController(name: ControllerName): AiController | null {
  if (name === "none") return null;
  return factories[name]();
}
