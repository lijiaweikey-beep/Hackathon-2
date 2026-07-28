import * as THREE from "three";
import { LOW_POLY_NPC_PALETTES } from "../entities/palettes.js";
import { createLowPolyPerson } from "../entities/lowPolyPerson.js";

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
  return level.extensions?.createPreviewModel?.(level) ?? {
    background: level.lighting === "night" ? 0x0c1424 : 0xd0dce8,
  };
}

export function renderTargetPreview(canvas, level) {
  if (!canvas || !level) return;
  initPreviewRenderer(canvas);
  clearPreviewActors();

  const model = createTargetPreviewModel(level);
  previewScene.background = new THREE.Color(model.background);

  if (level.extensions?.renderPreview) {
    level.extensions.renderPreview({ scene: previewScene, level });
  } else {
    const npc = createLowPolyPerson(LOW_POLY_NPC_PALETTES[0]);
    npc.group.rotation.y = -0.35;
    previewScene.add(npc.group);
  }

  previewRenderer.render(previewScene, previewCamera);
}
