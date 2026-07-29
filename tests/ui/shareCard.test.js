import assert from "node:assert/strict";
import test from "node:test";
import {
  SHARE_OVERLAY_LAYOUT,
  buildShareModel,
  renderShareCard,
} from "../../src/ui/shareCard.js";

test("分享卡叠加层使用相对卡面比例而非写死像素", () => {
  assert.equal(typeof SHARE_OVERLAY_LAYOUT.padX, "number");
  assert.equal(typeof SHARE_OVERLAY_LAYOUT.padY, "number");
  assert.ok(SHARE_OVERLAY_LAYOUT.padX > 0 && SHARE_OVERLAY_LAYOUT.padX < 0.2);
  assert.ok(SHARE_OVERLAY_LAYOUT.brand.w > 0 && SHARE_OVERLAY_LAYOUT.brand.w < 1);
  assert.ok(SHARE_OVERLAY_LAYOUT.grade.w > 0 && SHARE_OVERLAY_LAYOUT.grade.w < 0.4);
  assert.ok(SHARE_OVERLAY_LAYOUT.age.w > 0 && SHARE_OVERLAY_LAYOUT.age.w < 0.4);
});

test("buildShareModel 提取年龄与关卡名供历史节点叠层使用", () => {
  const model = buildShareModel({
    level: {
      age: 19,
      axisLabel: "我要睡觉！",
      sceneName: "宿舍教学",
      nodes: { S: { title: "通宵冠军", verdict: "睡了。" } },
    },
    result: { won: true, rating: { grade: "S", rating: 1 } },
    progress: { unlocked: 1, total: 5 },
  });
  assert.equal(model.age, 19);
  assert.equal(model.sceneName, "我要睡觉！");
  assert.equal(model.grade, "S");
  assert.equal(model.theme.main.startsWith("#"), true);
});

test("renderShareCard 可按相对布局绘制导出图", () => {
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 0,
        font: "",
        textAlign: "",
        textBaseline: "",
        fillRect() {},
        strokeRect() {},
        fillText() {},
        save() {},
        restore() {},
        beginPath() {},
        rect() {},
        clip() {},
        translate() {},
        rotate() {},
        createLinearGradient() {
          return { addColorStop() {} };
        },
      };
    },
  };
  const model = renderShareCard(canvas, {
    level: { age: 27, axisLabel: "我不要背黑锅！", sceneName: "躲老板黑锅" },
    result: { won: true, timeUsed: 40, rating: { grade: "A", rating: 0.8 } },
    progress: { unlocked: 4, total: 5 },
  });
  assert.equal(canvas.width, 540);
  assert.equal(canvas.height, 960);
  assert.equal(model.grade, "A");
});
