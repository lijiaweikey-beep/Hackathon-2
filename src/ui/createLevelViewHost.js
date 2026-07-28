export function createLevelViewHost({ root, themedElements = [], onAction }) {
  const overlays = new Map();

  function getOrCreateOverlay(key, options) {
    let overlay = overlays.get(key);
    if (overlay) return overlay;

    overlay = root.ownerDocument.createElement("div");
    overlay.addEventListener("pointerdown", (event) => {
      const trigger = event.target.closest?.("[data-level-action]");
      if (!trigger?.dataset.levelAction) return;
      event.preventDefault();
      onAction?.({ type: trigger.dataset.levelAction });
    });
    root.appendChild(overlay);
    overlays.set(key, overlay);
    return overlay;
  }

  function setTheme(theme = "") {
    themedElements.filter(Boolean).forEach((element) => {
      element.dataset.levelTheme = theme;
    });
  }

  return {
    showOverlay(key, options) {
      const overlay = getOrCreateOverlay(key, options);
      overlay.className = options.className;
      overlay.innerHTML = options.html;
      overlay.setAttribute("aria-live", options.ariaLive ?? "polite");
      overlay.classList.remove("visible");
      void overlay.offsetWidth;
      overlay.classList.add("visible");
    },

    hideOverlay(key) {
      overlays.get(key)?.classList.remove("visible");
    },

    setTheme,

    clear() {
      overlays.forEach((overlay) => overlay.remove());
      overlays.clear();
      setTheme();
    },
  };
}
