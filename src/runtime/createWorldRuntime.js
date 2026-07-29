import { createWorldBuilder } from "../world/createWorldBuilder.js";
import { createLightningBolt } from "../world/lightning.js";
import {
  registerObstacle as registerObstacleInLevel,
  collidesWithObstacle as collidesWithObstacleInLevel,
  resolveObstacleCollisions as resolveObstacleCollisionsInLevel,
  clampActorPosition as clampActorPositionInLevel,
} from "../world/obstacles.js";

export function createWorldRuntime(dependencies) {
  const getLevelState = dependencies.getLevelState;

  function registerObstacle(x, z, halfWidth, halfDepth) {
    registerObstacleInLevel(
      getLevelState(),
      x,
      z,
      halfWidth,
      halfDepth,
    );
  }

  function collidesWithObstacle(position, radius) {
    return collidesWithObstacleInLevel(getLevelState(), position, radius);
  }

  function resolveObstacleCollisions(position, radius, velocity) {
    return resolveObstacleCollisionsInLevel(
      getLevelState(),
      position,
      radius,
      velocity,
    );
  }

  function clampActorPosition(position, velocity, options) {
    clampActorPositionInLevel(getLevelState(), position, velocity, options);
  }

  const builder = createWorldBuilder({
    getScene: dependencies.getScene,
    getLevelState,
    randomRange: dependencies.randomRange,
    getMatchNpcCount: dependencies.getMatchNpcCount,
    collidesWithObstacle,
    registerObstacle,
    createLightningBolt: (x, z, width, height, tilt) => createLightningBolt(
      x,
      z,
      width,
      height,
      tilt,
      dependencies.randomRange,
    ),
  });

  return Object.freeze({
    buildWorld: (level) => builder.buildWorld(level),
    registerObstacle,
    collidesWithObstacle,
    resolveObstacleCollisions,
    clampActorPosition,
  });
}
