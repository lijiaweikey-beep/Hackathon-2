import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const sourceRoot = new URL("../../src/", import.meta.url);
const levelsRoot = new URL("../../src/levels/", import.meta.url);

async function readSource(relativePath) {
  return readFile(new URL(relativePath, sourceRoot), "utf8");
}

test("活动应用不导入休眠双人模式", async () => {
  const source = await readSource("game.js");
  assert.doesNotMatch(source, /modes\/duel|multiplayer/);
});

test("单人关卡注册中心不包含双人模式", async () => {
  const entries = await readdir(levelsRoot, { withFileTypes: true });
  const duelDirectory = entries.find((entry) => entry.isDirectory() && entry.name === "library-duel");
  const duelFiles = duelDirectory
    ? await readdir(new URL("library-duel/", levelsRoot))
    : [];
  assert.equal(duelFiles.includes("definition.js"), false);
});

test("活动页面不再暴露双人决斗结构", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /duelLobby|duelTopHud|mpCreateBtn/);
});

test("不同关卡目录之间不能互相导入", async () => {
  const entries = (await readdir(levelsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory());

  for (const entry of entries) {
    const files = await readdir(new URL(`${entry.name}/`, levelsRoot));
    for (const file of files.filter((name) => name.endsWith(".js"))) {
      const source = await readFile(new URL(`${entry.name}/${file}`, levelsRoot), "utf8");
      for (const other of entries) {
        if (other.name === entry.name) continue;
        assert.doesNotMatch(
          source,
          new RegExp(String.raw`(?:from|import\()\s*["']\.\./${other.name}/`),
          `${entry.name}/${file} 不应导入 ${other.name}`,
        );
      }
    }
  }
});

test("共享运行时不按具体关卡标识或资源变体分派", async () => {
  const sharedFiles = [
    "game.js",
    "entities/actors.js",
    "ui/targetPreview.js",
    "world/createWorldBuilder.js",
  ];

  for (const file of sharedFiles) {
    const source = await readSource(file);
    assert.doesNotMatch(
      source,
      /level(?:State\.level)?\.id\s*={2,3}|playerVariant|npcVariant|previewVariant|worldVariant|attackVariant/,
      `${file} 应通过关卡扩展契约工作`,
    );
  }
});

test("共享运行时不包含关卡专属界面标识", async () => {
  const source = await readSource("game.js");
  assert.doesNotMatch(source, /bloodmoon|huntIntro|huntCard/);
});

test("共享运行时不读取关卡专属角色特征", async () => {
  const source = await readSource("game.js");
  assert.doesNotMatch(source, /isWerewolf|wolfCape|wolfParts/);
});
