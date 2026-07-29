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
  mission: "踩绿色开关关闭主灯，借移动探照灯辨认鸭腿与鹅腿。",
  hudMission: "踩绿色开关熄灯，跟着探照灯找出不发绿的目标。",
  clue: "鸭腿进入探照灯会泛绿，鹅腿始终不亮；绿色开关可以关闭主灯",
  hudClue: "踩绿色开关进入暗场；鸭腿遇光泛绿，鹅腿不亮",
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
