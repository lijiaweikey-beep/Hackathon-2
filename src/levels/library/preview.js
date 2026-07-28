import { LOW_POLY_NPC_PALETTES } from "../../entities/palettes.js";
import { createLowPolyPerson } from "../../entities/lowPolyPerson.js";

export function createPreviewModel() {
  return { background: 0xd0dce8 };
}

export function renderPreview({ scene }) {
  const left = createLowPolyPerson(LOW_POLY_NPC_PALETTES[0]);
  const right = createLowPolyPerson(LOW_POLY_NPC_PALETTES[1]);
  left.group.position.set(-0.32, 0, 0);
  right.group.position.set(0.32, 0, 0);
  left.group.rotation.y = 0.5;
  right.group.rotation.y = -0.5;
  [left, right].forEach((actor) => {
    actor.group.userData.lipMarks.forEach((mark) => {
      mark.material = mark.material.clone();
      mark.material.opacity = 0.9;
      mark.scale.set(3.8, 2.8, 1);
    });
  });
  scene.add(left.group, right.group);
}
