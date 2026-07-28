import { setBlackEye } from "../../entities/marks.js";
import { createNpc } from "./actors.js";

export function createPreviewModel() {
  return { background: 0x0c1424 };
}

export function renderPreview({ scene }) {
  const npc = createNpc(0, { gamingTarget: true }, () => 0.5);
  setBlackEye(npc, 1);
  scene.add(npc.group);
}
