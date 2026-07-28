import { createSuShiShadowCue } from "../../entities/templeShadows.js";
import { createTemplePerson } from "../../entities/templePerson.js";

export function createPreviewModel() {
  return { background: 0x0c1424 };
}

export function renderPreview({ scene }) {
  const cue = createSuShiShadowCue(1);
  cue.position.set(0, 0.045, 0.08);
  scene.add(cue);

  const actor = createTemplePerson("bamboo", 0);
  actor.group.rotation.y = -0.35;
  scene.add(actor.group);
}
