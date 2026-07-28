import { createSampleLevel } from "./createLevel.js";
import { createNpc, createPlayer } from "./actors.js";
import { createPreviewModel, renderPreview } from "./preview.js";
import { createWorld } from "./world.js";

export default {
  id: "sample",
  sceneName: "样例关卡",
  order: 999,
  hidden: true,
  createLevel: createSampleLevel,
  actions: ["beginPlay", "findHitTarget"],
  extensions: {
    createWorld,
    createPlayer,
    createNpc,
    createPreviewModel,
    renderPreview,
  },
};
