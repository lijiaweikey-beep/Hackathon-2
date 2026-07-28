import * as THREE from "three";
import {
  LOW_POLY_PLAYER_PALETTE,
  LOW_POLY_NPC_PALETTES,
  LOW_POLY_REMOTE_PALETTE,
} from "../entities/palettes.js";
import { createLowPolyPerson } from "../entities/lowPolyPerson.js";
import { createTemplePerson } from "../entities/templePerson.js";
import { createNpc as createNpcEntity } from "../entities/actors.js";
import { setBlackEye } from "../entities/marks.js";
import { createSuShiShadowCue } from "../entities/templeShadows.js";
import { createBloodmoonClawCue } from "../entities/bloodmoonCues.js";

let previewRenderer = null;
let previewScene = null;
let previewCamera = null;

function initPreviewRenderer(canvas) {
  if (previewRenderer) return;
  previewRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace;

  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(28, 200 / 220, 0.1, 50);
  previewCamera.position.set(0, 2.2, 3.6);
  previewCamera.lookAt(0, 0.9, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  previewScene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 4, 3);
  previewScene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
  fill.position.set(-2, 2, -1);
  previewScene.add(fill);
}

function clearPreviewActors() {
  while (previewScene.children.length > 3) {
    previewScene.remove(previewScene.children[3]);
  }
}

export function createTargetPreviewModel(level) {
  const variant = level.previewVariant ?? level.id;
  return {
    variant,
    background: variant === "bloodmoon"
      ? 0x21060b
      : level.lighting === "night"
        ? 0x0c1424
        : 0xd0dce8,
  };
}

export function renderTargetPreview(canvas, level) {
  if (!canvas || !level) return;
  initPreviewRenderer(canvas);
  clearPreviewActors();

  const model = createTargetPreviewModel(level);
  previewScene.background = new THREE.Color(model.background);

  if (model.variant === "gaming") {
    const npc = createNpcEntity(0, { gamingTarget: true }, level);
    setBlackEye(npc, 1);
    previewScene.add(npc.group);
  } else if (level.duelMode) {
    const local = createLowPolyPerson(LOW_POLY_PLAYER_PALETTE);
    const remote = createLowPolyPerson(LOW_POLY_REMOTE_PALETTE);
    local.group.position.set(-0.5, 0, 0);
    remote.group.position.set(0.5, 0, 0);
    local.group.rotation.y = 0.4;
    remote.group.rotation.y = -0.4;
    previewScene.add(local.group, remote.group);
  } else if (model.variant === "library") {
    const a = createLowPolyPerson(LOW_POLY_NPC_PALETTES[0]);
    const b = createLowPolyPerson(LOW_POLY_NPC_PALETTES[1]);
    a.group.position.set(-0.32, 0, 0);
    b.group.position.set(0.32, 0, 0);
    a.group.rotation.y = 0.5;
    b.group.rotation.y = -0.5;
    [a, b].forEach((npc) => {
      npc.group.userData.lipMarks.forEach((mark) => {
        mark.material = mark.material.clone();
        mark.material.opacity = 0.9;
        mark.scale.set(3.8, 2.8, 1);
      });
    });
    previewScene.add(a.group, b.group);
  } else if (model.variant === "bloodmoon") {
    const cue = createBloodmoonClawCue(1);
    cue.position.set(0, 0.045, 0.16);
    previewScene.add(cue);

    const npc = createLowPolyPerson(LOW_POLY_NPC_PALETTES[2]);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  } else if (model.variant === "temple") {
    const cue = createSuShiShadowCue(1);
    cue.position.set(0, 0.045, 0.08);
    previewScene.add(cue);

    const npc = createTemplePerson("bamboo", 0);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  } else {
    const npc = createLowPolyPerson(LOW_POLY_NPC_PALETTES[0]);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  }

  previewRenderer.render(previewScene, previewCamera);
}
