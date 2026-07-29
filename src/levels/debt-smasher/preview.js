import { createNpc } from "./actors.js";

export function createPreviewModel() {
  return { background: 0x0c1320 };
}

export function renderPreview({ scene }) {
  const target = createNpc(0, { debtType: "mortgage", levelTarget: true });
  target.group.rotation.y = -0.3;
  scene.add(target.group);
}
