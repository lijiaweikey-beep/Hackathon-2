import test from "node:test";
import assert from "node:assert/strict";
import { createTargetPreviewModel } from "../../src/ui/targetPreview.js";

test("目标预览使用关卡声明的外观类型", () => {
  assert.deepEqual(
    createTargetPreviewModel({
      id: "custom-level",
      previewVariant: "bloodmoon",
      lighting: "bloodmoon",
    }),
    {
      variant: "bloodmoon",
      background: 0x21060b,
    },
  );
});
