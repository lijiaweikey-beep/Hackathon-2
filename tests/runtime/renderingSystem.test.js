import assert from "node:assert/strict";
import test from "node:test";
import { createRenderingSystem } from "../../src/runtime/createRenderingSystem.js";

test("渲染系统统一创建场景并驱动动画循环", () => {
  const calls = [];
  class Renderer {
    shadowMap = {};
    setPixelRatio() {}
    setSize(width, height) {
      calls.push(["resize", width, height]);
    }
    render(scene, camera) {
      calls.push(["render", scene, camera]);
    }
    setAnimationLoop(callback) {
      this.callback = callback;
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
  });
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
