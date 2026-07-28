import { createNpc, createPlayer } from "./actors.js";
import { createGamingLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "gaming",
  order: 10,
  legacy: false,
  createLevel: createGamingLevel,
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  worldProfile: {
    background: 0x0c1320,
    fog: { color: 0x0c1320, near: 42, far: 78 },
    hemisphere: { sky: 0x3a4d6b, ground: 0x0a0e16, intensity: 0.3 },
    ambient: { color: 0x4466aa, intensity: 0.04 },
    directional: { color: 0x9fc4ff, intensity: 0.42 },
    floor: { texture: "gaming", roughness: 0.58 },
  },
  decoyCount: 3,
  sceneName: "凌晨三点",
  emoji: "🌙",
  cardDesc: ({ npcCount }) => `在 ${npcCount} 人中找到凌晨三点还在打游戏的人`,
  mission: "有人凌晨三点还在打游戏，吵得全宿舍睡不着！",
  clue: "目标特征：有明显黑眼圈",
  targetDesc: "打游戏的人",
  difficulty: 2,
  success: "精准命中，宿舍终于安静了。",
  failure: "这个人游戏打爽了，大家都被吵醒了",
  lighting: "night",
};
