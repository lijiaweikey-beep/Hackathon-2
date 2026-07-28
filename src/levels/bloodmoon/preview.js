import { createBloodmoonClawCue } from "../../entities/bloodmoonCues.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";
import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";

export function createPreviewModel() {
  return { background: 0x21060b };
}

export function renderPreview({ scene }) {
  const cue = createBloodmoonClawCue(1);
  cue.position.set(0, 0.045, 0.16);
  scene.add(cue);

  const actor = createLowPolyPerson(LOW_POLY_NPC_PALETTES[2]);
  actor.group.rotation.y = -0.35;
  scene.add(actor.group);
}
