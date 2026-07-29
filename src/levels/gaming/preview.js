import { createNpc } from "./actors.js";
import { setTutorialTargetRing } from "./targetRing.js";

export function createPreviewModel() {
  return { background: 0x0c1424 };
}

export function renderPreview({ scene }) {
  const npc = createNpc(0, {}, () => 0.5);
  setTutorialTargetRing(npc, true);
  scene.add(npc.group);
}
