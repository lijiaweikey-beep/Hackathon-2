import * as THREE from "three";
import {
  getCachedTexture,
  makeFloorTexture,
  makeWallTexture,
  textureCache,
} from "./textures.js";

export function createWorldBuilder(ctx) {
  function addWall(x, z, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 6.8), material);
  wall.position.set(x, 3.4, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  ctx.getScene().add(wall);
}

  function buildWorld(level) {
  const profile = level.worldProfile ?? {};
  const isNight = level.lighting === "night";
  const background = profile.background ?? (isNight ? 0x0c1320 : 0xb9d6e7);
  const fog = profile.fog ?? {
    color: isNight ? 0x0c1320 : 0xc8e3f0,
    near: 16,
    far: 35,
  };
  const hemisphere = profile.hemisphere ?? {
    sky: isNight ? 0x3a4d6b : 0xffffff,
    ground: isNight ? 0x0a0e16 : 0xa98f6b,
    intensity: isNight ? 1.2 : 1.42,
  };
  const directional = profile.directional ?? {
    color: isNight ? 0x9fc4ff : 0xfff7d6,
    intensity: isNight ? 1.3 : 1.65,
  };
  const floorProfile = profile.floor ?? {};
  ctx.getScene().background = new THREE.Color(background);
  ctx.getScene().fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const hemi = new THREE.HemisphereLight(
    hemisphere.sky,
    hemisphere.ground,
    hemisphere.intensity,
  );
  ctx.getScene().add(hemi);

  const ambientProfile = profile.ambient
    ?? (isNight ? { color: 0x4466aa, intensity: 0.35 } : null);
  if (ambientProfile) {
    const ambient = new THREE.AmbientLight(ambientProfile.color, ambientProfile.intensity);
    ctx.getScene().add(ambient);
  }

  const sun = new THREE.DirectionalLight(
    directional.color,
    directional.intensity,
  );
  sun.position.set(-5, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  ctx.getScene().add(sun);

  const mapId = floorProfile.texture ?? level.id;
  const floorTex = getCachedTexture(textureCache.floor, mapId, () => makeFloorTexture(mapId));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 28),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: floorProfile.roughness ?? 0.78,
      metalness: 0.02,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  ctx.getScene().add(floor);

  ctx.getLevelState().sceneData = level.extensions?.createWorld?.({
    THREE,
    scene: ctx.getScene(),
    state: ctx.getLevelState(),
    registerObstacle: ctx.registerObstacle,
    randomRange: ctx.randomRange,
    addWall,
    collidesWithObstacle: ctx.collidesWithObstacle,
    createLightningBolt: ctx.createLightningBolt,
    npcCount: ctx.getMatchNpcCount(),
    textures: {
      getWallTexture: (id) => getCachedTexture(
        textureCache.wall,
        id,
        () => makeWallTexture(id),
      ),
    },
    baseLight: sun,
  }) ?? null;
}

  return {
    buildWorld,
  };
}
