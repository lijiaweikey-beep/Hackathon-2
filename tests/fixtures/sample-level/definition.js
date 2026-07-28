import { createSampleLevel } from "./createLevel.js";
import {
  createNpc,
  createPlayer,
  createPreviewModel,
  createWorld,
  renderPreview,
} from "./extensions.js";

export default {
  id: "sample",
  sceneName: "样例关卡",
  order: 999,
  hidden: true,
  createLevel: createSampleLevel,
  actions: ["findHitTarget"],
  extensions: {
    createWorld,
    createPlayer,
    createNpc,
    createPreviewModel,
    renderPreview,
  },
};
