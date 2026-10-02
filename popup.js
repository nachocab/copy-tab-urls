// The clipboard write happens here rather than in a service worker because
// the clipboard is only reachable from a document, which the popup is.
const msg = document.getElementById("msg");

// The popup script starts before Chrome has focused the popup document, and
// navigator.clipboard rejects writes from an unfocused document.
function waitForFocus(timeoutMs = 500) {
  if (document.hasFocus()) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("focus", resolve, { once: true });
    setTimeout(resolve, timeoutMs);
  });
}

// execCommand("copy") works without focus in extension pages that hold the
// clipboardWrite permission, so it covers the case where focus never arrives.
function copyViaExecCommand(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.append(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  if (!ok) throw new Error("execCommand('copy') returned false");
}

async function copy(text) {
  await waitForFocus();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copyViaExecCommand(text);
  }
}

try {
  const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
  await copy(tabs.map((t) => t.url).join("\n"));
  msg.textContent = `Copied ${tabs.length} URL${tabs.length === 1 ? "" : "s"}`;
  setTimeout(() => window.close(), 800);
} catch (err) {
  msg.textContent = `Copy failed: ${err.message}`;
}
