import { remove, times } from "lodash";
import { Vector2 } from "three";
import { Map, mazeToMap } from "../utility/Map";
import { rayCastSegments } from "../utility/rayCast";
import {
  Maze,
  MazeOptions,
  generateRandomMaze
} from "../utility/mazeGenerator";
import { MoveCommand, Command, CommandStatus } from "./Command";
import { Entity, EntityType } from "./Entity";
import { createEntity, entityTypes } from "./entityFactories";

export interface Level {
  entities: Entity[];
  map: Map;
  maze: Maze;
}

export class Game {
  static readonly useRange = 13;
  levels: Level[];
  currentLevelIndex: number = -1;
  player: Entity;
  tickCount: number = 0;
  eventBuffer: string[] = [];

  constructor(mazeOptions: readonly MazeOptions[]) {
    this.levels = mazeOptions.map(o => {
      const maze = generateRandomMaze(o);
      return {
        entities: maze.spawns.map(spawn =>
          createEntity(spawn.type, spawn.position)
        ),
        maze,
        map: mazeToMap(maze)
      };
    });
    this.player = createEntity("human");
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

  isUsable(useTarget: Entity): boolean {
    return useTarget.type.getUseCommand !== null;
  }

  isInReach(actor: Entity, target: Entity): boolean {
    return target.position.distanceTo(actor.position) <= Game.useRange;
  }

  isInReachOfPlayer(target: Entity): boolean {
    return this.isInReach(this.player, target);
  }

  use(useTarget: Entity) {
    if (!this.isUsable(useTarget)) {
      throw new Error(`${useTarget.type.noun} is not usable`);
    }
    if (!this.isInReach(this.player, useTarget)) {
      throw new Error(`${useTarget.type.noun} is out of range`);
    }
    this.setPlayerCommand(useTarget.type.getUseCommand!());
  }

  private logEvent(message: string) {
    console.log(`EVENT: ${message}`);
  }

  moveTo(to: Vector2) {
    this.setPlayerCommand(new MoveCommand(to));
  }

  findEntityOfType(entityType: EntityType) {
    const result = this.getCurrentLevel().entities.find(
      e => e.type === entityType
    );
    if (result === undefined) {
      throw new Error(`Could not find stairs down on level`);
    }
    return result;
  }

  enterLevel(levelIndex: number) {
    if (levelIndex < 0 || levelIndex > this.levels.length) {
      console.error(`level out of range: ${levelIndex}`);
      return;
    }
    if (this.currentLevelIndex !== -1) {
      remove(this.getCurrentLevel().entities, this.player);
    }
    this.currentLevelIndex = levelIndex;
    this.getCurrentLevel().entities.push(this.player);
    this.addEvent(
      `${this.player.type.noun} is on level ${this.currentLevelIndex + 1}`
    );
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

  startGame() {
    this.enterLevel(0);
    return this.flushEvents();
  }

  tick(): string[] {
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
    return this.flushEvents();
  }

  private flushEvents(): string[] {
    const events = this.eventBuffer;
    this.eventBuffer = [];
    return events;
  }

  addEvent(message: string) {
    this.eventBuffer.push(message);
  }

  randomPointInMap() {
    return new Vector2(
      0,
      this.getCurrentLevel().maze.radius * Math.random()
    ).rotateAround(new Vector2(0, 0), Math.random() * Math.PI * 2);
  }
}
