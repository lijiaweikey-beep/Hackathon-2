import * as THREE from "three";
import { CAMERA_BASE_POS } from "../config/constants.js";

export function createFxSystem({
  ui,
  getPlayer,
  getScene = () => null,
  randomRange = (min, max) => min + Math.random() * (max - min),
}) {
  let hitstopTimer = 0;
  let shakeTimer = 0;
  let shakeIntensity = 0;
  let damageFlashTimer = 0;
  const particles = [];
  const pixelGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.13);
  const pixelMaterials = new Map();
  const cameraBasePos = new THREE.Vector3(CAMERA_BASE_POS.x, CAMERA_BASE_POS.y, CAMERA_BASE_POS.z);

  return {
    get hitstopTimer() { return hitstopTimer; },
    set hitstopTimer(value) { hitstopTimer = value; },
    get damageFlashTimer() { return damageFlashTimer; },
    set damageFlashTimer(value) { damageFlashTimer = value; },
    get cameraBasePos() { return cameraBasePos; },

    isCachedPixelMaterial(material) {
      return [...pixelMaterials.values()].includes(material);
    },

    createPixelBurst(actor) {
      const scene = getScene();
      if (!scene) return;
      const colors = actor.group.userData.colors
        ?? [0x4b5563, 0x9ca3af, 0xf0b88c, 0x1f2937, 0xe5e7eb];
      for (let index = 0; index < 58; index += 1) {
        const color = colors[index % colors.length];
        let material = pixelMaterials.get(color);
        if (!material) {
          material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.7,
            transparent: true,
            opacity: 1,
          });
          pixelMaterials.set(color, material);
        }
        const cube = new THREE.Mesh(pixelGeometry, material);
        cube.position.set(
          actor.group.position.x + randomRange(-0.28, 0.28),
          randomRange(0.24, 1.74),
          actor.group.position.z + randomRange(-0.28, 0.28),
        );
        cube.rotation.set(
          randomRange(0, Math.PI),
          randomRange(0, Math.PI),
          randomRange(0, Math.PI),
        );
        cube.castShadow = true;
        scene.add(cube);
        particles.push({
          mesh: cube,
          velocity: new THREE.Vector3(
            randomRange(-1.8, 1.8),
            randomRange(1, 2.8),
            randomRange(-1.8, 1.8),
          ),
          spin: new THREE.Vector3(
            randomRange(-5, 5),
            randomRange(-5, 5),
            randomRange(-5, 5),
          ),
          life: randomRange(0.8, 1.35),
          maxLife: 1.35,
        });
      }
    },

    updateParticles(deltaSeconds) {
      const scene = getScene();
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= deltaSeconds;
        particle.velocity.y -= deltaSeconds * 2.6;
        particle.mesh.position.addScaledVector(particle.velocity, deltaSeconds);
        particle.mesh.rotation.x += particle.spin.x * deltaSeconds;
        particle.mesh.rotation.y += particle.spin.y * deltaSeconds;
        particle.mesh.rotation.z += particle.spin.z * deltaSeconds;
        const lifeRatio = Math.max(0, particle.life / particle.maxLife);
        particle.mesh.material.opacity = lifeRatio;
        particle.mesh.scale.setScalar(0.65 + lifeRatio * 0.6);
        if (particle.life <= 0) {
          scene?.remove(particle.mesh);
          particles.splice(index, 1);
        }
      }
    },

    clearParticles() {
      const scene = getScene();
      particles.forEach((particle) => scene?.remove(particle.mesh));
      particles.length = 0;
    },

    triggerHitstop(duration) {
      hitstopTimer = Math.max(hitstopTimer, duration);
    },

    triggerShake(intensity, duration) {
      shakeIntensity = intensity;
      shakeTimer = duration;
    },

    triggerDamageFx() {
      damageFlashTimer = 0.38;
      if (ui.damageFlash) {
        ui.damageFlash.classList.remove("active");
        void ui.damageFlash.offsetWidth;
        ui.damageFlash.classList.add("active");
      }
      const player = getPlayer();
      if (player?.group?.userData?.visual) {
        player.group.userData.damageFlash = 0.32;
      }
    },

    updateShake(dt, camera) {
      if (shakeTimer > 0) {
        shakeTimer -= dt;
        const decay = Math.max(0, shakeTimer / 0.2);
        const offsetX = (Math.random() - 0.5) * 2 * shakeIntensity * decay;
        const offsetY = (Math.random() - 0.5) * 2 * shakeIntensity * decay * 0.5;
        camera.position.set(cameraBasePos.x + offsetX, cameraBasePos.y + offsetY, cameraBasePos.z);
      } else {
        camera.position.copy(cameraBasePos);
      }
    },

    consumeHitstop(dt) {
      if (hitstopTimer <= 0) return false;
      hitstopTimer -= dt;
      return true;
    },

    reset() {
      hitstopTimer = 0;
      shakeTimer = 0;
      shakeIntensity = 0;
      damageFlashTimer = 0;
      this.clearParticles();
    },
  };
}
