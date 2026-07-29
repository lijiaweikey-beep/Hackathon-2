import { createNpc, createPlayer } from "./actors.js";
import { createLibraryLevel } from "./createLevel.js";
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
  id: "library",
  order: 20,
  track: "mainline",
  age: 21,
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
  art,
  nodes: {
    S: { title: "自习室风纪委员", verdict: "一击即中，图书馆恢复了该有的安静。" },
    A: { title: "假装在找书", verdict: "绕了两圈才动手，好在没惊动太多人。" },
    B: { title: "翻错了三本书", verdict: "人是抓到了，安静没抓回来。" },
    C: { title: "围观全程的那个人", verdict: "你什么都没做，只是把全程看完了。" },
  },
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
  transition: {
    intro: "二十一岁，知识很安静，爱情却总爱在书架后面发出声音。",
    success: "图书馆恢复安静。毕业前的夜市，又飘来一股真假难辨的香味。",
  },
  lighting: "library",
};
