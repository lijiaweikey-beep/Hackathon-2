# 番外关卡锁定 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock and fold extra levels until all mainline levels are complete.

**Architecture:** Keep the rule inside `createHistoryTimelineController`, because it already owns timeline rendering and enterability state. Reuse `storyProgress.isComplete()` so no new persistence or registry metadata is needed.

**Tech Stack:** Vite, Three.js, Node test runner.

## Global Constraints

- 不新增依赖。
- 不改关卡注册结构。
- 只提交本次相关文件，保留工作区已有未提交改动。

---

### Task 1: 番外区锁定和展开

**Files:**
- Modify: `src/ui/createHistoryTimelineController.js`
- Modify: `src/styles.css`
- Test: `tests/ui/storyLevelSelect.test.js`

**Interfaces:**
- Consumes: `storyProgress.isComplete(): boolean`
- Produces: timeline extra levels hidden while incomplete, visible and enterable after completion.

- [x] **Step 1: Write failing tests**

Add tests asserting that extra level cards are hidden before full mainline completion and visible/enterable after completion.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/storyLevelSelect.test.js`
Expected: FAIL because the existing timeline renders extra cards while mainline is incomplete.

- [x] **Step 3: Write minimal implementation**

Use `storyProgress.isComplete()` in timeline enterability and render only mainline cards while false. Add locked/unlocked classes on the divider.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/storyLevelSelect.test.js`
Expected: PASS.
