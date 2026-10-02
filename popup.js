// The clipboard write happens here rather than in a service worker because
// navigator.clipboard is only available in a focused document, which the
// open popup is.
const msg = document.getElementById("msg");

try {
  const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
  await navigator.clipboard.writeText(tabs.map((t) => t.url).join("\n"));
  msg.textContent = `Copied ${tabs.length} URL${tabs.length === 1 ? "" : "s"}`;
  setTimeout(() => window.close(), 800);
} catch (err) {
  msg.textContent = `Copy failed: ${err.message}`;
}
