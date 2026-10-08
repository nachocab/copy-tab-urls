// Performs clipboard writes on behalf of the service worker, which has no
// document and so no clipboard access.
import { copyViaExecCommand } from "./clipboard.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== "offscreen" || message.type !== "copy") return;
  try {
    copyViaExecCommand(message.data);
    sendResponse({ ok: true });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }
});
