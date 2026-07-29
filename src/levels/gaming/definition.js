import { createNpc, createPlayer } from "./actors.js";
import { createGamingLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

const art = {
  cover: new URL("./assets/cover.jpg", import.meta.url).href,
  grades: {
    S: new URL("./assets/grade-s.jpg", import.meta.url).href,
    A: new URL("./assets/grade-a.jpg", import.meta.url).href,
    B: new URL("./assets/grade-b.jpg", import.meta.url).href,
    C: new URL("./assets/grade-c.jpg", import.meta.url).href,
  },
};

export default {
  id: "gaming",
  order: 10,
  track: "mainline",
  age: 19,
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
  art,
  nodes: {
    S: { title: "作息纠察队长", verdict: "一拳到位，宿舍的夜终于安静了。" },
    A: { title: "熄灯前的正义", verdict: "有点狼狈，但你确实把人抓到了。" },
    B: { title: "摸黑找人的", verdict: "找是找到了，全宿舍也跟着醒了。" },
    C: { title: "陪打到天亮", verdict: "你没有赢，你只是也熬到了三点。" },
  },
  cardStyle: {
    accent: "#818cf8",
    glow: "rgba(129, 140, 248, 0.28)",
  },
  cardDesc: ({ npcCount }) => `在 ${npcCount} 人中找到凌晨三点还在打游戏的人`,
  mission: "有人凌晨三点还在打游戏，吵得全宿舍睡不着！",
  clue: "目标特征：有明显黑眼圈",
  targetDesc: "打游戏的人",
  difficulty: 2,
  success: "精准命中，宿舍终于安静了。",
  failure: "这个人游戏打爽了，大家都被吵醒了",
  transition: {
    intro: "十九岁，第一次离开家住进宿舍，也第一次发现青春会在凌晨三点吵得人睡不着。",
    success: "宿舍终于安静。两年后，梗哥走进了图书馆。",
  },
  lighting: "night",
};
