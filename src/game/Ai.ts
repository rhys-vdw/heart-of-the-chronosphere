import { Entity } from "./Entity";
import { Game } from "./Game";
import {
  Command,
  MoveCommand,
  IdleCommand,
  RangedAttackCommand,
  Reload
} from "./Command";
import { Vector2 } from "three";
import { moveTowardsInPlace } from "../utility/threeJsUtility";

export interface AiController {
  readonly nextCommand: (entity: Entity, game: Game) => Command;
}

type AiFactory = () => AiController;

function fixTypes<T extends Record<string, AiFactory>>(
  struct: T
): { [P in keyof T]: AiFactory } {
  return struct;
}

export class EnemyAi implements AiController {
  private lastSeenPlayerTick = -Infinity;
  private lastSeenPosition = new Vector2();

  nextCommand(entity: Entity, game: Game): Command {
    console.log("tick " + game.tickCount);
    const shootDistance = 100;
    const forgetTickCount = 50;

    const { player } = game;
    const playerDirection = player.position
      .clone()
      .sub(entity.position)
      .normalize();

    const result = game.rayCastEntities(entity, playerDirection, [player]);
    if (result !== null && result.entity !== null) {
      console.log("saw player");
      this.lastSeenPlayerTick = game.tickCount;
      this.lastSeenPosition.copy(player.position);
    } else {
      console.log("cannot see player");
    }
    if (
      this.lastSeenPlayerTick === game.tickCount &&
      entity.position.distanceTo(this.lastSeenPosition) <= shootDistance
    ) {
      if (entity.held!.ammunition!.loaded === 0 && Math.random() > 0.2) {
        console.log("reload before shoot");
        return new Reload();
      }
      return new RangedAttackCommand(player);
    }
    if (game.tickCount - this.lastSeenPlayerTick < forgetTickCount) {
      // Move current position towards enemy.
      return new MoveCommand(this.lastSeenPosition);
    }

    if (
      entity.held!.ammunition!.loaded <
      entity.held!.type.rangedWeapon!.ammoCapacity
    ) {
      return new Reload();
    }

    const waitTickCount = 10;
    return new IdleCommand(waitTickCount);
  }
}

const randomMovement: AiController = {
  nextCommand(entity: Entity, game: Game): Command {
    const target = game.randomPointInMap();
    const to = game.getMaximumMoveTowardsPoint(entity, target);
    return new MoveCommand(to);
  }
};

const factories = fixTypes({
  randomMovement: () => randomMovement,
  enemyAi: () => new EnemyAi()
});

export type ControllerName = keyof typeof factories | "none";

export function getController(name: ControllerName): AiController | null {
  if (name === "none") return null;
  return factories[name]();
}
