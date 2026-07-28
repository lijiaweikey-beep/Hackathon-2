import * as THREE from "three";
import {
  TEMPLE_MOON_RADIUS,
  TEMPLE_SHADOW_FADE,
  TEMPLE_TRUE_INITIAL_MOON_DELAY,
  TEMPLE_TRUE_REVEAL_AT,
  TEMPLE_TRUE_SHADOW_MAX,
} from "../../config/constants.js";

export function createTempleLevel(context) {
  let target = null;

  function segmentPassesMoon(fromPosition, toPosition, radius) {
    const moonPoint = context.sceneData.moonPoint;
    const dx = toPosition.x - fromPosition.x;
    const dz = toPosition.z - fromPosition.z;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq <= 0.0001) {
      return Math.hypot(fromPosition.x - moonPoint.x, fromPosition.z - moonPoint.z) < radius;
    }

    const ratio = THREE.MathUtils.clamp(
      ((moonPoint.x - fromPosition.x) * dx + (moonPoint.z - fromPosition.z) * dz) / lengthSq,
      0,
      1,
    );
    const closestX = fromPosition.x + dx * ratio;
    const closestZ = fromPosition.z + dz * ratio;
    return Math.hypot(closestX - moonPoint.x, closestZ - moonPoint.z) < radius;
  }

  function randomOutsideMoon(fromPosition = null, extraDistance = 0.8) {
    const moonPoint = context.sceneData.moonPoint;
    const minDistance = TEMPLE_MOON_RADIUS + extraDistance;
    let fallback = null;

    for (let attempts = 0; attempts < 60; attempts += 1) {
      const position = context.randomOpenPosition();
      const distance = Math.hypot(position.x - moonPoint.x, position.z - moonPoint.z);
      if (!fallback || distance > Math.hypot(fallback.x - moonPoint.x, fallback.z - moonPoint.z)) {
        fallback = position;
      }
      if (distance < minDistance) continue;
      if (
        fromPosition
        && segmentPassesMoon(fromPosition, position, TEMPLE_MOON_RADIUS * 0.82)
      ) continue;
      return position;
    }

    return fallback ?? context.randomOpenPosition();
  }

  function randomDisturbPoint() {
    const moonPoint = context.sceneData.moonPoint;
    for (let attempts = 0; attempts < 24; attempts += 1) {
      const angle = context.randomRange(0, Math.PI * 2);
      const radius = context.randomRange(
        TEMPLE_MOON_RADIUS * 0.48,
        TEMPLE_MOON_RADIUS * 0.86,
      );
      const position = new THREE.Vector3(
        moonPoint.x + Math.sin(angle) * radius,
        0,
        moonPoint.z + Math.cos(angle) * radius,
      );
      if (!context.collidesWithObstacle(position)) return position;
    }

    return moonPoint.clone().add(new THREE.Vector3(
      context.randomRange(-2.8, 2.8),
      0,
      context.randomRange(-2.8, 2.8),
    ));
  }

  function getMoonInfluence(position) {
    const moonPoint = context.sceneData.moonPoint;
    const distance = Math.hypot(position.x - moonPoint.x, position.z - moonPoint.z);
    return THREE.MathUtils.clamp(
      (TEMPLE_MOON_RADIUS - distance) / TEMPLE_SHADOW_FADE,
      0,
      1,
    );
  }

  function setClues(npc, intensity) {
    const clueIntensity = Math.min(intensity, TEMPLE_TRUE_SHADOW_MAX);
    npc.marked = true;
    npc.markIntensity = clueIntensity;
    context.positionShadowCue(context.sceneData.shadowCue, npc);
    context.setShadowCueIntensity(
      context.sceneData.shadowCue,
      clueIntensity * getMoonInfluence(npc.group.position),
    );
  }

  function pulseClues(npc) {
    if (!npc.marked) return;
    const pulse = 0.5 + Math.sin(context.getTotalTime() * 3.2) * 0.5;
    context.positionShadowCue(context.sceneData.shadowCue, npc);
    context.setShadowCueIntensity(
      context.sceneData.shadowCue,
      npc.markIntensity * getMoonInfluence(npc.group.position),
      0.78 + pulse * 0.12,
    );
  }

  function configureDecoy(npc, index) {
    if (index >= context.definition.moonDecoyCount) return;
    npc.isMoonDisturber = true;
    npc.moonDisturbTimer = context.randomRange(12, 18);
    npc.moonDisturbWaypoint = null;
  }

  function updateMoonDecoy(npc, deltaSeconds) {
    if (!npc.isMoonDisturber) return false;

    if (npc.deoyState !== "moonApproach" && npc.deoyState !== "moonPause") {
      npc.moonDisturbTimer -= deltaSeconds;
      if (npc.moonDisturbTimer <= 0) {
        if (context.randomRange(0, 1) < 0.65) {
          npc.deoyState = "moonApproach";
          npc.decoyTimer = context.randomRange(4, 6);
          npc.moonDisturbWaypoint = randomDisturbPoint();
        } else {
          npc.moonDisturbTimer = context.randomRange(12, 18);
        }
      }
    }

    if (npc.deoyState === "moonApproach") {
      npc.walking = true;
      const reached = context.moveNpcToward(
        npc,
        npc.moonDisturbWaypoint,
        context.npcSpeed * 0.92,
        deltaSeconds,
      );
      npc.decoyTimer -= deltaSeconds;
      if (reached || npc.decoyTimer <= 0) {
        npc.deoyState = "moonPause";
        npc.decoyTimer = context.randomRange(0.8, 1.4);
      }
      return true;
    }

    if (npc.deoyState === "moonPause") {
      npc.walking = false;
      npc.decoyTimer -= deltaSeconds;
      context.faceNpcToward(npc, new THREE.Vector3(7.1, 0, -10.4));
      if (npc.decoyTimer <= 0) {
        npc.deoyState = "wander";
        npc.decoyTimer = context.randomRange(1, 2.5);
        npc.moonDisturbTimer = context.randomRange(12, 18);
        npc.moonDisturbWaypoint = null;
        npc.wanderTimer = context.randomRange(0.5, 1.5);
        npc.pauseTimer = context.randomRange(0.2, 0.8);
      }
      return true;
    }

    return false;
  }

  function updateShadows() {
    context.getActors().forEach((actor) => {
      const influence = getMoonInfluence(actor.group.position);
      const pulse = 0.9
        + Math.sin(context.getTotalTime() * 2.4 + (actor.id ?? 0)) * 0.08;
      const strength = actor.isSuShiTarget ? 0.86 : actor.isDecoy ? 0.84 : 0.8;
      context.setTempleLocalShadow(actor, influence, strength, pulse);
    });

    if (target?.marked) {
      pulseClues(target);
    } else {
      context.setShadowCueIntensity(context.sceneData.shadowCue, 0);
    }
  }

  function start() {
    target = context.createNpc(0, { suShiTarget: true, templeClone: true });
    target.levelManaged = true;
    const startPosition = randomOutsideMoon(null, 1.2);
    target.group.position.copy(startPosition);
    target.script = {
      state: "wander",
      timer: context.randomRange(2.4, 4.2),
      waypoint: randomOutsideMoon(startPosition),
      moonPoint: context.sceneData.moonPoint.clone(),
      revealProgress: 0,
      exposed: false,
      wanderRouteLeft: 2,
      nextMoonDelay: context.randomRange(
        TEMPLE_TRUE_INITIAL_MOON_DELAY[0],
        TEMPLE_TRUE_INITIAL_MOON_DELAY[1],
      ),
    };
    context.addNpc(target);

    for (let id = 1; id < context.npcCount; id += 1) {
      context.addWanderNpc(id);
    }
  }

  function update(deltaSeconds) {
    if (!target?.alive) return;
    const script = target.script;

    if (script.state === "seekMoon") {
      target.walking = true;
      if (
        context.moveNpcToward(
          target,
          script.moonPoint,
          context.npcSpeed * 0.96,
          deltaSeconds,
        )
      ) {
        script.state = "moonPause";
        script.timer = context.randomRange(1.6, 2.1);
        script.revealProgress = 0;
        script.exposed = false;
      }
      return;
    }

    if (script.state === "moonPause") {
      target.walking = false;
      script.timer -= deltaSeconds;
      context.faceNpcToward(target, new THREE.Vector3(7.1, 0, -10.4));
      if (script.timer <= TEMPLE_TRUE_REVEAL_AT || script.exposed) {
        script.exposed = true;
        script.revealProgress = Math.min(1, script.revealProgress + deltaSeconds * 0.65);
        setClues(target, script.revealProgress);
      }
      if (script.timer <= 0) {
        script.state = "wander";
        script.timer = context.randomRange(2.4, 4.2);
        script.waypoint = randomOutsideMoon(target.group.position);
        script.wanderRouteLeft = context.randomRange(0, 1) < 0.5 ? 1 : 2;
        script.nextMoonDelay = context.randomRange(10, 15);
        script.revealProgress = 0;
        script.exposed = false;
        target.marked = false;
        target.markIntensity = 0;
        context.setShadowCueIntensity(context.sceneData.shadowCue, 0);
      }
      return;
    }

    if (script.state === "wander") {
      target.walking = true;
      const reached = context.moveNpcToward(
        target,
        script.waypoint,
        context.npcSpeed * 1.02,
        deltaSeconds,
      );
      script.timer -= deltaSeconds;
      script.nextMoonDelay = Math.max(0, script.nextMoonDelay - deltaSeconds);
      if (reached || script.timer <= 0) {
        if (script.wanderRouteLeft > 0 || script.nextMoonDelay > 0) {
          if (reached) script.wanderRouteLeft = Math.max(0, script.wanderRouteLeft - 1);
          script.timer = context.randomRange(2.4, 4.2);
          script.waypoint = script.nextMoonDelay > 0
            ? randomOutsideMoon(target.group.position)
            : context.randomOpenPosition();
        } else {
          script.state = "seekMoon";
          script.waypoint = script.moonPoint.clone();
        }
      }
    }
  }

  return {
    start,
    update,
    handleAction(action) {
      if (action.type === "configureDecoy") {
        return configureDecoy(action.npc, action.index);
      }
      if (action.type === "updateDecoy") {
        return updateMoonDecoy(action.npc, action.deltaSeconds);
      }
      if (action.type === "afterNpcUpdate") {
        return updateShadows();
      }
      if (action.type === "actorDissolved" && action.actor === target) {
        context.setShadowCueIntensity(context.sceneData.shadowCue, 0);
      }
      return undefined;
    },
    dispose() {
      target = null;
    },
  };
}
