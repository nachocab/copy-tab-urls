function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// Each format yields the plain text to copy and, optionally, an HTML version.
// The markdown format carries HTML links as well because Teams renders pasted
// HTML links but leaves pasted markdown link syntax as literal text.
export const FORMATS = {
  titleAndUrl: (tabs) => ({ text: tabs.map((t) => `${t.title} # ${t.url}`).join("\n") }),
  urlOnly: (tabs) => ({ text: tabs.map((t) => t.url).join("\n") }),
  markdown: (tabs) => ({
    text: tabs.map((t) => `[${t.title.replace(/[[\]]/g, "\\$&")}](${t.url.replace(/\(/g, "%28").replace(/\)/g, "%29")})`).join("\n"),
    html: tabs.map((t) => `<a href="${escapeHtml(t.url)}">${escapeHtml(t.title)}</a>`).join("<br>"),
  }),
};
