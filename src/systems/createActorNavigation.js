import * as THREE from "three";
import {
  ACTOR_COLLISION_RADIUS,
  HIT_FACING_DOT,
} from "../config/constants.js";
import {
  clampToWorld,
  getFacingVector,
  lerpAngle,
} from "../utils/math.js";

export function createActorNavigation(dependencies) {
  const direction2 = new THREE.Vector2();
  const facing = new THREE.Vector2();
  const direction3 = new THREE.Vector3();

  function moveToward(npc, waypoint, speed, deltaSeconds) {
    direction3.copy(waypoint).sub(npc.group.position);
    direction3.y = 0;
    if (direction3.length() < 0.14) {
      npc.walking = false;
      return true;
    }
    direction3.normalize();
    const previousX = npc.group.position.x;
    const previousZ = npc.group.position.z;
    direction2.set(direction3.x, direction3.z);
    npc.group.position.x += direction3.x * speed * deltaSeconds;
    npc.group.position.z += direction3.z * speed * deltaSeconds;
    const hitObstacle = dependencies.resolveObstacleCollisions(
      npc.group.position,
      ACTOR_COLLISION_RADIUS,
      direction2,
    );
    clampToWorld(npc.group.position);
    const moved = Math.hypot(
      npc.group.position.x - previousX,
      npc.group.position.z - previousZ,
    );
    if (hitObstacle && moved < speed * deltaSeconds * 0.2 && waypoint) {
      waypoint.x += dependencies.randomRange(-1.2, 1.2);
      waypoint.z += dependencies.randomRange(-1.2, 1.2);
      clampToWorld(waypoint);
    }
    const rotation = Math.atan2(direction3.x, direction3.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, rotation, 0.12);
    npc.walking = true;
    return false;
  }

  function faceToward(npc, targetPosition) {
    direction3.copy(targetPosition).sub(npc.group.position);
    direction3.y = 0;
    if (direction3.lengthSq() < 0.0001) return;
    const rotation = Math.atan2(direction3.x, direction3.z);
    npc.group.rotation.y = lerpAngle(npc.group.rotation.y, rotation, 0.18);
  }

  function isFacingTarget(actor, target, maxDistance) {
    direction2.set(
      target.group.position.x - actor.group.position.x,
      target.group.position.z - actor.group.position.z,
    );
    if (direction2.length() > maxDistance) return false;
    getFacingVector(actor.group.rotation.y, facing);
    return facing.dot(direction2.normalize()) >= HIT_FACING_DOT;
  }

  return Object.freeze({ moveToward, faceToward, isFacingTarget });
}
