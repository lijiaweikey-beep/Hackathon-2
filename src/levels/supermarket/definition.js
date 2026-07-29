import { createSupermarketExperience } from "./createExperience.js";

export default {
  id: "supermarket",
  order: 40,
  track: "extra",
  sharedLayout: true,
  sceneName: "超市取证",
  axisLabel: "来人！捉奸！",
  emoji: "📸",
  cardStyle: {
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.28)",
  },
  cardDesc: "记住目标情侣，在超市中跟拍四张有效证据",
  mission: "先移动找到自己，记住开局标记的情侣，并拍下四张有效照片。",
  clue: "目标互动、两人同时入镜且没有货架遮挡时才能成功拍摄",
  targetDesc: "出轨情侣",
  resourceLabel: "照片",
  resourceInitial: "0 / 4",
  actionIcon: "📸",
  actionGuide: "相机按钮/空格 拍照",
  difficulty: 4,
  success: "四张证据到手。番外里的真相，终于不用再自我怀疑。",
  failure: "超市打烊前，你没能拍齐四张有效证据。",
  transition: {
    intro: "番外事件里，有些真相藏在日常货架之间，越靠近越不敢相信。",
    success: "四张证据拍下。超市里的疑点终于有了答案。",
  },
  extensions: {
    createExperience: createSupermarketExperience,
  },
};
