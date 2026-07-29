import { createNpc } from "./actors.js";

export function createPreviewModel() {
  return { background: 0x1a2332 };
}

// 任务卡图片指引：直接展示戴红领带的老板本人
export function renderPreview({ scene }) {
  const boss = createNpc(0, { isBoss: true, levelTarget: true });
  boss.group.rotation.y = -0.35;
  scene.add(boss.group);
}
