export function createRenderingSystem({
  THREE,
  canvas,
  windowTarget = window,
  isCachedTexture = () => false,
  now = () => performance.now(),
  frameTimeoutMs = 1500,
  watchdogIntervalMs = 1000,
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(windowTarget.devicePixelRatio ?? 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const clock = new THREE.Clock();
  let tickCallback = null;
  let lastFrameAt = 0;
  let contextLost = false;
  let watchdogId = null;

  function createCamera({
    left = -8,
    right = 8,
    top = 8,
    bottom = -8,
    near = 0.1,
    far = 100,
    position = [0, 19.5, 17.2],
    lookAt = [0, 0, 0],
  } = {}) {
    const nextCamera = new THREE.OrthographicCamera(
      left,
      right,
      top,
      bottom,
      near,
      far,
    );
    nextCamera.position.set(...position);
    nextCamera.lookAt(...lookAt);
    return nextCamera;
  }

  const camera = createCamera();

  function createScene() {
    const scene = new THREE.Scene();
    scene.userData.cleanups = [];
    return scene;
  }

  function resize() {
    const width = windowTarget.innerWidth;
    const height = windowTarget.innerHeight;
    const aspect = width / height;
    const viewHeight = height < 620 ? 14 : 15.5;
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(windowTarget.devicePixelRatio ?? 1, 1.5));
    renderer.setSize(width, height, false);
  }

  function render(scene, targetCamera = camera) {
    renderer.render(scene, targetCamera);
  }

  function installLoop() {
    if (!tickCallback) return;
    lastFrameAt = now();
    clock.start?.();
    renderer.setAnimationLoop(() => {
      lastFrameAt = now();
      tickCallback(clock.getDelta());
    });
  }

  function ensureRunning(timeoutMs = frameTimeoutMs) {
    if (!tickCallback || contextLost) return false;
    if (now() - lastFrameAt <= timeoutMs) return false;
    installLoop();
    return true;
  }

  function disposeScene(scene, fx) {
    if (!scene) return;
    fx?.clearParticles();
    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material].filter(Boolean);
      materials.forEach((material) => {
        if (material.map && !isCachedTexture(material.map)) material.map.dispose();
        if (!fx?.isCachedPixelMaterial(material)) material.dispose();
      });
    });
  }

  function start(tick) {
    tickCallback = tick;
    resize();
    windowTarget.addEventListener("resize", resize);
    canvas?.addEventListener?.("webglcontextlost", (event) => {
      event.preventDefault?.();
      contextLost = true;
    });
    canvas?.addEventListener?.("webglcontextrestored", () => {
      contextLost = false;
      resize();
      installLoop();
    });
    installLoop();
    if (!watchdogId && windowTarget.setInterval) {
      watchdogId = windowTarget.setInterval(() => ensureRunning(), watchdogIntervalMs);
    }
    ["focus", "pageshow", "orientationchange"].forEach((type) => {
      windowTarget.addEventListener?.(type, () => ensureRunning(0));
    });
  }

  return Object.freeze({
    renderer,
    camera,
    createScene,
    createCamera,
    resize,
    render,
    disposeScene,
    start,
    ensureRunning,
    getHealth: () => Object.freeze({
      contextLost,
      lastFrameAt,
      running: Boolean(tickCallback && !contextLost),
      staleForMs: tickCallback ? Math.max(0, now() - lastFrameAt) : 0,
    }),
  });
}
