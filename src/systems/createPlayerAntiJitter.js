import * as THREE from "three";

const MOVE_EPSILON = 0.0004;
const REVERSE_DOT = -0.55;
const REVERSE_TRIGGER = 5;
const REVERSE_WINDOW_SECONDS = 0.45;
const LOCK_SECONDS = 1;
const FORCE_TURN = Math.PI / 2;

/**
 * 检测短时间内方向反复反转（贴边抖动特征），触发防抖：
 * 强制旋转 90°，停 1 秒再允许移动。
 */
export function createPlayerAntiJitter({
  reverseDot = REVERSE_DOT,
  reverseTrigger = REVERSE_TRIGGER,
  reverseWindowSeconds = REVERSE_WINDOW_SECONDS,
  lockSeconds = LOCK_SECONDS,
  forceTurn = FORCE_TURN,
} = {}) {
  const lastDirection = new THREE.Vector2();
  let hasDirection = false;
  let reverseCount = 0;
  let reverseAge = 0;
  let lockTimer = 0;

  function reset() {
    lastDirection.set(0, 0);
    hasDirection = false;
    reverseCount = 0;
    reverseAge = 0;
    lockTimer = 0;
  }

  function isLocked() {
    return lockTimer > 0;
  }

  function triggerLock(player, velocity) {
    lockTimer = lockSeconds;
    reverseCount = 0;
    reverseAge = 0;
    hasDirection = false;
    lastDirection.set(0, 0);
    if (velocity) velocity.set(0, 0);
    if (player?.group) player.group.rotation.y += forceTurn;
  }

  /** 仅推进锁定倒计时并清空速度 */
  function tickLock(velocity, deltaSeconds) {
    if (lockTimer <= 0) return false;
    lockTimer = Math.max(0, lockTimer - deltaSeconds);
    if (velocity) velocity.set(0, 0);
    return lockTimer > 0;
  }

  /**
   * 在本帧速度结算后调用，统计反向次数。
   * @returns {{ locked: boolean }}
   */
  function observe(player, velocity, deltaSeconds) {
    if (lockTimer > 0) {
      tickLock(velocity, deltaSeconds);
      return { locked: true };
    }

    if (reverseCount > 0) {
      reverseAge += deltaSeconds;
      if (reverseAge > reverseWindowSeconds) {
        reverseCount = 0;
        reverseAge = 0;
      }
    }

    if (!velocity || velocity.lengthSq() <= MOVE_EPSILON) {
      return { locked: false };
    }

    const currentX = velocity.x;
    const currentY = velocity.y;
    const length = Math.hypot(currentX, currentY);
    const nx = currentX / length;
    const ny = currentY / length;

    if (hasDirection && lastDirection.x * nx + lastDirection.y * ny <= reverseDot) {
      reverseCount += 1;
      reverseAge = 0;
      if (reverseCount >= reverseTrigger) {
        triggerLock(player, velocity);
        return { locked: true };
      }
    }

    lastDirection.set(nx, ny);
    hasDirection = true;
    return { locked: false };
  }

  return Object.freeze({
    reset,
    tickLock,
    observe,
    isLocked,
    get reverseCount() {
      return reverseCount;
    },
    get lockTimer() {
      return lockTimer;
    },
  });
}
