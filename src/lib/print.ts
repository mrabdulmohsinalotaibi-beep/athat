/** Invoke print synchronously from the user gesture and clean up device print state afterward. */
export function requestPrint(bodyClassName?: string): void {
  if (typeof window === "undefined" || typeof window.print !== "function") return;

  if (!bodyClassName) {
    window.print();
    return;
  }

  const body = document.body;
  body.classList.add(bodyClassName);
  let pageWasHidden = false;
  let cleanedUp = false;
  let cleanupTimer: number | undefined;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (cleanupTimer !== undefined) window.clearTimeout(cleanupTimer);
    window.removeEventListener("afterprint", cleanup);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    body.classList.remove(bodyClassName);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      pageWasHidden = true;
    } else if (pageWasHidden) {
      cleanup();
    }
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  cleanupTimer = window.setTimeout(cleanup, 120_000);

  try {
    // Keep this call synchronous so mobile browsers retain the print user gesture.
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}
