export function setBlackEye(npc, intensity) {
  npc.marked = true;
  npc.markIntensity = Math.max(npc.markIntensity, intensity);
  const i = npc.markIntensity;
  npc.group.userData.blackMarks.forEach((mesh) => {
    mesh.material.opacity = 0.58 + i * 0.42;
    const base = mesh.userData.isTopView ? 1.05 : 0.9;
    mesh.scale.setScalar(base + i * 0.7);
  });
}

export function setLipstick(npc, intensity) {
  npc.marked = true;
  npc.markIntensity = Math.max(npc.markIntensity, intensity);
  npc.group.userData.lipMarks.forEach((mesh) => {
    mesh.material.opacity = 0.25 + npc.markIntensity * 0.75;
    mesh.scale.set(1 + npc.markIntensity * 2.8, 1 + npc.markIntensity * 1.8, 1);
  });
}

export function setRedTie(npc, intensity) {
  npc.marked = true;
  npc.markIntensity = Math.max(npc.markIntensity, intensity);
  const tie = npc.group.userData.tieMark;
  if (!tie) return;
  tie.material.opacity = 0.6 + npc.markIntensity * 0.4;
  tie.scale.set(1, 1 + npc.markIntensity * 0.3, 1);
}
