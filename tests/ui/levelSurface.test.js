import assert from "node:assert/strict";
import test from "node:test";
import { createResourceScope } from "../../src/core/resourceScope.js";
import { createLevelSurface } from "../../src/ui/createLevelSurface.js";

function createElement(tagName) {
  return {
    tagName,
    children: [],
    dataset: {},
    style: {},
    append(...children) {
      this.children.push(...children);
    },
    remove() {
      this.removed = true;
    },
    attachShadow() {
      this.shadowRoot = createElement("shadow-root");
      return this.shadowRoot;
    },
  };
}

test("独立关卡界面使用隔离根节点并随资源域销毁", () => {
  const parent = createElement("parent");
  const scope = createResourceScope();
  const surface = createLevelSurface({
    documentTarget: { createElement },
    parent,
    levelId: "standalone",
    scope,
  });

  surface.setContent("<button>开始</button>");
  surface.setStyles("button { color: red; }");

  assert.equal(parent.children.length, 1);
  assert.equal(surface.root.innerHTML, "<button>开始</button>");
  assert.equal(surface.style.textContent, "button { color: red; }");
  scope.dispose();
  assert.equal(parent.children[0].removed, true);
});
