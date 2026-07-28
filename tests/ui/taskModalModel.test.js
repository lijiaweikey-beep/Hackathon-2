import test from "node:test";
import assert from "node:assert/strict";
import { createTaskModalModel } from "../../src/ui/taskModal.js";

test("关卡可以声明无限时间和自定义资源", () => {
  assert.deepEqual(
    createTaskModalModel({
      level: {
        timeLimit: null,
        resourceLabel: "理智",
        resourceInitial: 100,
        targetDesc: "血月引路人",
      },
      duel: false,
      npcCount: 36,
    }),
    {
      npcCount: 36,
      timeText: "∞",
      resourceHtml: '理智 <span id="taskAttempts">100</span>',
      targetLabel: "血月引路人",
    },
  );
});
