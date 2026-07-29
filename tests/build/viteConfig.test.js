import assert from "node:assert/strict";
import test from "node:test";

import viteConfig from "../../vite.config.js";

test("Vite 配置不会把字符串里的 fetch 提示改成非法脚本", () => {
  const bundle = {
    "index.js": {
      type: "chunk",
      code: 'console.warn("fetch() not supported.");',
    },
  };

  for (const plugin of viteConfig.plugins ?? []) {
    plugin.generateBundle?.({}, bundle);
  }

  assert.doesNotThrow(() => new Function(bundle["index.js"].code));
});
