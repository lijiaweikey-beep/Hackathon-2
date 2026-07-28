import test from "node:test";
import assert from "node:assert/strict";
import { createBloodmoonViewModel } from "../../src/levels/bloodmoon/viewModel.js";

test("猎杀阶段输出倒计时和机制提示", () => {
  assert.deepEqual(
    createBloodmoonViewModel({
      mode: "hunt",
      huntTimer: 12.4,
      sanity: 76,
      bossHp: 3,
    }),
    {
      mission: "猎杀时刻：13 秒内找到自己，进入任意绿色区域",
      timerText: "∞",
      resourceLabel: "理智",
      resourceText: "76",
      clue: "🟢 机制：玩家和 NPC 已随机散开，NPC 暂停攻击。绿区外会被血月秒杀。",
      mechanicVisible: true,
      mechanicHtml: `
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">台词</span><span class="mechanic-hint-text">认不出自己的人，都会留在月光外。</span></div>
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">机制</span><span class="mechanic-hint-text">找到自己，进入任意绿色区域。</span></div>
        <div class="mechanic-hint-row"><span class="mechanic-hint-label">处决</span><span class="mechanic-hint-text">倒计时结束时，绿区外全部秒杀。</span></div>
      `,
      attackIcon: "爪",
      theme: "bloodmoon",
      resultResource: {
        label: "理智",
        value: "76 点",
        attemptsLeft: 76,
      },
    },
  );
});

test("二阶段输出首领剩余生命", () => {
  const view = createBloodmoonViewModel({
    mode: "phase2",
    huntTimer: 0,
    sanity: 88,
    bossHp: 2,
  });

  assert.equal(view.mission, "二阶段：首领剩余 2/3 格血");
  assert.equal(view.mechanicVisible, false);
});
