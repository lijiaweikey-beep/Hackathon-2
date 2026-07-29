import { createSupermarketCast } from "./actors.js";

const SHELVES = [
  [-6.2, -2.5, 2.4, 0.65],
  [0, -2.5, 2.4, 0.65],
  [6.2, -2.5, 2.4, 0.65],
  [-6.2, 2.2, 2.4, 0.65],
  [0, 2.2, 2.4, 0.65],
  [6.2, 2.2, 2.4, 0.65],
];

function createBox(THREE, size, material, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createShelf(THREE, x, z, index, products) {
  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({
    color: index % 2 ? 0x2c9b8f : 0xd58a46,
    roughness: 0.78,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: index % 2 ? 0x17685f : 0x88512c,
    roughness: 0.74,
  });
  const productMaterials = [0xe85d5d, 0xf2bf4a, 0x4cb7a5, 0x4f7fc4].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );

  [-2.25, 2.25].forEach((postX) => {
    group.add(createBox(THREE, [0.14, 1.72, 1.08], trim, [postX, 0.86, 0]));
  });
  [0.22, 0.74, 1.26].forEach((y, level) => {
    group.add(createBox(THREE, [4.65, 0.12, 1.16], frame, [0, y, 0]));
    [-1.65, -0.55, 0.55, 1.65].forEach((productX, slot) => {
      const product = createBox(
        THREE,
        [0.36, 0.36 + ((slot + level) % 2) * 0.12, 0.42],
        productMaterials[(index + level + slot) % productMaterials.length],
        [productX, y + 0.24, (slot % 2 ? 1 : -1) * 0.18],
      );
      product.castShadow = false;
      products.push(product);
      group.add(product);
    });
  });
  group.position.set(x, 0, z);
  return group;
}

function createCheckout(THREE, scene) {
  const group = new THREE.Group();
  const counterMaterial = new THREE.MeshStandardMaterial({
    color: 0x315264,
    roughness: 0.68,
  });
  const beltMaterial = new THREE.MeshStandardMaterial({
    color: 0x162833,
    roughness: 0.58,
  });
  [-7.4, 7.4].forEach((x) => {
    group.add(createBox(THREE, [4.2, 0.78, 1.15], counterMaterial, [x, 0.4, 6.25]));
    group.add(createBox(THREE, [2.5, 0.05, 0.76], beltMaterial, [x, 0.82, 6.25]));
    group.add(createBox(THREE, [0.42, 1.35, 0.42], counterMaterial, [x + 1.65, 0.68, 6.25]));
  });
  scene.add(group);
  return group;
}

function addLighting(THREE, scene) {
  scene.add(new THREE.HemisphereLight(0xfff8e7, 0x50616a, 2.15));
  const key = new THREE.DirectionalLight(0xfff2d2, 2.35);
  key.position.set(-5, 13, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const fixtureMaterial = new THREE.MeshBasicMaterial({ color: 0xfff4cf });
  [-7.5, -2.5, 2.5, 7.5].forEach((x) => {
    const fixture = createBox(THREE, [3.2, 0.08, 0.28], fixtureMaterial, [x, 5.2, -0.2]);
    fixture.castShadow = false;
    fixture.receiveShadow = false;
    scene.add(fixture);
  });
}

export function createSupermarketWorld(host) {
  const THREE = host.rendering.THREE;
  const scene = host.rendering.createScene();
  scene.background = new THREE.Color(0xb8c8c4);
  const camera = host.rendering.createCamera({
    left: -12,
    right: 12,
    top: 7.5,
    bottom: -7.5,
    position: [0, 18, 13],
    lookAt: [0, 0, 0],
  });
  function resizeCamera(
    width = host.rendering.canvas?.clientWidth,
    height = host.rendering.canvas?.clientHeight,
  ) {
    if (!width || !height) return;
    const halfHeight = 7.5;
    const halfWidth = halfHeight * (width / height);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  resizeCamera();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0xd8d0bf, roughness: 0.94 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(24, 24, 0xb7ab95, 0xc9bfad);
  grid.position.y = 0.012;
  scene.add(grid);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xeee7d7,
    roughness: 0.88,
  });
  scene.add(
    createBox(THREE, [24, 3.2, 0.3], wallMaterial, [0, 1.6, -7.85]),
    createBox(THREE, [0.3, 3.2, 16], wallMaterial, [-11.85, 1.6, 0]),
    createBox(THREE, [0.3, 3.2, 16], wallMaterial, [11.85, 1.6, 0]),
  );
  addLighting(THREE, scene);

  const products = [];
  SHELVES.forEach(([x, z], index) => {
    scene.add(createShelf(THREE, x, z, index, products));
  });
  const checkout = createCheckout(THREE, scene);
  const exitMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.5,
    roughness: 0.62,
  });
  const exit = createBox(THREE, [4.2, 0.12, 0.8], exitMaterial, [0, 0.08, 7.2]);
  const statusLight = new THREE.PointLight(0xdc2626, 2.8, 7);
  statusLight.position.set(0, 2.6, 6.7);
  const sign = createBox(
    THREE,
    [2.4, 0.65, 0.16],
    new THREE.MeshStandardMaterial({
      color: 0x173544,
      emissive: 0x0d2835,
      emissiveIntensity: 0.8,
    }),
    [0, 2.45, 7],
  );
  sign.castShadow = false;
  exit.userData.statusLight = statusLight;
  scene.add(exit, statusLight, sign);

  const cast = createSupermarketCast(scene);
  cast.customers.forEach((customer, index) => {
    customer.rotation.y = index < 7 ? Math.PI : 0;
  });

  function setExitOpen(open) {
    const color = open ? 0x22c55e : 0xdc2626;
    exit.material.color.setHex(color);
    exit.material.emissive.setHex(open ? 0x14532d : 0x7f1d1d);
    statusLight.color.setHex(color);
  }

  return {
    scene,
    camera,
    shelves: SHELVES,
    products,
    checkout,
    exit,
    ...cast,
    resizeCamera,
    setExitOpen,
  };
}
