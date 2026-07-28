import { BLOODMOON_SANITY_MAX } from "./constants.js";
import { createNpc, createPlayer } from "./actors.js";
import { createBloodmoonLevel } from "./createLevel.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

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
  lighting: "bloodmoon",
};
