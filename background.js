// Handles the keyboard shortcuts that copy the selected tabs without opening
// the popup. The clipboard write is delegated to an offscreen document.
import { FORMATS } from "./formats.js";

const COMMAND_FORMATS = {
  "copy-urls": "urlOnly",
  "copy-markdown": "markdown",
};

const BADGE_MS = 1500;

let creatingOffscreen;
async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length > 0) return;
  // Shared so overlapping shortcut presses create the document only once.
  creatingOffscreen ??= chrome.offscreen
    .createDocument({
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Write the selected tabs to the clipboard",
    })
    .finally(() => (creatingOffscreen = undefined));
  await creatingOffscreen;
}

async function flashBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), BADGE_MS);
}

chrome.commands.onCommand.addListener(async (command) => {
  const format = COMMAND_FORMATS[command];
  if (!format) return;
  try {
    const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "copy",
      data: FORMATS[format](tabs),
    });
    if (!response?.ok) throw new Error(response?.error ?? "no response from offscreen document");
    await flashBadge(String(tabs.length), "#1a7f37");
  } catch (err) {
    console.error("Copy failed:", err);
    await flashBadge("!", "#cf222e");
  }
});
