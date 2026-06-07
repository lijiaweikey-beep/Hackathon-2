import * as THREE from "three";
import { CAMERA_BASE_POS } from "../config/constants.js";

export function createFxSystem({ ui, getPlayer }) {
  let hitstopTimer = 0;
  let shakeTimer = 0;
  let shakeIntensity = 0;
  let damageFlashTimer = 0;
  const cameraBasePos = new THREE.Vector3(CAMERA_BASE_POS.x, CAMERA_BASE_POS.y, CAMERA_BASE_POS.z);

  return {
    get hitstopTimer() { return hitstopTimer; },
    set hitstopTimer(value) { hitstopTimer = value; },
    get damageFlashTimer() { return damageFlashTimer; },
    set damageFlashTimer(value) { damageFlashTimer = value; },
    get cameraBasePos() { return cameraBasePos; },

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
    },
  };
}
