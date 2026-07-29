import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("正式关卡线索条与游戏状态同属顶部状态栏", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const topbar = html.match(/<section class="topbar">([\s\S]*?)<\/section>/)?.[1] ?? "";

  assert.match(topbar, /class="mission-strip"/);
  assert.match(topbar, /class="clue-bar-wrap"/);
  assert.match(topbar, /class="status-strip"/);
  assert.ok(
    topbar.indexOf("clue-bar-wrap") > topbar.indexOf("mission-strip")
      && topbar.indexOf("clue-bar-wrap") < topbar.indexOf("status-strip"),
  );
});
