import { renderSuShiShadowMarkHtml } from "../../entities/templeShadows.js";
import { createNpc, createPlayer } from "./actors.js";
import { createTempleLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

const extraCover = new URL("../../assets/extra-cover.jpg", import.meta.url).href;
const art = {
  cover: extraCover,
  grades: { S: extraCover, A: extraCover, B: extraCover, C: extraCover },
};

export default {
  id: "temple",
  order: 100,
  track: "extra",
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
  axisLabel: "就你喊张怀民起床的？",
  emoji: "🌕",
  art,
  nodes: {
    S: { title: "怀民亦未寝", verdict: "一眼认出真身，怀民终于能回去睡了。" },
    A: { title: "月下辨影人", verdict: "等月光转了两回，你才确定是他。" },
    B: { title: "竹柏影里绕路", verdict: "人是找到了，中庭也被你转了一圈。" },
    C: { title: "陪苏轼溜达", verdict: "你没找到苏轼，只是陪他溜达到天亮。" },
  },
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
  storyIntro: [
    "元丰六年十月十二日夜，怀民刚要入睡。",
    "满院苏轼，竟然个个都说自己是真的！",
    "假苏轼！！别让我逮到你！！",
  ],
  lighting: "night",
  mechanicHintHtml: `
    <div class="mechanic-hint-row"><span class="mechanic-hint-label">任务</span><span class="mechanic-hint-text">找出真正吵醒怀民的苏轼。</span></div>
    <div class="mechanic-hint-row"><span class="mechanic-hint-label">机制</span><span class="mechanic-hint-text">苏轼只在月光中庭显影，假影也会短暂干扰。</span></div>
    <div class="mechanic-hint-row"><span class="mechanic-hint-label">特征</span>${renderSuShiShadowMarkHtml()}<span class="mechanic-hint-text">真苏轼脚下是这组交错竹柏影。</span></div>
  `,
};
