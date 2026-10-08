// The clipboard write happens here rather than in a service worker because
// the clipboard is only reachable from a document, which the popup is.
import { copyViaExecCommand } from "./clipboard.js";
import { FORMATS } from "./formats.js";

const msg = document.getElementById("msg");

// The popup stays open this long after a copy so the secondary option can be
// clicked; hovering the popup keeps it open until the pointer leaves.
const CLOSE_DELAY_MS = 2500;

// The popup script starts before Chrome has focused the popup document, and
// navigator.clipboard rejects writes from an unfocused document.
function waitForFocus(timeoutMs = 500) {
  if (document.hasFocus()) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("focus", resolve, { once: true });
    setTimeout(resolve, timeoutMs);
  });
}

async function copy({ text, html }) {
  await waitForFocus();
  try {
    if (html) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    copyViaExecCommand({ text, html });
  }
}

let closeTimer;
function scheduleClose(delayMs) {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => window.close(), delayMs);
}
document.body.addEventListener("mouseenter", () => clearTimeout(closeTimer));
document.body.addEventListener("mouseleave", () => scheduleClose(CLOSE_DELAY_MS));

async function copyTabs(tabs, format, label) {
  try {
    await copy(FORMATS[format](tabs));
    msg.textContent = `Copied ${tabs.length} ${label}${tabs.length === 1 ? "" : "s"}`;
  } catch (err) {
    msg.textContent = `Copy failed: ${err.message}`;
  }
}

const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });

const options = document.getElementById("options");
for (const button of options.querySelectorAll("button")) {
  button.addEventListener("click", async () => {
    options.hidden = true;
    await copyTabs(tabs, button.dataset.format, button.dataset.label);
    scheduleClose(800);
  });
}

await copyTabs(tabs, "titleAndUrl", "link");
options.hidden = false;
scheduleClose(CLOSE_DELAY_MS);
