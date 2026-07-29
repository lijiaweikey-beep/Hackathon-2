import { createNpc } from "./actors.js";

export function createPreviewModel() {
  return { background: 0x07111f };
}

export function renderPreview({ scene }) {
  const target = createNpc(0, { gooseVendor: false, levelTarget: true });
  target.setLegGlow(0.9);
  target.group.rotation.y = -0.35;
  scene.add(target.group);
}
