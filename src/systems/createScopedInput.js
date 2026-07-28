export function createScopedInput({
  scope,
  windowTarget = window,
  canvas,
  emit = () => {},
}) {
  function listen(target, type, listener, options) {
    const eventTarget = target ?? windowTarget;
    eventTarget.addEventListener(type, listener, options);
    const cleanup = () => {
      eventTarget.removeEventListener(type, listener, options);
    };
    scope.add(cleanup);
    return cleanup;
  }

  return Object.freeze({
    windowTarget,
    canvas,
    listen,
    emit,
  });
}
