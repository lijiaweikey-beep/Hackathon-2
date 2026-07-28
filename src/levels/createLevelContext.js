export function createLevelContext(capabilities) {
  if (!capabilities || typeof capabilities !== "object") {
    throw new TypeError("关卡上下文必须是能力对象");
  }
  return Object.freeze({ ...capabilities });
}
