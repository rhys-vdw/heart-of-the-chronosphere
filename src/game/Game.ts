import { remove, times } from "lodash";
import { Vector2 } from "three";
import { Map, mazeToMap } from "../utility/Map";
import { rayCastSegments } from "../utility/rayCast";
import { Maze, MazeOptions, generateMaze } from "../utility/mazeGenerator";

export const enum CommandStatus {
  InProgress,
  Complete
}

export interface Species {
  name: string;
  color: number;
}

export interface CharacterStats {
  moveSpeed: number;
  radius: number;
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
  maze: Maze;
}

export class Game {
  levels: Level[];
  currentLevelIndex: number = -1;
  player: Character;
  tickCount: number = 0;

  constructor(mazeOptions: MazeOptions, player: Character) {
    const maze = generateMaze(mazeOptions);
    this.levels = [
      {
        characters: [],
        maze,
        map: mazeToMap(maze)
      }
    ];
    this.player = player;
    this.enterLevel(0);
    times(10, () =>
      this.levels[0].characters.push({
        position: this.randomPointInMap(),
        species: { name: "Orc", color: 0x33ff33 },
        stats: { moveSpeed: 3, radius: 5 },
        currentCommand: null,
        currentCommandTickCount: 0
      })
    );
  }

  regenerateMaze_TEMP(mazeOptions: MazeOptions) {
    const level = this.levels[this.currentLevelIndex];
    level.maze = generateMaze(mazeOptions);
    level.map = mazeToMap(level.maze);
  }

  getCurrentLevel() {
    return this.levels[this.currentLevelIndex];
  }

  getVisibleCharacters(): ReadonlyArray<Character> {
    return this.levels[this.currentLevelIndex].characters;
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

  setPlayerCommand(command: Command): void {
    this.setCommand(this.player, command);
  }

  setCommand(character: Character, command: Command) {
    if (character.currentCommand !== null) {
      throw new Error("character is not waiting for command");
    }
    character.currentCommand = command;
    character.currentCommandTickCount = 0;
  }

  getMaximumMoveTowardsPoint(character: Character, point: Vector2): Vector2 {
    const from = character.position;
    const offset = point.clone().sub(from);
    const direction = offset.clone().normalize();
    let maxDistance = rayCastSegments(
      from,
      direction,
      this.levels[this.currentLevelIndex].map.walls
    );
    // Subtract radius from max distance to stop exact at the wall.
    maxDistance =
      maxDistance === null ? Infinity : maxDistance - character.stats.radius;
    return maxDistance > offset.length()
      ? point
      : from
          .clone()
          .add(new Vector2(direction.x, direction.y).setLength(maxDistance));
  }

  tick(): CommandStatus {
    if (this.isWaitingForCommand()) {
      console.log("Waiting for command");
      return CommandStatus.Complete;
    }
    const level = this.levels[this.currentLevelIndex];
    let playerCommandStatus = CommandStatus.InProgress;
    for (const character of level.characters) {
      if (character.currentCommand === null) {
        if (character === this.player) {
          playerCommandStatus = CommandStatus.Complete;
        } else {
          const target = this.randomPointInMap();
          const to = this.getMaximumMoveTowardsPoint(character, target);
          this.setCommand(character, new MoveCommand(to));
        }
      }
    }
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
    this.tickCount++;
    return playerCommandStatus;
  }

  private randomPointInMap() {
    return new Vector2(
      0,
      this.getCurrentLevel().maze.radius * Math.random()
    ).rotateAround(new Vector2(0, 0), Math.random() * Math.PI * 2);
  }
}
