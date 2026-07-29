import { BLOODMOON_SANITY_MAX } from "./constants.js";
import { createNpc, createPlayer } from "./actors.js";
import { createBloodmoonLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

const extraCover = new URL("../../assets/extra-cover.jpg", import.meta.url).href;
const art = {
  cover: extraCover,
  grades: { S: extraCover, A: extraCover, B: extraCover, C: extraCover },
};

export default {
  id: "bloodmoon",
  order: 110,
  track: "extra",
  legacy: false,
  createLevel: createBloodmoonLevel,
  extensions: { createWorld, createPlayer, createNpc, createPreviewModel, renderPreview },
  worldProfile: {
    background: 0x21060b,
    fog: { color: 0x3b0710, near: 16, far: 30 },
    hemisphere: { sky: 0x6d1a25, ground: 0x120406, intensity: 0.95 },
    ambient: { color: 0x6f1720, intensity: 0.52 },
    directional: { color: 0xff6b6b, intensity: 1.55 },
    floor: { texture: "bloodmoon", roughness: 0.78 },
  },
  actions: [
    "beforeAttack",
    "hitTarget",
    "afterNpcUpdate",
    "actorDissolved",
    "beginPlay",
    "beginSpecialPhase",
    "getHudState",
    "getResultStats",
  ],
  timeLimit: null,
  resourceLabel: "理智",
  resourceInitial: BLOODMOON_SANITY_MAX,
  attackComboExpires: false,
  decoyCount: 6,
  sceneName: "血月街区",
  emoji: "🌕",
  art,
  nodes: {
    S: { title: "血月下的神枪手", verdict: "电光一闪你就出手，狼影当场退潮。" },
    A: { title: "认得出你", verdict: "理智掉了一些，但你还是赶到了。" },
    B: { title: "半狼半人", verdict: "人找到了，狼耳朵还没收回去。" },
    C: { title: "整条街的狼影", verdict: "雷声盖过了那句求救，你还站在血月里。" },
  },
  cardStyle: {
    accent: "#fb7185",
    glow: "rgba(248, 113, 113, 0.28)",
  },
  cardDesc: ({ npcCount }) => `在 ${npcCount} 人中找出血月引路人`,
  mission: "血月升起，你收到一句求救：“别让我在血月里认不出你。”为了赶到对方身边，你主动踏进血月，变成狼人模样。找出伪装在人群里的血月引路人，击倒他，解除狼化。",
  hudMission: "为了你，我变成狼人模样。找出血月引路人。",
  clue: "电光照亮时，真正的血月引路人脚下会露出狼爪影",
  hudClue: "电光照亮时，真正的血月引路人脚下会露出狼爪影。",
  targetDesc: "血月引路人",
  difficulty: 3,
  success: "血月退潮，你终于把自己的影子从狼形里拽了回来。",
  failure: "雷声盖过了那句求救，整条街都开始长出狼影。",
  storyIntro: [
    "血月当空，整条街都在长出狼影。",
    "人群里，竟然混着真正的引路人！",
    "狼人！！别让我逮到你！！",
  ],
  lighting: "bloodmoon",
};
