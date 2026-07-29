export function createLevelSurface({
  documentTarget = document,
  parent,
  levelId,
  sharedLayout = false,
  scope,
}) {
  const host = documentTarget.createElement("div");
  host.dataset.levelSurface = levelId;
  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    zIndex: "20",
    pointerEvents: sharedLayout ? "none" : "auto",
  });
  const shadow = host.attachShadow({ mode: "open" });
  const style = documentTarget.createElement("style");
  const root = documentTarget.createElement("div");
  root.dataset.levelRoot = levelId;
  shadow.append(style, root);
  parent.append(host);
  parent.classList.add("standalone-active");
  if (sharedLayout) parent.classList.add("shared-layout-active");

  function setContent(html = "") {
    root.innerHTML = html;
  }

  function setStyles(cssText = "") {
    style.textContent = cssText;
  }

  function clear() {
    root.innerHTML = "";
    style.textContent = "";
  }

  function dispose() {
    clear();
    host.remove();
    parent.classList.remove("standalone-active");
    parent.classList.remove("shared-layout-active");
  }

  scope?.add(dispose);

  return Object.freeze({
    host,
    root,
    style,
    setContent,
    setStyles,
    clear,
    dispose,
  });
}
