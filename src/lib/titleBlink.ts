let blinkInterval: ReturnType<typeof setInterval> | null = null;
let originalTitle: string | null = null;

function isPageVisible() {
  return document.visibilityState === "visible" && document.hasFocus();
}

export function startTitleBlink(message = "💬 새 메시지 도착") {
  if (blinkInterval || isPageVisible()) return;

  originalTitle = document.title;
  let showAlert = true;
  blinkInterval = setInterval(() => {
    document.title = showAlert ? message : (originalTitle ?? "");
    showAlert = !showAlert;
  }, 1000);

  window.addEventListener("focus", stopTitleBlink);
  document.addEventListener("visibilitychange", stopIfVisible);
}

function stopIfVisible() {
  if (isPageVisible()) stopTitleBlink();
}

export function stopTitleBlink() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
  if (originalTitle !== null) {
    document.title = originalTitle;
    originalTitle = null;
  }
  window.removeEventListener("focus", stopTitleBlink);
  document.removeEventListener("visibilitychange", stopIfVisible);
}
