export function createOrientationController({
  windowTarget = window,
  documentTarget = document,
  overlay,
  isPlaying,
  isPaused,
  pause,
  resume,
  resetInput,
  onResize = () => {},
}) {
  let ownsPause = false;
  let bound = false;

  function sync() {
    const portrait = windowTarget.innerHeight > windowTarget.innerWidth;
    const blocked = portrait || Boolean(documentTarget.hidden);
    if (overlay) overlay.hidden = !portrait;
    resetInput?.();
    onResize();

    if (blocked && isPlaying?.()) {
      ownsPause = true;
      pause?.();
    } else if (!blocked && ownsPause && isPaused?.()) {
      ownsPause = false;
      resume?.();
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    windowTarget.addEventListener("resize", sync);
    windowTarget.addEventListener("orientationchange", sync);
    documentTarget.addEventListener("visibilitychange", sync);
    sync();
  }

  function dispose() {
    if (!bound) return;
    bound = false;
    windowTarget.removeEventListener("resize", sync);
    windowTarget.removeEventListener("orientationchange", sync);
    documentTarget.removeEventListener("visibilitychange", sync);
  }

  return Object.freeze({ bind, sync, dispose });
}
