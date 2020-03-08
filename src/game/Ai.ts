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
import { getRandomInt } from "./dice";

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
  private lastSeenPosition = new Vector2();
  private isChasing = false;

  nextCommand(entity: Entity, game: Game): Command {
    const shootDistance = 100;
    const { player } = game;
    const playerDirection = player.position
      .clone()
      .sub(entity.position)
      .normalize();

    // Check if player is visible.
    const result = game.rayCastEntities(entity, playerDirection, [player]);
    if (result !== null && result.entity !== null) {
      // Store that we are chasing player.
      this.isChasing = true;

      // Can see player, so store its position.
      this.lastSeenPosition.copy(player.position);

      // Check if we're in shooting range.
      if (entity.position.distanceTo(this.lastSeenPosition) <= shootDistance) {
        const isEmpty = entity.held!.ammunition!.loaded === 0;
        // Reload unless we forgot.
        if (isEmpty && Math.random() > 0.2) {
          return new Reload();
        }

        // Otherwise attack.
        return new RangedAttackCommand(player);
      }
    }

    if (this.isChasing) {
      // Move current position towards last seen player position.
      const targetDistance = entity.position.distanceTo(this.lastSeenPosition);
      if (targetDistance < 0.1) {
        this.isChasing = false;
      } else {
        const maxMove = 10;
        const target = entity.position.clone();
        moveTowardsInPlace(
          target,
          this.lastSeenPosition,
          Math.min(maxMove, targetDistance)
        );
        return new MoveCommand(this.lastSeenPosition);
      }
    }

    // We're done chasing the player, time to reload.
    if (
      entity.held!.ammunition!.loaded <
      entity.held!.type.rangedWeapon!.ammoCapacity
    ) {
      return new Reload();
    }

    // Just do nothing repeatedly.
    return new IdleCommand(5);
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
