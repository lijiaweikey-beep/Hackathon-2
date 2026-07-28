import assert from "node:assert/strict";
import test from "node:test";
import { createLevelViewHost } from "../../src/ui/createLevelViewHost.js";

function createFakeElement(ownerDocument) {
  const classes = new Set();
  return {
    ownerDocument,
    children: [],
    dataset: {},
    innerHTML: "",
    className: "",
    attributes: {},
    listeners: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
    },
    remove() {
      const index = this.parentElement?.children.indexOf(this) ?? -1;
      if (index >= 0) this.parentElement.children.splice(index, 1);
    },
  };
}

test("关卡界面宿主动态管理弹层、主题和动作", () => {
  const document = {};
  document.createElement = () => createFakeElement(document);
  const root = createFakeElement(document);
  const themed = [createFakeElement(document), createFakeElement(document)];
  const actions = [];
  const host = createLevelViewHost({
    root,
    themedElements: themed,
    onAction: (action) => actions.push(action),
  });

  host.showOverlay("intro", {
    className: "custom-intro",
    html: '<button data-level-action="beginSpecialPhase">开始</button>',
    ariaLive: "assertive",
  });
  const overlay = root.children[0];
  overlay.listeners.pointerdown({
    target: {
      closest: () => ({ dataset: { levelAction: "beginSpecialPhase" } }),
    },
    preventDefault() {},
  });
  host.setTheme("custom");
  host.setStyles(".custom-intro { color: red; }");

  assert.equal(overlay.className, "custom-intro");
  assert.equal(overlay.classList.contains("visible"), true);
  assert.equal(overlay.attributes["aria-live"], "assertive");
  assert.deepEqual(actions, [{ type: "beginSpecialPhase" }]);
  assert.equal(themed[0].dataset.levelTheme, "custom");
  assert.equal(root.children[1].textContent, ".custom-intro { color: red; }");

  host.clear();
  assert.equal(root.children.length, 0);
  assert.equal(themed[0].dataset.levelTheme, "");
});
