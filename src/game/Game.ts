import { remove, MemoVoidDictionaryIterator, pull } from "lodash";
import { Vector2 } from "three";
import { Map, mazeToMap } from "../utility/Map";
import {
  generateRandomMaze,
  Maze,
  MazeOptions
} from "../utility/mazeGenerator";
import { rayCastSegments, rayCastSegmentsDetailed } from "../utility/rayCast";
import {
  Command,
  CommandStatus,
  MoveCommand,
  RangedAttackCommand,
  IdleCommand
} from "./Command";
import { Entity, EntityType } from "./Entity";
import { createEntity, entityTypes } from "./entityFactories";
import { Segment, createSegment } from "../vendor/2d-visibility/src/types";

export const enum GameState {
  Running,
  Victory,
  GameOver
}

export interface Level {
  readonly entities: Entity[];
  readonly map: Map;
  readonly maze: Maze;
}

export interface GameEvent {
  readonly message: string;
  readonly traces: {
    readonly from: Vector2;
    readonly to: Vector2;
    readonly isHit: boolean;
  }[];
}

export class Game {
  static readonly useRange = 13;
  levels: Level[];
  currentLevelIndex: number = -1;
  player: Entity;
  tickCount: number = 0;
  eventBuffer: GameEvent[] = [];
  state = GameState.Running;

  isGameOver() {
    return this.state === GameState.GameOver;
  }

  quit() {
    remove(this.getCurrentLevel().entities, this.player);
    this.addEvent(`${this.player.type.noun} flees the Chronosphere!`);
    this.state = GameState.GameOver;
  }

  isVictorious() {
    return this.state === GameState.Victory;
  }

  win() {
    remove(this.getCurrentLevel().entities, this.player);
    this.addEvent(`${this.player.type.noun} is victorious!`);
    this.state = GameState.Victory;
  }

  constructor(mazeOptions: readonly MazeOptions[]) {
    this.levels = mazeOptions.map(o => {
      const maze = generateRandomMaze(o);
      const entities = maze.spawns.map(spawn =>
        createEntity(spawn.type, spawn.position)
      );
      return {
        entities,
        maze,
        map: mazeToMap(maze)
      };
    });
    this.player = createEntity("player");
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

  canFireAt(actor: Entity, target: Entity): boolean {
    if (actor.held == null) {
      return false;
    }
    return actor.held.type.rangedWeapon !== null && target.stats !== null;
  }

  fireAt(actor: Entity, target: Entity): void {
    if (!this.canFireAt(actor, target)) {
      throw new Error("Cannot fire");
    }
    this.setPlayerCommand(new RangedAttackCommand(target));
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

  moveTo(to: Vector2) {
    this.setPlayerCommand(new MoveCommand(to));
  }

  rest(tickCount: number) {
    this.setPlayerCommand(new IdleCommand(tickCount));
  }

  killEntity(entity: Entity) {
    this.addEvent({ message: `${entity.type.noun} is killed!`, traces: [] });
    pull(this.getCurrentLevel().entities, entity);
    if (entity === this.player) {
      this.state = GameState.GameOver;
    }
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
    if (levelIndex < 0 || levelIndex >= this.levels.length) {
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
    if (this.state !== GameState.Running) {
      return false;
    }
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

  rayCastWalls(from: Vector2, direction: Vector2): number {
    return rayCastSegments(from, direction, this.getCurrentLevel().map.walls);
  }

  rayCastEntities(
    from: Entity,
    direction: Vector2,
    otherEntities?: readonly Entity[]
  ) {
    const level = this.getCurrentLevel();
    const entities = otherEntities ?? level.entities;
    const entitySegments = entities.reduce((acc, e) => {
      if (e !== from && e.stats !== null) {
        const offset = e.position.clone().sub(from.position);
        const perpendicular = new Vector2(offset.y, -offset.x)
          .normalize()
          .multiplyScalar(e.type.scale / 2);
        const p1 = e.position.clone().sub(perpendicular);
        const p2 = e.position.clone().add(perpendicular);
        acc.push([e, createSegment(p1.x, p1.y, p2.x, p2.y)]);
      }
      return acc;
    }, [] as [Entity, Segment][]);
    const result = rayCastSegmentsDetailed(from.position, direction, [
      ...level.map.walls,
      ...entitySegments.map(es => es[1])
    ]);
    if (result === null) {
      return null;
    }
    const hitEntitySegment = entitySegments.find(
      es => es[1] === result.segment
    );
    return {
      ...result,
      entity: hitEntitySegment === undefined ? null : hitEntitySegment[0],
      entitySegments
    };
  }

  getMaximumMoveTowardsPoint(entity: Entity, point: Vector2): Vector2 {
    const from = entity.position;
    const offset = point.clone().sub(from);
    const direction = offset.clone().normalize();
    // Subtract radius from max distance to stop exact at the wall.
    const maxDistance = Math.max(
      this.rayCastWalls(from, direction) - entity.type.scale,
      0
    );
    return maxDistance > offset.length()
      ? point.clone()
      : from
          .clone()
          .add(new Vector2(direction.x, direction.y).setLength(maxDistance));
  }

  startGame() {
    this.enterLevel(0);
    this.player.position.copy(
      this.findEntityOfType(entityTypes.stairsDown).position
    );
    return this.flushEvents();
  }

  tick(): GameEvent[] {
    if (this.isWaitingForCommand()) {
      throw new Error("Waiting for command");
    }

    const { entities } = this.getCurrentLevel();
    this.tickCount++;

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
    return this.flushEvents();
  }

  private flushEvents(): GameEvent[] {
    const events = this.eventBuffer;
    this.eventBuffer = [];
    return events;
  }

  addEvent(event: string | GameEvent) {
    this.eventBuffer.push(
      typeof event === "string" ? { message: event, traces: [] } : event
    );
  }

  randomPointInMaze(maze: Maze) {
    return new Vector2(0, maze.radius * Math.random()).rotateAround(
      new Vector2(0, 0),
      Math.random() * Math.PI * 2
    );
  }

  randomPointInMap() {
    return new Vector2(
      0,
      this.getCurrentLevel().maze.radius * Math.random()
    ).rotateAround(new Vector2(0, 0), Math.random() * Math.PI * 2);
  }
}
