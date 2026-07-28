import { PUNCH_SWING } from "../config/constants.js";

export function createActorAnimator(dependencies) {
  function animate(actor, deltaSeconds, moving) {
    const userData = actor.group.userData;
    actor.walkCycle = (actor.walkCycle ?? 0) + deltaSeconds * (moving ? 8.5 : 2);
    const walk = moving ? Math.sin(actor.walkCycle) : 0;
    userData.visual.position.y = moving
      ? Math.abs(walk) * 0.06
      : Math.sin(dependencies.getTotalTime() * 1.7 + (actor.id ?? 0)) * 0.012;
    userData.leftLeg.rotation.x = walk * 0.55;
    userData.rightLeg.rotation.x = -walk * 0.55;

    const player = dependencies.getPlayer();
    if (actor !== player || player.punchTimer <= 0) {
      userData.leftArm.rotation.x = -walk * 0.28;
      userData.rightArm.rotation.x = walk * 0.28;
      userData.leftArm.rotation.z = userData.baseArmRotations.leftZ
        + (moving ? -Math.abs(walk) * 0.08 : 0);
      userData.rightArm.rotation.z = userData.baseArmRotations.rightZ
        + (moving ? Math.abs(walk) * 0.08 : 0);
    }
    actor.animations?.update?.(actor, {
      deltaSeconds,
      moving,
      totalTime: dependencies.getTotalTime(),
    });
  }

  function animateNpcAttack(npc) {
    const userData = npc.group.userData;
    if (!userData?.rightArm) return;
    if (npc.punchTimer > 0) {
      const progress = 1 - npc.punchTimer / (npc.punchDuration ?? PUNCH_SWING);
      const swing = Math.sin(progress * Math.PI);
      userData.rightArm.rotation.x = -1.5 * swing;
      userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 0.72 * swing;
      userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.22 * swing;
      return;
    }
    if (npc.attackTimer > 0) {
      const progress = Math.sin((npc.attackTimer / 0.26) * Math.PI);
      userData.rightArm.rotation.x = -1.15 * progress;
      userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 0.48 * progress;
    }
  }

  function animatePlayerAttack(player) {
    const userData = player.group.userData;
    const progress = player.punchTimer > 0
      ? Math.sin((player.punchTimer / (player.punchDuration ?? PUNCH_SWING)) * Math.PI)
      : 0;
    if (player.animations?.attack?.(player, {
      progress,
      totalTime: dependencies.getTotalTime(),
    }) === true) return;
    userData.rightArm.rotation.x = -2.15 * progress;
    userData.rightArm.rotation.z = userData.baseArmRotations.rightZ - 1.05 * progress;
    userData.leftArm.rotation.z = userData.baseArmRotations.leftZ + 0.42 * progress;
    const directionX = Math.sin(player.group.rotation.y);
    const directionZ = Math.cos(player.group.rotation.y);
    userData.visual.position.x = directionX * 0.18 * progress;
    userData.visual.position.z = directionZ * 0.18 * progress;
    if (progress <= 0) {
      userData.visual.position.x = 0;
      userData.visual.position.z = 0;
    }
  }

  function animateCheer(deltaSeconds) {
    const player = dependencies.getPlayer();
    const userData = player.group.userData;
    userData.visual.position.y = Math.abs(
      Math.sin(dependencies.getTotalTime() * 7.5),
    ) * 0.45;
    userData.leftArm.rotation.z = 2.45;
    userData.rightArm.rotation.z = -2.45;
    player.group.rotation.y += deltaSeconds * 1.8;
  }

  return Object.freeze({
    animate,
    animateNpcAttack,
    animatePlayerAttack,
    animateCheer,
  });
}
