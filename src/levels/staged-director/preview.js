import { createNpc } from "./actors.js";

export function createPreviewModel({ THREE } = {}) {
  if (!THREE) return { background: 0x102033 };
  const group = new THREE.Group();
  group.userData.previewRole = "staged-director";
  const director = createNpc(0, {
    role: "director",
    directorTarget: true,
    levelTarget: true,
    directorActive: true,
  });
  director.group.rotation.y = -0.35;
  group.add(director.group);
  return group;
}

export function renderPreview({ scene }) {
  const director = createNpc(0, {
    role: "director",
    directorTarget: true,
    levelTarget: true,
    directorActive: true,
  });
  director.group.rotation.y = -0.35;
  scene.add(director.group);
}
