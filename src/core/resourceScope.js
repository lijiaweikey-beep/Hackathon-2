export function createResourceScope() {
  const cleanups = [];
  let disposed = false;

  return {
    get disposed() {
      return disposed;
    },

    add(cleanup) {
      if (typeof cleanup !== "function") {
        throw new TypeError("资源清理项必须是函数");
      }
      if (disposed) {
        cleanup();
      } else {
        cleanups.push(cleanup);
      }
      return cleanup;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        cleanups[index]();
      }
      cleanups.length = 0;
    },
  };
}
