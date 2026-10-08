// The clipboard write happens here rather than in a service worker because
// the clipboard is only reachable from a document, which the popup is.
const msg = document.getElementById("msg");

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// Each format yields the plain text to copy and, optionally, an HTML version.
// The markdown format carries HTML links as well because Teams renders pasted
// HTML links but leaves pasted markdown link syntax as literal text.
const FORMATS = {
  titleAndUrl: (tabs) => ({ text: tabs.map((t) => `${t.title} # ${t.url}`).join("\n") }),
  urlOnly: (tabs) => ({ text: tabs.map((t) => t.url).join("\n") }),
  markdown: (tabs) => ({
    text: tabs.map((t) => `[${t.title.replace(/[[\]]/g, "\\$&")}](${t.url.replace(/\(/g, "%28").replace(/\)/g, "%29")})`).join("\n"),
    html: tabs.map((t) => `<a href="${escapeHtml(t.url)}">${escapeHtml(t.title)}</a>`).join("<br>"),
  }),
};

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

// execCommand("copy") works without focus in extension pages that hold the
// clipboardWrite permission, so it covers the case where focus never arrives.
// The copy event handler sets the clipboard data directly, so the textarea
// only exists to give execCommand a selection to act on.
function copyViaExecCommand({ text, html }) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.append(textarea);
  textarea.select();
  const onCopy = (e) => {
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
    if (html) e.clipboardData.setData("text/html", html);
  };
  document.addEventListener("copy", onCopy, { once: true });
  const ok = document.execCommand("copy");
  document.removeEventListener("copy", onCopy);
  textarea.remove();
  if (!ok) throw new Error("execCommand('copy') returned false");
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
