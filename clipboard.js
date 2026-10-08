// execCommand("copy") works without focus in extension pages that hold the
// clipboardWrite permission, which makes it usable from the offscreen document
// and as the popup's fallback when focus never arrives.
// The copy event handler sets the clipboard data directly, so the textarea
// only exists to give execCommand a selection to act on.
export function copyViaExecCommand({ text, html }) {
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
