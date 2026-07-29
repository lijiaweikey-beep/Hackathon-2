import * as THREE from "three";
import {
  TUTORIAL_ATTACK_COOLDOWN,
  TUTORIAL_MISS_HINT_SECONDS,
  TUTORIAL_PHASES,
} from "./constants.js";
import { createTutorialViewModel } from "./viewModel.js";
import {
  hideMissHint,
  hideTutorialOverlays,
  showMissHint,
} from "./view.js";

function applyTargetGlow(npc, enabled) {
  if (!npc?.group?.traverse) return;
  npc.group.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material?.emissive) return;
      if (enabled) {
        if (material.userData._tutorialEmissive == null) {
          material.userData._tutorialEmissive = material.emissiveIntensity ?? 0;
          material.userData._tutorialEmissiveColor = material.emissive.clone();
        }
        material.emissive.setHex(0xffaa33);
        material.emissiveIntensity = 1.35;
      } else if (material.userData._tutorialEmissive != null) {
        material.emissive.copy(material.userData._tutorialEmissiveColor);
        material.emissiveIntensity = material.userData._tutorialEmissive;
      }
    });
  });

  if (enabled && !npc.tutorialAura) {
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.045, 10, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffb020,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 1.05;
    npc.group.add(aura);
    npc.tutorialAura = aura;
  } else if (!enabled && npc.tutorialAura) {
    npc.group.remove(npc.tutorialAura);
    npc.tutorialAura.geometry?.dispose?.();
    npc.tutorialAura.material?.dispose?.();
    npc.tutorialAura = null;
  }
}

export function createGamingLevel(context) {
  const resources = context.sceneData;
  const steps = context.definition.tutorialSteps ?? {};
  const extraNpcCount = Math.max(
    1,
    (context.definition.npcCount ?? context.actors.npcCount ?? 6) - 1,
  );

  const state = {
    phase: TUTORIAL_PHASES.ATTACK,
    missHintTimer: 0,
  };

  let target = null;

  function refreshHud() {
    context.ui.refreshHud?.();
  }

  function start() {
    const player = context.actors.getPlayer?.();
    if (player) {
      const spawn = context.movement.randomOpenPosition();
      player.group.position.copy(spawn);
    }

    target = context.actors.createNpc(0, {
      gamingTarget: true,
      levelTarget: true,
    });
    target.id = steps.attackTargetId ?? "noisy_roommate";
    target.group.position.copy(context.movement.randomOpenPosition());
    context.ui.setBlackEye(target, 0.7);
    context.actors.addNpc(target);
    applyTargetGlow(target, true);

    for (let id = 1; id <= extraNpcCount; id += 1) {
      context.actors.addWanderNpc(id);
    }

    refreshHud();
  }

  function update(deltaSeconds) {
    resources.updateEnvironment?.(deltaSeconds);

    if (state.missHintTimer > 0) {
      state.missHintTimer -= deltaSeconds;
      if (state.missHintTimer <= 0) hideMissHint(context.ui);
    }

    if (target?.tutorialAura) {
      target.tutorialAura.rotation.z += deltaSeconds * 1.6;
      target.tutorialAura.material.opacity = 0.7 + Math.sin(performance.now() * 0.006) * 0.2;
    }

  }

  function handleAction(action) {
    if (action.type === "beginPlay") {
      refreshHud();
      return { handled: true };
    }

    if (action.type === "getHudState") {
      return createTutorialViewModel(state);
    }

    if (action.type === "getResultStats") {
      return createTutorialViewModel(state).resultResource;
    }

    if (action.type === "beforeAttack") {
      if (state.phase !== TUTORIAL_PHASES.ATTACK) {
        return { blocked: true };
      }
      return {
        blocked: false,
        cooldown: TUTORIAL_ATTACK_COOLDOWN,
        animationSeconds: 0.28,
        resetCombo: false,
      };
    }

    if (action.type === "findHitTarget") {
      if (state.phase !== TUTORIAL_PHASES.ATTACK || !target?.alive) return null;
      const playerPos = action.playerPos;
      const facing = action.facing;
      const toNpc = new THREE.Vector2(
        target.group.position.x - playerPos.x,
        target.group.position.z - playerPos.z,
      );
      const distance = toNpc.length();
      if (distance > 1.85) return null;
      if (!context.combat.isFacingTarget(facing, toNpc)) return null;
      return { npc: target, correct: true };
    }

    if (action.type === "attackMiss") {
      if (state.phase !== TUTORIAL_PHASES.ATTACK) return { handled: true };
      state.missHintTimer = TUTORIAL_MISS_HINT_SECONDS;
      showMissHint(context.ui);
      context.audio.playSound("miss");
      return { handled: true };
    }

    if (action.type === "hitTarget") {
      const hit = action.hit;
      if (hit?.correct && hit.npc === target) {
        state.phase = TUTORIAL_PHASES.DONE;
        applyTargetGlow(target, false);
        hideTutorialOverlays(context.ui);
        context.actors.dissolve(target);
        context.combat.triggerHitstop(0.08);
        context.combat.triggerShake(0.35, 0.2);
        context.audio.playSound("hit");
        context.combat.finishLevel(true, null, 760);
        refreshHud();
        return { handled: true };
      }
      state.missHintTimer = TUTORIAL_MISS_HINT_SECONDS;
      showMissHint(context.ui);
      context.audio.playSound("miss");
      return { handled: true };
    }

    return undefined;
  }

  return {
    start,
    update,
    handleAction,
    dispose() {
      if (resources.waypointGroup) resources.waypointGroup.visible = false;
      if (resources.fanMesh) resources.fanMesh.visible = false;
      applyTargetGlow(target, false);
      hideTutorialOverlays(context.ui);
      target = null;
    },
  };
}
