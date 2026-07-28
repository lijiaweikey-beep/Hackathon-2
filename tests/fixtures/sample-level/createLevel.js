import { playSampleIntro } from "./audio.js";
import { hideSampleIntro, showSampleIntro } from "./view.js";

export function createSampleLevel(context) {
  let target;

  return {
    start() {
      target = context.actors.createNpc(0, { levelTarget: true });
      context.actors.addNpc(target);
    },
    update() {},
    handleAction(action) {
      if (action.type === "beginPlay") {
        playSampleIntro(context.audio);
        showSampleIntro(context.ui);
        return { handled: true };
      }
      if (action.type === "findHitTarget") {
        return context.combat.isFacingTarget(target) ? target : null;
      }
      return undefined;
    },
    destroy() {
      hideSampleIntro(context.ui);
      target = null;
    },
  };
}
