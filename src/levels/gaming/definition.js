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
  actions: [
    "beforeAttack",
    "findHitTarget",
    "hitTarget",
    "attackMiss",
    "getHudState",
    "getResultStats",
    "beginPlay",
  ],
  decoyCount: 0,
  sceneName: "宿舍教学",
  axisLabel: "我要睡觉！",
  entryTitle: "凌晨三点",
  emoji: "⌨️",
  art,
  nodes: {
    S: { title: "作息纠察队长", verdict: "一拳到位，宿舍在三点零一分恢复安静。" },
    A: { title: "熄灯前的正义", verdict: "稍微绕了点路，但带圆环的舍友总算安静了。" },
    B: { title: "摸黑找人的", verdict: "人是找到了，天也快亮了。" },
    C: { title: "陪打到天亮", verdict: "你没抓到人，反而看完了整段通宵对局。" },
  },
  cardStyle: {
    accent: "#818cf8",
    glow: "rgba(129, 140, 248, 0.28)",
  },
  cardDesc: "新手报到：半夜不睡的舍友太闹了！",
  mission: "学习移动与出拳：走到光圈处，教训带圆环的舍友！",
  hudMission: "走到绿色光圈处",
  clue: "新手提示：根据画面指示进行操作",
  traits: ["外圈圆环", "凌晨三点未眠"],
  targetDesc: "带圆环的舍友",
  difficulty: 0,
  success: "宿舍终于安静了。新手报到完成！",
  failure: "教学关不会失败，再试一次。",
  transition: {
    intro: "十九岁，第一次离开家住进宿舍，也第一次发现青春会在凌晨三点吵得人睡不着。",
    success: "宿舍终于安静。两年后，梗哥走进了图书馆。",
  },
  storyIntro: [
    "十九岁，第一次离家住进宿舍。",
    "凌晨三点，竟然还有人不睡觉！",
    "岂有此理！！别让我逮到你！！",
  ],
  lighting: "night",
  mode: "tutorial",
  tutorialSteps: {
    moveTargetPos: { x: 0.4, z: 6.6 },
    moveRadius: 1.0,
  },
  timeLimit: null,
  attackComboExpires: false,
  initialHp: 999,
  npcCount: 6,
};
