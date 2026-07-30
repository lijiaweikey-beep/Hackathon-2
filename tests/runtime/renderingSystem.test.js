import assert from "node:assert/strict";
import test from "node:test";
import { createRenderingSystem } from "../../src/runtime/createRenderingSystem.js";

function createRenderingHarness({ calls = [], now = () => 0, withWatchdog = false } = {}) {
  let watchdog = null;
  class Renderer {
    shadowMap = {};
    loopCount = 0;
    setPixelRatio() {}
    setSize(width, height) {
      calls.push(["resize", width, height]);
    }
    render(scene, camera) {
      calls.push(["render", scene, camera]);
    }
    setAnimationLoop(callback) {
      this.callback = callback;
      this.loopCount += 1;
    }
  }
  class Camera {
    position = { set() {} };
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class Clock {
    getDelta() {
      return 0.016;
    }
  }
  class Scene {
    userData = {};
  }
  const windowTarget = new EventTarget();
  windowTarget.innerWidth = 800;
  windowTarget.innerHeight = 600;
  windowTarget.devicePixelRatio = 1;
  if (withWatchdog) {
    windowTarget.setInterval = (callback) => {
      watchdog = callback;
      return 1;
    };
  }
  const rendering = createRenderingSystem({
    THREE: {
      WebGLRenderer: Renderer,
      OrthographicCamera: Camera,
      Clock,
      Scene,
      PCFSoftShadowMap: "soft",
      SRGBColorSpace: "srgb",
    },
    canvas: {},
    windowTarget,
    now,
  });
  return { rendering, windowTarget, getWatchdog: () => watchdog };
}

test("渲染系统统一创建场景并驱动动画循环", () => {
  const calls = [];
  const { rendering } = createRenderingHarness({ calls });
  const scene = rendering.createScene();
  const customCamera = rendering.createCamera();
  rendering.start((deltaSeconds) => calls.push(["tick", deltaSeconds]));
  rendering.render(scene, customCamera);
  rendering.renderer.callback();

  assert.deepEqual(scene.userData.cleanups, []);
  assert.equal(calls.find(([type]) => type === "render")[2], customCamera);
  assert.deepEqual(calls.at(-1), ["tick", 0.016]);
  assert.equal(calls.some(([type]) => type === "render"), true);
});

test("渲染循环长时间无帧时可以重新挂起动画循环", () => {
  let now = 0;
  const { rendering } = createRenderingHarness({ now: () => now });

  rendering.start(() => {});
  assert.equal(rendering.renderer.loopCount, 1);

  now = 2000;
  assert.equal(rendering.ensureRunning(), true);
  assert.equal(rendering.renderer.loopCount, 2);

  rendering.renderer.callback();
  now = 2010;
  assert.equal(rendering.ensureRunning(), false);
  assert.equal(rendering.renderer.loopCount, 2);
});

test("页面重新聚焦时会立即检测并恢复超时的渲染循环", () => {
  let now = 0;
  const { rendering, windowTarget } = createRenderingHarness({ now: () => now });

  rendering.start(() => {});
  now = 1600;
  windowTarget.dispatchEvent(new Event("focus"));

  assert.equal(rendering.renderer.loopCount, 2);
});

test("看门狗定时器会自动恢复超时的渲染循环", () => {
  let now = 0;
  const { rendering, getWatchdog } = createRenderingHarness({
    now: () => now,
    withWatchdog: true,
  });

  rendering.start(() => {});
  now = 1600;
  getWatchdog()();

  assert.equal(rendering.renderer.loopCount, 2);
});
