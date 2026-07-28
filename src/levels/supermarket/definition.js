import { createSupermarketExperience } from "./createExperience.js";

export default {
  id: "supermarket",
  order: 40,
  track: "mainline",
  age: 25,
  sceneName: "超市取证",
  emoji: "📸",
  cardStyle: {
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.28)",
  },
  cardDesc: "藏在货架后抓拍四张证据，再从收银通道撤离",
  mission: "利用人群和货架隐藏自己，拍下四张亲密照片后安全撤离。",
  clue: "目标互动、视线无遮挡且相机发光时才能成功抓拍",
  targetDesc: "出轨情侣",
  difficulty: 4,
  success: "四张证据到手。二十五岁的真相，终于不用再自我怀疑。",
  failure: "警戒值拉满，目标发现了你并离开超市。",
  transition: {
    intro: "二十五岁，有些真相藏在日常货架之间，越靠近越不敢相信。",
    success: "证据拍下，出口亮起。两年后，职场又把另一口锅扔向了梗哥。",
  },
  extensions: {
    createExperience: createSupermarketExperience,
  },
};
