import { renderSuShiShadowMarkHtml } from "../../entities/templeShadows.js";
import { createNpc, createPlayer } from "./actors.js";
import { createTempleLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "temple",
  order: 40,
  legacy: false,
  createLevel: createTempleLevel,
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  worldProfile: {
    background: 0x0c1320,
    fog: { color: 0x0c1320, near: 16, far: 35 },
    hemisphere: { sky: 0x3a4d6b, ground: 0x0a0e16, intensity: 1.2 },
    ambient: { color: 0x4466aa, intensity: 0.35 },
    directional: { color: 0x9fc4ff, intensity: 1.3 },
    floor: { texture: "temple", roughness: 0.78 },
  },
  actions: ["configureDecoy", "updateDecoy", "afterNpcUpdate", "actorDissolved"],
  decoyCount: 5,
  moonDecoyCount: 3,
  sceneName: "承天寺夜游",
  emoji: "🌕",
  cardStyle: {
    accent: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.28)",
  },
  cardDesc: ({ npcCount }) => `在 ${npcCount} 个苏轼影分身里找出真正吵醒怀民的苏轼`,
  mission: "苏轼夜半叫醒张怀民，又把中庭所有人都变成苏轼的样子。先找到自己，再找出真正的苏轼。",
  hudMission: "观察月下显形线索，找出真正的苏轼。",
  clue: "目标特征：会在月色最亮的中庭停留，脚下竹柏影会像藻荇一样交横聚拢",
  hudClue: "目标特征：月光中庭停留时，脚下会聚起交横竹柏影",
  targetDesc: "真正的苏轼",
  difficulty: 3,
  success: "精准命中，怀民终于能回去睡觉了。",
  failure: "苏轼月下散步爽了，怀民彻底睡不着了",
  lighting: "night",
  mechanicHintHtml: `
    <div class="mechanic-hint-row"><span class="mechanic-hint-label">任务</span><span class="mechanic-hint-text">找出真正吵醒怀民的苏轼。</span></div>
    <div class="mechanic-hint-row"><span class="mechanic-hint-label">机制</span><span class="mechanic-hint-text">苏轼只在月光中庭显影，假影也会短暂干扰。</span></div>
    <div class="mechanic-hint-row"><span class="mechanic-hint-label">特征</span>${renderSuShiShadowMarkHtml()}<span class="mechanic-hint-text">真苏轼脚下是这组交错竹柏影。</span></div>
  `,
};
