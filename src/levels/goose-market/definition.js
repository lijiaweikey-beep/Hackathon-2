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
  actions: [
    "beforeAttack",
    "getHudState",
    "getResultStats",
    "hitTarget",
  ],
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
  npcCountText: "13–15",
  resourceLabel: "🥊 挥拳",
  resourceInitial: "∞",
  sceneName: "以鸭戴鹅",
  emoji: "🍗",
  cardStyle: {
    accent: "#a3e635",
    glow: "rgba(163, 230, 53, 0.25)",
  },
  cardDesc: "10 位鹅腿干扰中，打爆随机出现的 3–5 位鸭腿阿姨",
  mission: "踩随机刷新的绿色开关熄灯 5 秒，借探照灯找出并打爆全部发绿的鸭腿阿姨。",
  hudMission: "踩绿色开关熄灯 5 秒，打爆全部发绿的鸭腿阿姨。",
  clue: "鸭腿进入探照灯会泛绿，鹅腿始终不亮；误打鹅腿会延迟下一拳",
  hudClue: "鸭腿遇光泛绿，鹅腿不亮；打爆全部鸭腿才通关",
  targetDesc: "卖鸭腿的阿姨",
  difficulty: 3,
  success: "鸭腿阿姨全部打爆，毕业前最后一顿夜宵终于清静了。",
  failure: "夜市散场前，你没能打爆全部鸭腿阿姨。",
  transition: {
    intro: "二十三岁，毕业前的夜市挤满了相似的摊位，真假只在灯光扫过时露馅。",
    success: "鸭腿摊安静下来。两年后，梗哥在超市里撞见了更难直视的真相。",
  },
  lighting: "night",
};
