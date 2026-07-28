export function createWorld({ THREE, scene }) {
  const marker = new THREE.Group();
  marker.name = "sample-level";
  scene.add(marker);
  return { marker };
}

export function createPlayer() {
  return null;
}

export function createNpc() {
  return null;
}

export function createPreviewModel() {
  return null;
}

export function renderPreview() {}
