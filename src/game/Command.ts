import { Entity } from "./Entity";
import { Game, GameState } from "./Game";
import { rollDice } from "./dice";
import { Vector2 } from "three";
import { entityTypes } from "./entityFactories";
import { lerp, getNormalRandom } from "../utility/math";

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
  tickCount: number;
  constructor(tickCount: number) {
    this.tickCount = tickCount;
  }
  nextTick(_entity: Entity, _game: Game): CommandStatus {
    return --this.tickCount > 0
      ? CommandStatus.InProgress
      : CommandStatus.Complete;
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
  private tickCount = 0;
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
    const speed = entity.stats.moveSpeed;
    const totalTicks = Math.max(30 - speed, 1);

    const nextLevelIndex =
      game.getCurrentLevelIndex() + (this.isStairsUp ? 1 : -1);
    if (this.tickCount === 0 && nextLevelIndex === -1) {
      if (
        game.currentLevelIndex === 0 &&
        !confirm("Are you sure you want to quit?")
      ) {
        return CommandStatus.Complete;
      }
      game.addEvent(`${entity.type.noun} enters the stairs...`);
    }
    this.tickCount += 1;
    if (this.tickCount >= totalTicks) {
      if (nextLevelIndex === -1) {
        game.quit();
        return CommandStatus.Complete;
      } else if (nextLevelIndex === game.levels.length) {
        game.win();
        return CommandStatus.Complete;
      } else {
        game.addEvent(`${entity.type.noun} exits the stairwell`);
        game.enterLevel(nextLevelIndex);
      }
      const exitEntityType = this.isStairsUp
        ? entityTypes.stairsDown
        : entityTypes.stairsUp;
      entity.position.copy(game.findEntityOfType(exitEntityType).position);
      return CommandStatus.Complete;
    }
    return CommandStatus.InProgress;
  }
}

const accurateSpread = Math.PI * 0.05;
const inaccurateSpread = Math.PI;
const accurateAccuracy = 20;

export class RangedAttackCommand implements Command {
  private targetPosition: Vector2;
  private target: Entity;
  private tickCount: number = 0;
  constructor(target: Entity) {
    this.target = target;
    this.targetPosition = target.position;
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
    const {
      steadyTickCount,
      recoverTickCount,
      damageBonus,
      damageRoll,
      accuracy
    } = held.type.rangedWeapon;
    this.tickCount++;
    if (this.tickCount === steadyTickCount) {
      if (held.ammunition!.loaded === 0) {
        game.addEvent(
          `*click* ${entity.type.noun}'s ${held.type.noun} is out of ammo`
        );
        return CommandStatus.Complete;
      }
      held.ammunition! = {
        ...held.ammunition!,
        loaded: held.ammunition!.loaded - 1
      };
      game.addEvent(`${entity.type.noun} fires ${held.type.noun}!`);
      const maxSpread = lerp(
        inaccurateSpread,
        accurateSpread,
        accuracy / accurateAccuracy
      );
      const r = getNormalRandom() - 0.5;
      const spread = r * maxSpread;
      const direction = this.targetPosition
        .clone()
        .sub(entity.position)
        .normalize()
        .rotateAround(new Vector2(0, 0), spread);
      const rayCastHit = game.rayCastEntities(entity, direction);
      if (rayCastHit === null) {
        game.addEvent(`The bullet disappears`);
      } else {
        const hitPoint = entity.position
          .clone()
          .add(direction.clone().multiplyScalar(rayCastHit?.distance));
        const trace = {
          from: entity.position,
          to: hitPoint,
          isHit: rayCastHit.entity !== null
        };
        if (rayCastHit.entity === null) {
          game.addEvent({ message: `The bullet misses`, traces: [trace] });
        } else {
          const isCritical =
            rayCastHit.entity === this.target && rollDice(2, 6) === 12;
          const damage = rollDice(...damageRoll) + damageBonus;
          const adjustedDamage = damage * (isCritical ? 2 : 1);
          rayCastHit.entity.stats = {
            ...rayCastHit.entity.stats!,
            health: rayCastHit.entity.stats!.health - adjustedDamage
          };
          rayCastHit.entity.lastHitTick = game.tickCount;
          const { noun } = rayCastHit.entity!.type;

          game.addEvent({
            message: isCritical
              ? `The bullet rips through the ${noun} for ${adjustedDamage} damage`
              : `The bullet deals ${adjustedDamage} to the ${noun}`,
            traces: [trace]
          });
          if (rayCastHit.entity.stats!.health <= 0) {
            game.killEntity(rayCastHit.entity);
          }
        }
      }
    }
    return this.tickCount > steadyTickCount + recoverTickCount
      ? CommandStatus.Complete
      : CommandStatus.InProgress;
  }
}

export class Reload implements Command {
  private tickCount = 0;
  nextTick(entity: Entity, game: Game): CommandStatus {
    if (entity.held === undefined) {
      throw new TypeError(`${entity.type.noun} cannot hold a weapon`);
    }
    if (entity.held === null) {
      throw new TypeError(`${entity.type.noun} is not holding a weapon`);
    }
    const held = entity.held;
    const rangedWeapon = held.type.rangedWeapon;
    if (rangedWeapon === undefined) {
      throw new TypeError(`${held.type.noun} is not ranged`);
    }
    this.tickCount++;
    if (held.ammunition!.loaded === rangedWeapon.ammoCapacity) {
      game.addEvent({
        message: `${entity.type.noun}'s ${held.type.noun} is already full`,
        traces: []
      });
      return CommandStatus.Complete;
    }
    if (this.tickCount > rangedWeapon.reloadTickCount) {
      const amount = Math.min(
        rangedWeapon.reloadCount,
        rangedWeapon.ammoCapacity - held.ammunition!.loaded
      );
      held.ammunition = {
        ...held.ammunition,
        loaded: held.ammunition!.loaded + amount
      };
      game.addEvent({
        message: `${entity.type.noun} loaded ${amount} ammo into ${
          held.type.noun
        } (${held.ammunition!.loaded}/${rangedWeapon.ammoCapacity})`,
        traces: []
      });
      return CommandStatus.Complete;
    }
    return CommandStatus.InProgress;
  }
}
