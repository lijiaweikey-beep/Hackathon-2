import { appendTrustedMarkup } from "./domWrite.js";

export function createLevelViewHost({ root, themedElements = [], onAction }) {
  const overlays = new Map();
  let styleElement = null;

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

  function setStyles(cssText = "") {
    if (!styleElement) {
      styleElement = root.ownerDocument.createElement("style");
      root.appendChild(styleElement);
    }
    styleElement.textContent = cssText;
  }

  return {
    showOverlay(key, options) {
      const overlay = getOrCreateOverlay(key, options);
      overlay.className = options.className;
      appendTrustedMarkup(overlay, options.html);
      overlay.setAttribute("aria-live", options.ariaLive ?? "polite");
      overlay.classList.remove("visible");
      void overlay.offsetWidth;
      overlay.classList.add("visible");
    },

    hideOverlay(key) {
      overlays.get(key)?.classList.remove("visible");
    },

    setTheme,
    setStyles,

    clear() {
      overlays.forEach((overlay) => overlay.remove());
      overlays.clear();
      styleElement?.remove();
      styleElement = null;
      setTheme();
    },
  };
}
