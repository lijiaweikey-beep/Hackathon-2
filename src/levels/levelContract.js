const REQUIRED_FIELDS = ["id", "sceneName", "order"];

export function validateLevelDefinition(definition, source = "未知关卡") {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`关卡描述无效：${source}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (definition[field] == null || definition[field] === "") {
      throw new Error(`关卡描述缺少字段 ${field}：${source}`);
    }
  }

  if (!definition.legacy && typeof definition.createLevel !== "function") {
    throw new Error(`关卡必须提供 createLevel：${source}`);
  }

  return definition;
}
