function clearTextSelection() {
  const selection = window.getSelection();
  if (selection) selection.removeAllRanges();
}

function clampNumber(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function autoSizeEditor(editor) {
  editor.style.height = "auto";
  editor.style.height = editor.scrollHeight + "px";
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}