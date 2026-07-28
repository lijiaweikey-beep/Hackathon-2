export function createWorld({ THREE, scene }) {
  const marker = new THREE.Group();
  marker.name = "sample-level";
  scene.add(marker);
  return { marker };
}
