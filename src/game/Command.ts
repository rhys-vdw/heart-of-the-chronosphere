import { Character, Game } from "./Game";
import { Vector2 } from "three";

// -- Types --

export const enum CommandStatus {
  InProgress,
  Complete
}

export interface Command {
  nextTick(character: Character, game: Game): CommandStatus;
}

// -- Commands --

export class MoveCommand implements Command {
  private target: Vector2;
  constructor(target: Vector2) {
    this.target = target;
  }
  nextTick(character: Character, game: Game): CommandStatus {
    const speed = character.stats.moveSpeed;
    const distance = speed * 0.5;
    const from = character.position;
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
    character.position.x += offset.x;
    character.position.y += offset.y;
    return status;
  }
}

export class TakeStairsCommand implements Command {
  private tickCount: number = 0;
  private isStairsUp: boolean;
  constructor(isStairsUp: boolean) {
    this.isStairsUp = isStairsUp;
  }
  nextTick(character: Character, game: Game): CommandStatus {
    const speed = character.stats.moveSpeed;
    const totalTicks = Math.min(10 - speed, 1);
    this.tickCount += 1;
    if (this.tickCount >= totalTicks) {
      if (this.isStairsUp) {
        game.ascend();
      } else {
        game.descend();
      }
      return CommandStatus.Complete;
    }
    return CommandStatus.InProgress;
  }
}
