import { Map } from "../utility/Map";
import { remove } from "lodash";
import * as THREE from "three";

export const enum CommandStatus {
  InProgress,
  Complete
}

export interface Species {
  name: string;
}

export interface CharacterStats {
  moveSpeed: number;
  radius: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Command {
  nextTick(character: Character, game: Game): CommandStatus;
}

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
    const offset = new THREE.Vector2(to.x - from.x, to.y - from.y);
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

export interface Character {
  position: Vector2;
  species: Species;
  stats: CharacterStats;
  currentCommand: Command | null;
  currentCommandTickCount: number;
}

export interface Level {
  characters: Character[];
  map: Map;
}

export class Game {
  levels: Level[];
  currentLevelIndex: number = -1;
  player: Character;
  tickCount: number = 0;

  constructor(map: Map, player: Character) {
    this.levels = [
      {
        characters: [],
        map
      }
    ];
    this.player = player;
    this.enterLevel(0);
  }

  enterLevel(levelIndex: number) {
    if (this.currentLevelIndex !== -1) {
      remove(this.levels[this.currentLevelIndex].characters, this.player);
    }
    this.currentLevelIndex = levelIndex;
    this.levels[this.currentLevelIndex].characters.push(this.player);
  }

  isWaitingForCommand(): boolean {
    return this.player.currentCommand === null;
  }

  setCommand(command: Command): void {
    if (!this.isWaitingForCommand()) {
      throw new Error("Player is not waiting for command");
    }
    this.player.currentCommand = command;
    this.player.currentCommandTickCount = 0;
  }

  tick(): CommandStatus {
    if (this.isWaitingForCommand()) {
      throw new Error("Waiting for command");
    }
    const level = this.levels[this.currentLevelIndex];
    for (const character of level.characters) {
      if (character.currentCommand === null) {
        throw new Error("Character has no command!");
      }
      if (
        character.currentCommand.nextTick(character, this) ===
        CommandStatus.Complete
      ) {
        character.currentCommand = null;
      }
    }
    let playerCommandStatus = CommandStatus.InProgress;
    for (const character of level.characters) {
      if (character.currentCommand === null) {
        if (character === this.player) {
          playerCommandStatus = CommandStatus.Complete;
        } else {
          // tslint:disable-next-line:no-console
          console.warn("NYI: AI");
        }
      }
    }
    this.tickCount++;
    return playerCommandStatus;
  }
}
