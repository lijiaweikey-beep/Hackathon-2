import * as THREE from "three";

export function setTutorialTargetRing(npc, enabled) {
  if (!npc?.group) return;
  if (enabled && !npc.tutorialAura) {
    const aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.045, 10, 36),
      new THREE.MeshBasicMaterial({
        color: 0xffb020,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 1.05;
    npc.group.add(aura);
    npc.tutorialAura = aura;
  } else if (!enabled && npc.tutorialAura) {
    npc.group.remove(npc.tutorialAura);
    npc.tutorialAura.geometry?.dispose?.();
    npc.tutorialAura.material?.dispose?.();
    npc.tutorialAura = null;
  }
}
