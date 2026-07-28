export function createRenderingSystem({
  THREE,
  canvas,
  windowTarget = window,
  isCachedTexture = () => false,
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(windowTarget.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const clock = new THREE.Clock();
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(0, 19.5, 17.2);
  camera.lookAt(0, 0, 0);

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
    renderer.setSize(width, height, false);
  }

  function render(scene) {
    renderer.render(scene, camera);
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
    resize();
    windowTarget.addEventListener("resize", resize);
    renderer.setAnimationLoop(() => tick(clock.getDelta()));
  }

  return Object.freeze({
    renderer,
    camera,
    createScene,
    resize,
    render,
    disposeScene,
    start,
  });
}
