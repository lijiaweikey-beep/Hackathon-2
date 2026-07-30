import test from "node:test";
import assert from "node:assert/strict";
import {
  LIFE_REPORT_TITLE,
  buildLifeReportModel,
} from "../../src/ui/lifeReportModel.js";
import { createLifeReportController } from "../../src/ui/createLifeReportController.js";

const LEVELS = [
  {
    id: "gaming",
    age: 19,
    axisLabel: "我要睡觉！",
    sceneName: "宿舍教学",
    art: { grades: { S: "gaming-s.jpg" } },
    nodes: { S: { title: "作息纠察队长" } },
  },
  {
    id: "goose-market",
    age: 23,
    axisLabel: "鹅腿阿姨！\n你吓到我了",
    sceneName: "深夜集市",
    art: { grades: { B: "goose-b.jpg", C: "goose-c.jpg" } },
    nodes: { B: { title: "排队排到腿软" } },
  },
];

function createFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
}

function createClassList() {
  const set = new Set();
  return {
    add: (name) => set.add(name),
    remove: (name) => set.delete(name),
    toggle: (name, force) => (force ? set.add(name) : set.delete(name)),
    contains: (name) => set.has(name),
  };
}

test("人生线报告标题固定为旷野宣言", () => {
  assert.equal(LIFE_REPORT_TITLE, "妈妈，人生是旷野！");
});

test("报告数据按关卡映射年龄、单行名字与称号，主图取最后一关", () => {
  const best = {
    gaming: { grade: "S" },
    "goose-market": { grade: "B" },
  };
  const model = buildLifeReportModel({
    levels: LEVELS,
    getBest: (id) => best[id] ?? null,
  });

  assert.equal(model.title, LIFE_REPORT_TITLE);
  assert.equal(model.total, 2);
  assert.equal(model.clearedCount, 2);
  assert.deepEqual(model.rows[1], {
    id: "goose-market",
    ageLabel: "23 岁",
    name: "鹅腿阿姨！你吓到我了",
    grade: "B",
    nodeTitle: "排队排到腿软",
  });
  assert.equal(model.heroArt, "goose-b.jpg");
});

test("缺少战绩的关卡等级为空且不计入通关数", () => {
  const model = buildLifeReportModel({
    levels: LEVELS,
    getBest: (id) => (id === "gaming" ? { grade: "S" } : null),
  });

  assert.equal(model.clearedCount, 1);
  assert.equal(model.rows[1].grade, null);
  assert.equal(model.rows[1].nodeTitle, "");
  // 没有战绩时主图退级到 C 图。
  assert.equal(model.heroArt, "goose-c.jpg");
});

test("全部关卡 A 级及以上才算达标解锁报告", () => {
  const allAce = buildLifeReportModel({
    levels: LEVELS,
    getBest: (id) => ({ grade: id === "gaming" ? "S" : "A" }),
  });
  assert.equal(allAce.qualified, true);

  const withB = buildLifeReportModel({
    levels: LEVELS,
    getBest: (id) => ({ grade: id === "gaming" ? "S" : "B" }),
  });
  assert.equal(withB.qualified, false);

  const missing = buildLifeReportModel({
    levels: LEVELS,
    getBest: (id) => (id === "gaming" ? { grade: "S" } : null),
  });
  assert.equal(missing.qualified, false);

  // 失败结算记录（won:false）不算通关成绩，更不能参与全 A 判定。
  const failedRecord = buildLifeReportModel({
    levels: LEVELS,
    getBest: (id) =>
      id === "gaming" ? { grade: "S" } : { won: false, grade: "A" },
  });
  assert.equal(failedRecord.qualified, false);
  assert.equal(failedRecord.clearedCount, 1);
  assert.equal(failedRecord.rows[1].grade, null);
});

test("未全 A 时报告不弹出，历史记录不受影响", () => {
  const storage = createFakeStorage();
  const modal = { classList: createClassList() };
  const ui = {
    lifeReportModal: modal,
    lifeReportProgress: { textContent: "" },
    lifeReportRows: { textContent: "" },
  };
  const controller = createLifeReportController({
    ui,
    levels: LEVELS,
    storage,
    getBest: (id) => ({ grade: id === "gaming" ? "S" : "B" }),
  });

  assert.equal(controller.isQualified(), false);
  assert.equal(controller.maybeShow(), false);
  assert.equal(modal.classList.contains("visible"), false);
  // 未达标时不能把已读写进存储，等刷到全 A 后仍可弹出。
  assert.equal(storage.data.has("gengge-life-report-seen"), false);
});

test("报告只弹一次并把已读写进存储", () => {
  const storage = createFakeStorage();
  const modal = { classList: createClassList() };
  const ui = {
    lifeReportModal: modal,
    lifeReportProgress: { textContent: "" },
    lifeReportRows: { textContent: "" },
  };
  const controller = createLifeReportController({
    ui,
    levels: LEVELS,
    storage,
    getBest: () => ({ grade: "S" }),
  });

  assert.equal(controller.hasSeen(), false);
  assert.equal(controller.maybeShow(), true);
  assert.equal(modal.classList.contains("visible"), true);
  assert.equal(ui.lifeReportProgress.textContent, "2/2");
  assert.match(ui.lifeReportRows.textContent, /作息纠察队长/);

  storage.setItem("gengge-life-report-seen", "1");
  modal.classList.remove("visible");
  assert.equal(controller.maybeShow(), false);
  assert.equal(modal.classList.contains("visible"), false);
});
