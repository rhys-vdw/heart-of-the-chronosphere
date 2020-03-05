import { remove, times } from "lodash";
import { Vector2 } from "three";
import { Map, mazeToMap } from "../utility/Map";
import { rayCastSegments } from "../utility/rayCast";
import { Maze, MazeOptions, generateMaze } from "../utility/mazeGenerator";
import { MoveCommand, Command, CommandStatus } from "./Command";
import { Entity } from "./Entity";
import { createEntity } from "./entityFactories";

export interface Level {
  entities: Entity[];
  map: Map;
  maze: Maze;
}

export class Game {
  levels: Level[];
  currentLevelIndex: number = -1;
  player: Entity;
  tickCount: number = 0;

  constructor(mazeOptions: readonly MazeOptions[]) {
    this.levels = mazeOptions.map(o => {
      const maze = generateMaze(o);
      return {
        entities: maze.spawns.map(spawn =>
          createEntity(spawn.type, spawn.position)
        ),
        maze,
        map: mazeToMap(maze)
      };
    });
    this.player = createEntity("human");
    this.enterLevel(0);
    times(10, () => this.levels[0].entities.push(createEntity("orc")));
  }

  regenerateMaze_TEMP(mazeOptions: readonly MazeOptions[]) {
    this.levels = mazeOptions.map(o => {
      const maze = generateMaze(o);
      return {
        entities: [],
        maze,
        map: mazeToMap(maze)
      };
    });
  }

  getCurrentLevelIndex() {
    return this.currentLevelIndex;
  }

  getCurrentLevel() {
    return this.levels[this.currentLevelIndex];
  }

  getVisibleEntities(): ReadonlyArray<Entity> {
    return this.getCurrentLevel().entities;
  }

  ascend() {
    this.enterLevel(this.currentLevelIndex + 1);
  }

  descend() {
    if (this.currentLevelIndex === 0) {
      console.error("NYI: Exit game early");
      return;
    }
    this.enterLevel(this.currentLevelIndex - 1);
  }

  enterLevel(levelIndex: number) {
    if (this.currentLevelIndex !== -1) {
      remove(this.getCurrentLevel().entities, this.player);
    }
    this.currentLevelIndex = levelIndex;
    this.getCurrentLevel().entities.push(this.player);
  }

  isWaitingForCommand(): boolean {
    if (this.player.commandState === null) {
      throw new TypeError("Player must have a command state");
    }
    return this.player.commandState.currentCommand === null;
  }

  setPlayerCommand(command: Command): void {
    this.setCommand(this.player, command);
  }

  setCommand(entity: Entity, command: Command) {
    const { commandState } = entity;
    if (commandState === null) {
      throw new Error(`${entity.type.noun} cannot accept commands`);
    }
    if (commandState.currentCommand !== null) {
      throw new Error(`${entity.type.noun} is already performing a command`);
    }
    commandState.currentCommand = command;
    commandState.currentCommandTickCount = 0;
  }

  getMaximumMoveTowardsPoint(entity: Entity, point: Vector2): Vector2 {
    const from = entity.position;
    const offset = point.clone().sub(from);
    const direction = offset.clone().normalize();
    let maxDistance = rayCastSegments(
      from,
      direction,
      this.levels[this.currentLevelIndex].map.walls
    );
    // Subtract radius from max distance to stop exact at the wall.
    maxDistance =
      maxDistance === null ? Infinity : maxDistance - entity.type.scale;
    return maxDistance > offset.length()
      ? point
      : from
          .clone()
          .add(new Vector2(direction.x, direction.y).setLength(maxDistance));
  }

  tick(): void {
    if (this.isWaitingForCommand()) {
      throw new Error("Waiting for command");
    }

    const { entities } = this.getCurrentLevel();

    for (const entity of entities) {
      const { commandState, controller } = entity;

      // Get next command if entity is waiting for one.
      if (commandState.currentCommand === null && controller !== null) {
        commandState.currentCommand = controller.nextCommand(entity, this);
      }

      // Perform command, and clear it if it's complete.
      if (commandState.currentCommand !== null) {
        if (
          commandState.currentCommand.nextTick(entity, this) ===
          CommandStatus.Complete
        ) {
          commandState.currentCommand = null;
        }
      }
    }
    this.tickCount++;
  }

  public randomPointInMap() {
    return new Vector2(
      0,
      this.getCurrentLevel().maze.radius * Math.random()
    ).rotateAround(new Vector2(0, 0), Math.random() * Math.PI * 2);
  }
}
