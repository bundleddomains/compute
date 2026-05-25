function getDisplayType(type) {
  if (type === "hidden") {
    return "script-src";
  }

  return type;
}

function toggleSection(index) {
  if (expandedBlocks.has(index)) {
    expandedBlocks.delete(index);
  } else {
    expandedBlocks.add(index);
  }

  renderBlockMode();
}

function renderCodeHTML(text) {
  let html = escapeHTML(text);

  html = html.replace(
    /(^|\n)(function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{)/g,
    '$1<span class="function-line" data-select-type="brace">$2</span>'
  );

  html = html.replace(
    /(^|\n)(\s*(?:[.#][^\n{}]+|\[[^\n{}]+\]|@keyframes\s+[^\n{}]+)\s*\{\s*)/g,
    '$1<span class="function-line" data-select-type="brace">$2</span>'
  );

  return html;
}

function renderCodeBlockHTML(text, blockIndex, collapsed = false) {
  const lines = String(text).split("\n");

  if (collapsed) {
    const preview =
      lines.find(line => line.trim()) ||
      "(empty block)";

    return `
      <div class="collapsed-preview">
        <span>${lines.length} lines</span>
        <pre>${renderCodeHTML(preview.slice(0, 140))}</pre>
      </div>
    `;
  }

  const rows = lines.map((line, i) => {
    const lineNumber = i + 1;

    const key = `${blockIndex}:${lineNumber}`;

    const selected =
      selectedLines.has(key)
        ? " selected-line"
        : "";

    return `
      <div class="code-line${selected}" data-line="${lineNumber}">
        <button
          class="line-number-box"
          data-block="${blockIndex}"
          data-line="${lineNumber}"
          type="button">
          ${lineNumber}
        </button>

        <pre>${renderCodeHTML(line)}</pre>
      </div>
    `;
  }).join("");

  return `<div class="code-lines">${rows}</div>`;
}

function renderSeparatedBlocks(text) {
  currentParts = splitCode(text);

  activeType = null;

  selectedLines = new Set();

  expandedBlocks = new Set();

  renderBlockMode();
}