import * as THREE from "three";
import {
  TUTORIAL_ATTACK_COOLDOWN,
  TUTORIAL_COMPUTER_INDEX,
  TUTORIAL_FAN_SECONDS,
  TUTORIAL_MISS_HINT_SECONDS,
  TUTORIAL_MOVE_HOLD_SECONDS,
  TUTORIAL_PHASES,
} from "./constants.js";
import { createTutorialViewModel } from "./viewModel.js";
import {
  hideMissHint,
  hideTutorialOverlays,
  showAttackTutorial,
  showMissHint,
  showMoveTutorial,
} from "./view.js";

function applyTargetGlow(npc, enabled) {
  if (!npc?.group) return;
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
  const movePos = new THREE.Vector3(
    steps.moveTargetPos?.x ?? 0.4,
    0,
    steps.moveTargetPos?.z ?? 6.6,
  );
  const moveRadius = steps.moveRadius ?? 1;
  const computers = resources.computers ?? [];
  const extraNpcCount = Math.max(
    1,
    (context.definition.npcCount ?? context.actors.npcCount ?? 6) - 1,
  );

  const state = {
    phase: TUTORIAL_PHASES.MOVE,
    moveHold: 0,
    fanTimer: 0,
    missHintTimer: 0,
  };

  let target = null;

  function refreshHud() {
    context.ui.refreshHud?.();
  }

  function placeWaypoint() {
    if (!resources.waypointGroup) return;
    resources.waypointGroup.position.set(movePos.x, 0, movePos.z);
    resources.waypointGroup.visible = true;
  }

  function hideWaypoint() {
    if (!resources.waypointGroup) return;
    resources.waypointGroup.visible = false;
  }

  function showFanIndicator() {
    const fan = resources.fanMesh;
    const player = context.actors.getPlayer?.();
    if (!fan || !player) return;
    fan.visible = true;
    fan.position.set(player.group.position.x, 0.09, player.group.position.z);
    fan.rotation.z = -player.group.rotation.y;
    state.fanTimer = TUTORIAL_FAN_SECONDS;
  }

  function enterAttackPhase() {
    if (state.phase !== TUTORIAL_PHASES.MOVE) return;
    state.phase = TUTORIAL_PHASES.ATTACK;
    state.moveHold = 0;
    hideWaypoint();
    applyTargetGlow(target, true);
    showAttackTutorial(context.ui);
    showFanIndicator();
    refreshHud();
  }

  function pickComputerIndex(preferred) {
    if (!computers.length) return 0;
    if (preferred != null && computers[preferred]) return preferred;
    return Math.floor(context.random.range(0, computers.length));
  }

  function seatAtComputer(npc, computerIndex) {
    const computer = computers[computerIndex];
    if (!computer) return;
    npc.group.position.copy(computer);
    npc.group.position.x += 0.15;
    const facingPoint = computer.clone();
    facingPoint.z += computer.z > 0 ? -1.1 : 1.1;
    context.movement.faceNpcToward(npc, facingPoint);
  }

  function updateTarget(deltaSeconds) {
    if (!target?.alive) return;
    const script = target.script;
    if (!script) return;

    if (script.state === "play") {
      target.walking = false;
      script.timer -= deltaSeconds;
      seatAtComputer(target, script.computerIndex);
      const progress = 1 - script.timer / (script.playDuration || script.timer || 1);
      context.ui.setBlackEye(target, 0.62 + progress * 0.28);
      if (script.timer <= 0) {
        context.ui.setBlackEye(target, 1);
        script.state = "leave";
        script.timer = context.random.range(4.5, 7);
        script.waypoint = context.movement.randomOpenPosition();
      }
      return;
    }

    if (script.state === "leave") {
      target.walking = true;
      const reached = context.movement.moveNpcToward(
        target,
        script.waypoint,
        context.actors.npcSpeed * 1.08,
        deltaSeconds,
      );
      script.timer -= deltaSeconds;
      if (reached || script.timer <= 0) {
        script.computerIndex = pickComputerIndex();
        script.waypoint = computers[script.computerIndex].clone();
        script.state = "seek";
      }
      return;
    }

    if (script.state === "seek") {
      target.walking = true;
      const reached = context.movement.moveNpcToward(
        target,
        script.waypoint,
        context.actors.npcSpeed * 1.12,
        deltaSeconds,
      );
      if (reached) {
        script.state = "play";
        script.timer = context.random.range(2.4, 3.8);
        script.playDuration = script.timer;
        context.ui.setBlackEye(target, 0.62);
        seatAtComputer(target, script.computerIndex);
      }
    }
  }

  function start() {
    const player = context.actors.getPlayer?.();
    if (player) {
      const spawn = context.movement.randomOpenPosition();
      player.group.position.copy(spawn);
    }

    const computerIndex = pickComputerIndex(TUTORIAL_COMPUTER_INDEX);
    target = context.actors.createNpc(0, {
      gamingTarget: true,
      levelTarget: true,
    });
    target.id = steps.attackTargetId ?? "noisy_roommate";
    target.levelManaged = true;
    target.script = {
      state: "leave",
      timer: context.random.range(2.5, 4.5),
      playDuration: 2.8,
      computerIndex,
      waypoint: context.movement.randomOpenPosition(),
    };
    target.group.position.copy(target.script.waypoint);
    context.ui.setBlackEye(target, 0.7);
    context.actors.addNpc(target);

    for (let id = 1; id <= extraNpcCount; id += 1) {
      context.actors.addWanderNpc(id);
    }

    placeWaypoint();
    showMoveTutorial(context.ui);
    refreshHud();
  }

  function update(deltaSeconds) {
    resources.updateEnvironment?.(deltaSeconds);
    updateTarget(deltaSeconds);

    if (state.missHintTimer > 0) {
      state.missHintTimer -= deltaSeconds;
      if (state.missHintTimer <= 0) hideMissHint(context.ui);
    }

    if (state.fanTimer > 0) {
      state.fanTimer -= deltaSeconds;
      const fan = resources.fanMesh;
      const player = context.actors.getPlayer?.();
      if (fan?.visible && player) {
        fan.position.set(player.group.position.x, 0.09, player.group.position.z);
        fan.rotation.z = -player.group.rotation.y;
        fan.material.opacity = 0.38 * Math.max(0, state.fanTimer / TUTORIAL_FAN_SECONDS);
      }
      if (state.fanTimer <= 0 && fan) fan.visible = false;
    }

    if (target?.tutorialAura) {
      target.tutorialAura.rotation.z += deltaSeconds * 1.6;
      target.tutorialAura.material.opacity = 0.7 + Math.sin(performance.now() * 0.006) * 0.2;
    }

    if (state.phase !== TUTORIAL_PHASES.MOVE) return;
    const player = context.actors.getPlayer?.();
    if (!player) return;
    const dx = player.group.position.x - movePos.x;
    const dz = player.group.position.z - movePos.z;
    if (Math.hypot(dx, dz) <= moveRadius) {
      state.moveHold += deltaSeconds;
      if (state.moveHold >= TUTORIAL_MOVE_HOLD_SECONDS) enterAttackPhase();
    } else {
      state.moveHold = 0;
    }
  }

  function handleAction(action) {
    if (action.type === "beginPlay") {
      showMoveTutorial(context.ui);
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
      hideWaypoint();
      if (resources.fanMesh) resources.fanMesh.visible = false;
      applyTargetGlow(target, false);
      hideTutorialOverlays(context.ui);
      target = null;
    },
  };
}
