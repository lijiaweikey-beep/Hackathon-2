import { createNpc, createPlayer } from "./actors.js";
import { createLibraryLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "library",
  order: 20,
  legacy: false,
  createLevel: createLibraryLevel,
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  worldProfile: {
    floor: { texture: "library", roughness: 0.78 },
  },
  actions: ["findHitTarget"],
  decoyCount: 4,
  sceneName: "图书馆",
  emoji: "📚",
  cardStyle: {
    accent: "#2dd4bf",
    glow: "rgba(45, 212, 191, 0.28)",
  },
  cardDesc: ({ npcCount }) => `在 ${npcCount} 人中找到图书馆里亲嘴的情侣`,
  mission: "图书馆里有一对情侣在亲嘴，太辣眼睛了！",
  clue: "目标特征：两个人贴在一起，嘴上有口红印",
  targetDesc: "亲嘴的情侣",
  difficulty: 3,
  success: "精准命中，图书馆恢复了该有的安静。",
  failure: "这对情侣亲爽了",
  lighting: "library",
};
