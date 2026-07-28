import { createNpc, createPlayer } from "./actors.js";
import { createGooseMarketLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "goose-market",
  order: 30,
  track: "mainline",
  age: 23,
  createLevel: createGooseMarketLevel,
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  worldProfile: {
    background: 0x07111f,
    fog: { color: 0x07111f, near: 28, far: 52 },
    hemisphere: { sky: 0x234366, ground: 0x080b12, intensity: 0.55 },
    ambient: { color: 0x335577, intensity: 0.16 },
    directional: { color: 0xffd37a, intensity: 0.72 },
    floor: { texture: "gaming", roughness: 0.86 },
  },
  decoyCount: 4,
  sceneName: "以鸭戴鹅",
  emoji: "🍗",
  cardStyle: {
    accent: "#a3e635",
    glow: "rgba(163, 230, 53, 0.25)",
  },
  cardDesc: ({ npcCount }) => `在 ${npcCount} 位夜市阿姨中找出卖鹅腿的人`,
  mission: "鸭腿被路灯照到会泛绿，鹅腿不会。找到卖鹅腿的阿姨！",
  hudMission: "跟着移动路灯观察手里的腿，找出不发绿的目标。",
  clue: "目标特征：腿被路灯照到时始终不会发出绿色轮廓",
  hudClue: "鸭腿遇光泛绿，鹅腿不亮；遮挡时多观察一次",
  targetDesc: "卖鹅腿的阿姨",
  difficulty: 3,
  success: "鹅腿找到了，毕业前最后一顿夜宵终于没有认错。",
  failure: "灯光晃过去，你还是把鸭腿当成了鹅腿。",
  transition: {
    intro: "二十三岁，毕业前的夜市挤满了相似的摊位，真假只在灯光扫过时露馅。",
    success: "夜市散场。两年后，梗哥在超市里撞见了更难直视的真相。",
  },
  lighting: "night",
};
