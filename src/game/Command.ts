import { Entity } from "./Entity";
import { Game } from "./Game";
import { Vector2 } from "three";
import { entityTypes } from "./entityFactories";

// -- Types --

export const enum CommandStatus {
  InProgress,
  Complete
}

export interface Command {
  nextTick(entity: Entity, game: Game): CommandStatus;
}

// -- Commands --

export class IdleCommand implements Command {
  nextTick(entity: Entity, game: Game): CommandStatus {
    return CommandStatus.InProgress;
  }
}

export class MoveCommand implements Command {
  private target: Vector2;
  constructor(target: Vector2) {
    this.target = target;
  }
  nextTick(entity: Entity, game: Game): CommandStatus {
    if (entity.stats === null) {
      throw new TypeError(
        `${entity.type.noun} cannot move as it has no stats object`
      );
    }
    const speed = entity.stats.moveSpeed;
    const distance = speed * 0.5;
    const from = entity.position;
    const to = this.target;
    const offset = new Vector2(to.x - from.x, to.y - from.y);
    const targetDistance = offset.length();
    let status: CommandStatus;
    if (targetDistance <= distance) {
      offset.setLength(targetDistance);
      status = CommandStatus.Complete;
    } else {
      offset.setLength(distance);
      status = CommandStatus.InProgress;
    }
    entity.position.x += offset.x;
    entity.position.y += offset.y;
    return status;
  }
}

export class TakeStairsCommand implements Command {
  private tickCount: number = 0;
  private isStairsUp: boolean;
  constructor(isStairsUp: boolean) {
    this.isStairsUp = isStairsUp;
  }
  nextTick(entity: Entity, game: Game): CommandStatus {
    if (entity.stats === null) {
      throw new TypeError(
        `${entity.type.noun} cannot take the stairs as it has no stats component`
      );
    }
    const { isStairsUp } = this;
    const speed = entity.stats.moveSpeed;
    const totalTicks = Math.max(30 - speed, 1);
    if (this.tickCount === 0) {
      game.addEvent(`${entity.type.noun} enters the stairs...`);
    }
    this.tickCount += 1;
    if (this.tickCount >= totalTicks) {
      game.addEvent(`${entity.type.noun} exits the stairwell`);
      const nextLevelIndex =
        game.getCurrentLevelIndex() + (isStairsUp ? 1 : -1);
      game.enterLevel(nextLevelIndex);
      const exitEntityType = this.isStairsUp
        ? entityTypes.stairsDown
        : entityTypes.stairsUp;
      entity.position.copy(game.findEntityOfType(exitEntityType).position);
      return CommandStatus.Complete;
    }
    return CommandStatus.InProgress;
  }
}

export class RangedAttackCommand implements Command {
  private target: Vector2;
  private tickCount: number = 0;
  constructor(target: Vector2) {
    this.target = target;
  }
  nextTick(entity: Entity, game: Game): CommandStatus {
    if (entity.held === undefined) {
      throw new TypeError(`${entity.type.noun} cannot hold a weapon`);
    }
    if (entity.held === null) {
      throw new TypeError(`${entity.type.noun} is not holding a weapon`);
    }
    const held = entity.held;
    if (held.type.rangedWeapon === undefined) {
      throw new TypeError(`${held.type.noun} is not ranged`);
    }
    const { steadyTickCount, recoverTickCount } = held.type.rangedWeapon;
    this.tickCount++;
    if (this.tickCount === steadyTickCount) {
      if (held.ammunition!.loaded === 0) {
        game.addEvent(
          `*click* ${entity.type.noun} fails to fire ${held.type.noun}`
        );
        return CommandStatus.Complete;
      }
      held.ammunition!.loaded--;
      game.addEvent(`${entity.type.noun} fires ${held.type.noun}!`);
      const rayCastHit = game.rayCastEntities(
        entity,
        this.target
          .clone()
          .sub(entity.position)
          .normalize()
      );
      if (rayCastHit === null) {
        game.addEvent(`The bullet disappears`);
      } else if (rayCastHit.entity === null) {
        game.addEvent(`The bullet misses`);
      } else {
        game.addEvent(`The bullet hits ${rayCastHit.entity!.type.noun}`);
      }
    }
    return this.tickCount > steadyTickCount + recoverTickCount
      ? CommandStatus.Complete
      : CommandStatus.InProgress;
  }
}
