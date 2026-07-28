import { isLevelAction } from "./actions.js";

const REQUIRED_FIELDS = ["id", "sceneName", "order"];
const LEVEL_TRACKS = new Set(["mainline", "extra"]);
export const LEVEL_EXTENSIONS = Object.freeze([
  "createWorld",
  "createPlayer",
  "createNpc",
  "createPreviewModel",
  "renderPreview",
  "createExperience",
]);
const levelExtensionSet = new Set(LEVEL_EXTENSIONS);

export function validateLevelDefinition(definition, source = "未知关卡") {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`关卡描述无效：${source}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (definition[field] == null || definition[field] === "") {
      throw new Error(`关卡描述缺少字段 ${field}：${source}`);
    }
  }

  if (definition.track != null && !LEVEL_TRACKS.has(definition.track)) {
    throw new Error(`关卡分组无效：${source}`);
  }
  if (
    definition.track === "mainline"
    && (!Number.isInteger(definition.age) || definition.age <= 0)
  ) {
    throw new Error(`主线关卡年龄无效：${source}`);
  }
  if (definition.track === "extra" && definition.age != null) {
    throw new Error(`番外关卡不能声明年龄：${source}`);
  }

  const hasClassicFactory = typeof definition.createLevel === "function";
  const hasExperienceFactory =
    typeof definition.extensions?.createExperience === "function";
  if (!definition.legacy && !hasClassicFactory && !hasExperienceFactory) {
    throw new Error(`关卡必须提供 createLevel 或 createExperience：${source}`);
  }

  if (definition.actions != null && !Array.isArray(definition.actions)) {
    throw new TypeError(`关卡 actions 必须是数组：${source}`);
  }
  for (const action of definition.actions ?? []) {
    if (!isLevelAction(action)) {
      throw new Error(`关卡声明了未知动作 ${action}：${source}`);
    }
  }

  if (definition.extensions != null && typeof definition.extensions !== "object") {
    throw new TypeError(`关卡 extensions 必须是对象：${source}`);
  }
  for (const [name, extension] of Object.entries(definition.extensions ?? {})) {
    if (!levelExtensionSet.has(name)) {
      throw new Error(`关卡声明了未知扩展 ${name}：${source}`);
    }
    if (typeof extension !== "function") {
      throw new TypeError(`关卡扩展必须是函数 ${name}：${source}`);
    }
  }

  return definition;
}
