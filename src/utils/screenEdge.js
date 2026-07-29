import * as THREE from "three";

/** 屏幕边缘禁行带宽（相对屏幕宽/高的比例）。 */
export const SCREEN_EDGE_BAND = 0.02;

const scratchNdc = new THREE.Vector3();
const scratchOrigin = new THREE.Vector3();
const scratchFar = new THREE.Vector3();
const scratchTarget = new THREE.Vector3();

/**
 * 将世界坐标投影到 NDC（x/y ∈ [-1, 1]，+y 为屏幕上方）。
 */
export function projectWorldToNdc(position, camera, out = scratchNdc) {
  out.set(position.x, position.y ?? 0, position.z).project(camera);
  return out;
}

/**
 * 是否落在屏幕边缘带：左右 0–2% / 98–100%，上下 0–2% / 98–100%。
 */
export function isInScreenEdgeBand(ndcX, ndcY, band = SCREEN_EDGE_BAND) {
  const threshold = 1 - band * 2;
  return Math.abs(ndcX) >= threshold || Math.abs(ndcY) >= threshold;
}

/**
 * NDC 点射线与地面 y=0 求交，得到世界 xz。
 */
export function unprojectNdcToGround(ndcX, ndcY, camera, out = scratchTarget) {
  scratchOrigin.set(ndcX, ndcY, -1).unproject(camera);
  scratchFar.set(ndcX, ndcY, 1).unproject(camera);
  const dx = scratchFar.x - scratchOrigin.x;
  const dy = scratchFar.y - scratchOrigin.y;
  const dz = scratchFar.z - scratchOrigin.z;
  if (Math.abs(dy) < 1e-8) {
    return out.set(scratchOrigin.x, 0, scratchOrigin.z);
  }
  const t = -scratchOrigin.y / dy;
  return out.set(scratchOrigin.x + dx * t, 0, scratchOrigin.z + dz * t);
}

/**
 * 若位置在屏幕边缘带内，将 direction2（x→世界 x，y→世界 z）设为朝屏幕中心离开的方向。
 * @returns {boolean} 是否触发了驱离
 */
export function steerAwayFromScreenEdge(
  position,
  camera,
  direction2,
  band = SCREEN_EDGE_BAND,
) {
  if (!camera || !direction2) return false;

  const ndc = projectWorldToNdc(position, camera);
  if (!isInScreenEdgeBand(ndc.x, ndc.y, band)) return false;

  unprojectNdcToGround(0, 0, camera, scratchTarget);
  const vx = scratchTarget.x - position.x;
  const vz = scratchTarget.z - position.z;
  const len = Math.hypot(vx, vz);
  if (len < 1e-6) {
    // 已在中心投影点附近：按越界轴硬推。
    let pushX = 0;
    let pushZ = 0;
    const threshold = 1 - band * 2;
    if (ndc.x <= -threshold) pushX = 1;
    else if (ndc.x >= threshold) pushX = -1;
    if (ndc.y >= threshold) pushZ = 1;
    else if (ndc.y <= -threshold) pushZ = -1;
    direction2.set(pushX || 0, pushZ || 1).normalize();
    return true;
  }

  direction2.set(vx / len, vz / len);
  return true;
}
