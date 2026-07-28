import * as THREE from "three";
import { HIT_PAIR_RANGE } from "../../config/constants.js";

export function createLibraryLevel(context) {
  let pair = null;

  function start() {
    const a = context.createNpc(0, { lover: true });
    const b = context.createNpc(1, { lover: true });
    const separationGroup = Symbol("library-lovers");
    a.levelManaged = true;
    b.levelManaged = true;
    a.separationGroup = separationGroup;
    b.separationGroup = separationGroup;
    a.group.position.set(-0.38, 0, -0.2);
    b.group.position.set(0.38, 0, -0.2);
    context.addNpc(a);
    context.addNpc(b);
    pair = {
      members: [a, b],
      state: "kiss",
      timer: 2.2,
      meetingPoint: new THREE.Vector3(0, 0, -0.2),
      scatterPoints: [new THREE.Vector3(-3, 0, 2.5), new THREE.Vector3(3, 0, 1.6)],
    };

    for (let id = 2; id < context.npcCount; id += 1) {
      context.addWanderNpc(id);
    }
  }

  function randomMeetingPoint() {
    let point;
    let attempts = 0;
    do {
      point = new THREE.Vector3(
        context.randomRange(-5.5, 5.5),
        0,
        context.randomRange(-4.5, 5.8),
      );
      attempts += 1;
    } while (attempts < 30 && context.collidesWithObstacle(point));
    return point;
  }

  function update(deltaSeconds) {
    if (!pair) return;
    const [a, b] = pair.members;
    if (!a.alive || !b.alive) return;

    if (pair.state === "kiss") {
      a.walking = false;
      b.walking = false;
      pair.timer -= deltaSeconds;
      context.faceNpcToward(a, b.group.position);
      context.faceNpcToward(b, a.group.position);
      const intensity = Math.min(1, a.markIntensity + deltaSeconds * 0.32);
      context.setLipstick(a, intensity);
      context.setLipstick(b, intensity);
      if (pair.timer <= 0) {
        pair.state = "scatter";
        pair.timer = context.randomRange(3.4, 4.8);
        const angle = context.randomRange(0, Math.PI * 2);
        pair.scatterPoints = [
          new THREE.Vector3(
            Math.cos(angle) * context.randomRange(3.2, 5.6),
            0,
            Math.sin(angle) * context.randomRange(2.8, 5.4),
          ),
          new THREE.Vector3(
            Math.cos(angle + Math.PI) * context.randomRange(3.2, 5.6),
            0,
            Math.sin(angle + Math.PI) * context.randomRange(2.8, 5.4),
          ),
        ];
      }
      return;
    }

    if (pair.state === "scatter") {
      a.walking = true;
      b.walking = true;
      const aDone = context.moveNpcToward(
        a,
        pair.scatterPoints[0],
        context.npcSpeed * 1.15,
        deltaSeconds,
      );
      const bDone = context.moveNpcToward(
        b,
        pair.scatterPoints[1],
        context.npcSpeed * 1.15,
        deltaSeconds,
      );
      pair.timer -= deltaSeconds;
      if ((aDone && bDone) || pair.timer <= 0) {
        pair.meetingPoint = randomMeetingPoint();
        pair.state = "approach";
      }
      return;
    }

    if (pair.state === "approach") {
      const offset = new THREE.Vector3(0.32, 0, 0);
      a.walking = true;
      b.walking = true;
      const aDone = context.moveNpcToward(
        a,
        pair.meetingPoint.clone().sub(offset),
        context.npcSpeed * 1.05,
        deltaSeconds,
      );
      const bDone = context.moveNpcToward(
        b,
        pair.meetingPoint.clone().add(offset),
        context.npcSpeed * 1.05,
        deltaSeconds,
      );
      if (aDone && bDone) {
        pair.state = "kiss";
        pair.timer = context.randomRange(1.7, 2.6);
      }
    }
  }

  function findHitTarget({ playerPos, facing }) {
    if (!pair) return undefined;
    const [a, b] = pair.members;
    if (!a.alive || !b.alive) return undefined;

    const toA = new THREE.Vector2(
      a.group.position.x - playerPos.x,
      a.group.position.z - playerPos.z,
    );
    const toB = new THREE.Vector2(
      b.group.position.x - playerPos.x,
      b.group.position.z - playerPos.z,
    );
    const aInRange = toA.length() <= HIT_PAIR_RANGE && context.isFacingTarget(facing, toA);
    const bInRange = toB.length() <= HIT_PAIR_RANGE && context.isFacingTarget(facing, toB);
    return aInRange || bInRange ? { correct: true, npcs: [a, b] } : undefined;
  }

  return {
    start,
    update,
    handleAction(action) {
      return action.type === "findHitTarget" ? findHitTarget(action) : undefined;
    },
    dispose() {
      pair = null;
    },
  };
}
