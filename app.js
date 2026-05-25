const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");
const status = document.getElementById("status");

document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("gesturechange", e => e.preventDefault());
document.addEventListener("gestureend", e => e.preventDefault());

let activeType = null;
let currentParts = [];
let statusWasPressed = false;
let selectedLines = new Set();
let expandedBlocks = new Set();
let collapsedFunctions = new Set();

let undoStack = [];

function saveUndoState() {
  undoStack.push({
    parts: JSON.parse(JSON.stringify(currentParts)),
    selected: [...selectedLines],
    expanded: [...expandedBlocks],
    active: activeType
  });

  if (undoStack.length > 25) undoStack.shift();
}

function undoLastChange() {
  closeOtherEditors();

  const last = undoStack.pop();
  if (!last) return;

  currentParts = last.parts;
  selectedLines = new Set(last.selected);
  expandedBlocks = new Set(last.expanded);
  activeType = last.active;

  renderBlockMode();
}

if (status) {
  status.addEventListener("click", e => {
    e.stopPropagation();
    statusWasPressed = true;
    status.classList.remove("status-faded");
    status.classList.add("status-green");
  });
}

function buildStartUI() {
  stack.innerHTML = "";
  stack.classList.remove("fade-out-start");

  const startMessage = document.createElement("div");
  startMessage.className = "start-message";
  startMessage.innerHTML = `
    Replace and Erase;<br>
    Luhvcraft sculpted intellectual form of silence through the art of preservation.
  `;

  const ghostTitle = document.createElement("div");
  ghostTitle.className = "ghost-title";
  ghostTitle.innerHTML = `
    <div>Replace</div>
    <div>&amp; Erase</div>
  `;

  const centerTitle = document.createElement("div");
  centerTitle.className = "center-title";
  centerTitle.innerHTML = `
    <span class="center-word word-replace">REPLACE</span>
    <span class="center-word word-and">AND</span>
    <span class="center-word word-erase">ERASE</span>
  `;

  stack.appendChild(startMessage);
  stack.appendChild(ghostTitle);
  stack.appendChild(centerTitle);

  stack.removeEventListener("click", handleWholeScreenPaste);
  stack.addEventListener("click", handleWholeScreenPaste);
}

async function handleWholeScreenPaste(e) {
  if (e.target.closest("#status")) return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) return;

    stack.classList.add("fade-out-start");

    setTimeout(() => {
      currentParts = splitCode(text);
      selectedLines = new Set();
      expandedBlocks = new Set();

      if (statusWasPressed && status) {
        status.classList.add("status-faded");
      }

      stack.removeEventListener("click", handleWholeScreenPaste);
      renderBlockMode(true);
    }, 320);
  } catch (err) {
    alert("Clipboard paste failed. Try copying the code again first.");
  }
}

function removePasteJunk(text) {
  return text
    .replace(/^\s*[\w\-(). ]+\.(png|jpg|jpeg|gif|webp|svg)\s*\n+/i, "")
    .trim();
}

function cleanHTMLShell(html) {
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
}

function isHeadTag(text) {
  const trimmed = text.trim();

  return (
    /^<meta\b/i.test(trimmed) ||
    /^<title\b/i.test(trimmed) ||
    /^<link\b/i.test(trimmed) ||
    /^<base\b/i.test(trimmed)
  );
}

function pushCleanHTML(parts, html) {
  const cleanedHTML = cleanHTMLShell(html);
  if (!cleanedHTML) return;

  parts.push({
    type: isHeadTag(cleanedHTML) ? "head" : "html",
    content: cleanedHTML
  });
}

function isStandaloneJS(text) {
  const trimmed = text.trim();

  const startsLikeJS =
    /^(const|let|var|function|async function|class)\b/.test(trimmed);

  const hasJSStructure =
    /\bfunction\s+[A-Za-z0-9_$]+\s*\(/.test(trimmed) ||
    /\bconst\s+[A-Za-z0-9_$]+\s*=/.test(trimmed) ||
    /\bdocument\.getElementById\b/.test(trimmed);

  const startsLikeHTML =
    /^<!doctype|^<html|^<head|^<body|^<div|^<style|^<script|^<svg/i.test(trimmed);

  return hasJSStructure && startsLikeJS && !startsLikeHTML;
}

function isStandaloneCSS(text) {
  const trimmed = text.trim();

  const startsLikeHTML =
    /^<!doctype|^<html|^<head|^<body|^<div|^<style|^<script|^<svg/i.test(trimmed);

  const hasCSSBlock =
    /[.#a-zA-Z0-9_*:\-\s,[\]="'>]+?\s*\{[\s\S]*?\}/.test(trimmed);

  const hasCSSProps =
    /[a-z-]+\s*:\s*[^;]+;/.test(trimmed);

  const hasJSStructure =
    /\bfunction\s+[A-Za-z0-9_$]+\s*\(/.test(trimmed) ||
    /\bdocument\.getElementById\b/.test(trimmed) ||
    /\bconst\s+[A-Za-z0-9_$]+\s*=/.test(trimmed);

  return hasCSSBlock && hasCSSProps && !startsLikeHTML && !hasJSStructure;
}

function splitCode(text) {
  text = removePasteJunk(text);

  if (isStandaloneJS(text)) {
    return [{ type: "js", content: text.trim() }];
  }

  if (isStandaloneCSS(text)) {
    return [{ type: "css", content: text.trim() }];
  }

  const parts = [];

  const headMatch = text.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);

  if (headMatch) {
    let headContent = headMatch[1];
    let extractedFromHead = "";

    headContent = headContent.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<svg\b[\s\S]*?<\/svg>/gi,
      match => {
        extractedFromHead += "\n" + match + "\n";
        return "";
      }
    );

    const cleanHead = headContent.trim();

    if (cleanHead) {
      parts.push({
        type: "head",
        content: cleanHead
      });
    }

    text = text.replace(headMatch[0], "\n" + extractedFromHead + "\n");
  }

  const regex =
    /(<style\b[^>]*>[\s\S]*?<\/style>)|(<script\b[^>]*>[\s\S]*?<\/script>)|(<svg\b[\s\S]*?<\/svg>)/gi;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) pushCleanHTML(parts, before);

    const full = match[0];

    if (/^<style/i.test(full)) {
      parts.push({
        type: "css",
        content: full.replace(/<style\b[^>]*>/i, "").replace(/<\/style>/i, "").trim()
      });
    } else if (/^<script/i.test(full)) {
      if (/\bsrc\s*=/.test(full)) {
        parts.push({
          type: "hidden",
          content: full.trim()
        });
      } else {
        parts.push({
          type: "js",
          content: full.replace(/<script\b[^>]*>/i, "").replace(/<\/script>/i, "").trim()
        });
      }
    } else if (/^<svg/i.test(full)) {
      parts.push({
        type: "svg",
        content: full.trim()
      });
    }

    lastIndex = regex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();
  if (after) pushCleanHTML(parts, after);

  return parts;
}

function guessInsertType(index) {
  if (activeType) return activeType;
  const before = currentParts[index - 1];
  if (before) return before.type;
  return "html";
}

function insertEmptyBlock(index) {
  closeOtherEditors();
  saveUndoState();

  const type = guessInsertType(index);

  currentParts.splice(index, 0, {
    type,
    content: ""
  });

  expandedBlocks = new Set([...expandedBlocks].map(i => i >= index ? i + 1 : i));
  expandedBlocks.add(index);

  renderBlockMode();

  requestAnimationFrame(() => {
    const block = codeView.querySelector(`.code-block[data-index="${index}"]`);
    if (block) convertBlockToTextarea(block, 0, 0);
  });
}

function buildFullFile() {
  closeOtherEditors();

  const headParts = [];
  const bodyParts = [];

  currentParts.forEach(part => {
    const content = part.content.trim();
    if (!content) return;

    if (part.type === "head") {
      headParts.push(content);
    } else if (part.type === "css") {
      headParts.push(`<style>
${content}
</style>`);
    } else if (part.type === "js") {
      bodyParts.push(`<script>
${content}
</script>`);
    } else if (part.type === "hidden") {
      bodyParts.push(content);
    } else {
      bodyParts.push(content);
    }
  });

  return `<!doctype html>
<html>
<head>
${headParts.join("\n")}
</head>
<body>
${bodyParts.join("\n\n")}
</body>
</html>`;
}

function getUnifiedCleanText() {
  const usableParts = currentParts.filter(part => {
    return part && part.content && part.content.trim();
  });

  if (usableParts.length === 1) {
    return usableParts[0].content.trim();
  }

  return buildFullFile()
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

async function copyFinalBuild() {
  closeOtherEditors();

  const finalCode = getUnifiedCleanText();

  try {
    await navigator.clipboard.writeText(finalCode);

    if (status) {
      status.textContent = "COPIED";
      status.classList.remove("status-faded");
      status.classList.add("status-green");
    }

    const copyBtn = document.querySelector(".copy-final-btn");
    if (copyBtn) {
      copyBtn.textContent = "COPIED";
      setTimeout(() => {
const phrases = [
  "i got u",
  "come back soon",
  "made with luhv",
  "DDD",
  "< : 3"
];

let phraseIndex = 0;

button.textContent = phrases[phraseIndex];

button.addEventListener("click", () => {
  phraseIndex++;

  if (phraseIndex >= phrases.length) {
    phraseIndex = 0;
  }

  button.textContent = phrases[phraseIndex];
});
      }, 900);
    }
  } catch (err) {
    alert("Copy failed. Try again.");
  }
}

function getSelectedLineGroups() {
  const groups = {};

  selectedLines.forEach(key => {
    const [block, line] = key.split(":").map(Number);
    if (!groups[block]) groups[block] = [];
    groups[block].push(line);
  });

  Object.keys(groups).forEach(block => {
    groups[block].sort((a, b) => a - b);
  });

  return groups;
}

function replaceSelectedLinesWithText(newText) {
  closeOtherEditors();

  const groups = getSelectedLineGroups();
  const blockIndexes = Object.keys(groups).map(Number).sort((a, b) => a - b);
  if (!blockIndexes.length) return;
  saveUndoState();

  const pasteLines = String(newText).split("\n");
  const firstBlock = blockIndexes[0];

  blockIndexes.forEach(blockIndex => {
    const part = currentParts[blockIndex];
    if (!part) return;

    const lines = part.content.split("\n");
    const selected = new Set(groups[blockIndex]);
    const minLine = Math.min(...groups[blockIndex]);
    const insertAt = Math.max(0, minLine - 1);

    const kept = lines.filter((line, i) => !selected.has(i + 1));

    if (blockIndex === firstBlock && newText !== "") {
      kept.splice(insertAt, 0, ...pasteLines);
    }

    part.content = kept.join("\n");
  });

  selectedLines = new Set();
  renderBlockMode();
}

function eraseSelectedLines() {
  replaceSelectedLinesWithText("");
}

async function pasteIntoSelectedLines() {
  if (!selectedLines.size) return;

  try {
    const text = await navigator.clipboard.readText();
    replaceSelectedLinesWithText(text);
  } catch (err) {
    alert("Paste failed. Copy text first.");
  }
}
async function addBetweenSelectedLines() {
  if (selectedLines.size !== 2) return;

  const selected = [...selectedLines].map(key => {
    const [block, line] = key.split(":").map(Number);
    return { block, line };
  });

  if (selected[0].block !== selected[1].block) return;

  selected.sort((a, b) => a.line - b.line);

  if (selected[1].line !== selected[0].line + 1) return;

  const part = currentParts[selected[0].block];
  if (!part) return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;

    saveUndoState();

    const lines = part.content.split("\n");
    lines.splice(selected[0].line, 0, ...String(text).split("\n"));

    part.content = lines.join("\n");
    selectedLines = new Set();
    renderBlockMode();
  } catch (err) {
    alert("AND failed. Copy text first.");
  }
}
function buildSelectedLineTools() {
  const old = document.querySelector(".selected-line-tools");
  if (old) old.remove();

  const tools = document.createElement("div");
  tools.className = "selected-line-tools";
  tools.innerHTML = `
    <button type="button" class="selected-replace-btn">REPLACE</button>
    <button type="button" class="selected-and-btn">AND</button>
    <button type="button" class="selected-erase-btn">ERASE</button>
  `;

  tools.querySelector(".selected-replace-btn").addEventListener("click", e => {
    e.stopPropagation();
    pasteIntoSelectedLines();
  });

  tools.querySelector(".selected-and-btn").addEventListener("click", e => {
    e.stopPropagation();
    addBetweenSelectedLines();
  });

  tools.querySelector(".selected-erase-btn").addEventListener("click", e => {
    e.stopPropagation();
    eraseSelectedLines();
  });

  document.body.appendChild(tools);
  updateSelectedLineTools();
}



function updateSelectedLineTools() {
  const tools = document.querySelector(".selected-line-tools");
  if (!tools) return;

  tools.classList.toggle("show-selected-tools", selectedLines.size > 0);

  const andBtn = tools.querySelector(".selected-and-btn");
  if (!andBtn) return;

  const selected = [...selectedLines].map(key => {
    const [block, line] = key.split(":").map(Number);
    return { block, line };
  });

  const canAnd =
    selected.length === 2 &&
    selected[0].block === selected[1].block &&
    Math.abs(selected[0].line - selected[1].line) === 1;

  andBtn.disabled = !canAnd;
  andBtn.classList.toggle("and-ready", canAnd);
}

document.addEventListener("keydown", e => {
  if (!selectedLines.size) return;
  if (e.target.closest("textarea, input, [contenteditable='true']")) return;

  if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    eraseSelectedLines();
  }
});

document.addEventListener("paste", e => {
  if (!selectedLines.size) return;
  if (e.target.closest("textarea, input, [contenteditable='true']")) return;

  const text = e.clipboardData.getData("text/plain");
  if (!text) return;

  e.preventDefault();
  replaceSelectedLinesWithText(text);
});

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

function saveTextareaBlock(block) {
  if (!block.classList.contains("editing-block")) return;

  const editor = block.querySelector(".block-editor");
  if (!editor) return;

  const index = Number(block.dataset.index);
  const newText = editor.value;

  if (currentParts[index]) {
    currentParts[index].content = newText;
  }

  block.classList.remove("editing-block", "selected-block");
  block.innerHTML = renderCodeBlockHTML(newText, index, false);
  clearTextSelection();
  enableLineNumberToggle();
  enableFunctionLineTap();
}

function convertBlockToTextarea(block, start = 0, end = 0) {
  if (block.classList.contains("editing-block")) return;

  const scrollY = codeView.scrollTop;
  const index = Number(block.dataset.index);

  expandedBlocks.add(index);

  const text = currentParts[index] ? currentParts[index].content : block.textContent;

  start = clampNumber(start, 0, text.length);
  end = clampNumber(end, 0, text.length);

  block.classList.add("editing-block", "selected-block");
  block.innerHTML = "";

  const editor = document.createElement("textarea");
  editor.className = "block-editor";
  editor.value = text;

  editor.spellcheck = false;
  editor.autocapitalize = "off";
  editor.autocomplete = "off";
  editor.autocorrect = "off";
  editor.inputMode = "text";

  block.appendChild(editor);

  editor.addEventListener("input", () => {
    autoSizeEditor(editor);

    if (currentParts[index]) {
      currentParts[index].content = editor.value;
    }
  });

  editor.addEventListener("blur", () => {
    saveTextareaBlock(block);
  });

  requestAnimationFrame(() => {
    editor.focus({ preventScroll: true });
    autoSizeEditor(editor);
    editor.setSelectionRange(start, end);
    codeView.scrollTop = scrollY;
  });
}

function closeOtherEditors(exceptBlock = null) {
  codeView.querySelectorAll(".code-block.editing-block").forEach(block => {
    if (block !== exceptBlock) saveTextareaBlock(block);
  });
}

function getBlockType(block) {
  if (block.classList.contains("type-head")) return "head";
  if (block.classList.contains("type-hidden")) return "hidden";
  if (block.classList.contains("type-html")) return "html";
  if (block.classList.contains("type-css")) return "css";
  if (block.classList.contains("type-js")) return "js";
  if (block.classList.contains("type-svg")) return "svg";
  return null;
}

function setActiveType(type) {
  closeOtherEditors();

  if (document.body.classList.contains("unified-mode")) {
    document.body.classList.remove("unified-mode");
    activeType = null;
    renderBlockMode();
  }

  activeType = activeType === type ? null : type;

  const blocks = [...codeView.querySelectorAll(".code-block")];
  const buttons = [...document.querySelectorAll(".type-tool")];

  buttons.forEach(button => {
    button.classList.toggle("active-tool", button.dataset.type === activeType);
  });

  blocks.forEach(block => {
    const blockType = getBlockType(block);

    block.classList.remove("active-type", "dimmed-type", "selected-block", "dragging-block");
    block.style.transform = "";
    block.style.opacity = "";

    if (!activeType) return;

    if (blockType === activeType) {
      block.classList.add("active-type");
    } else {
      block.classList.add("dimmed-type");
    }
  });

  clearTextSelection();
}

function buildTypeToolbar() {
  const bar = document.createElement("div");
  bar.className = "type-toolbar";

  ["head", "html", "css", "js", "svg", "hidden"].forEach(type => {
    const button = document.createElement("button");
    button.className = `type-tool type-tool-${type}`;
    button.dataset.type = type;
    button.textContent = type === "hidden" ? "SRC" : type.toUpperCase();

    button.addEventListener("click", () => {
      setActiveType(type);
    });

    bar.appendChild(button);
  });

  codeView.appendChild(bar);
}

function buildCopyFinalButton() {
  const button = document.createElement("button");
  button.className = "copy-final-btn";
  button.textContent = "COPY ALL";

  button.style.position = "fixed";
  button.style.right = "18px";
  button.style.bottom = "76px";
  button.style.zIndex = "90";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.padding = "12px 16px";
  button.style.background = "#111";
  button.style.color = "white";
  button.style.fontSize = "11px";
  button.style.fontWeight = "900";
  button.style.letterSpacing = ".08em";
  button.style.boxShadow = "0 10px 24px rgba(0,0,0,.18)";
  button.style.cursor = "pointer";
  button.style.touchAction = "manipulation";

  button.addEventListener("pointerdown", e => {
    e.stopPropagation();
  });

  button.addEventListener("click", e => {
    e.stopPropagation();
    copyFinalBuild();
  });

  return button;
}

function enterUnifiedMode() {
  closeOtherEditors();

  activeType = null;
  document.body.classList.add("unified-mode");
  clearTextSelection();

  const clean = getUnifiedCleanText();

  codeView.innerHTML = `
    <pre>${escapeHTML(clean)}</pre>
  `;

  codeView.appendChild(buildCopyFinalButton());
  buildTypeToolbar();
  enableToolbarSwipe();
}

function enableToolbarSwipe() {
  const bar = document.querySelector(".type-toolbar");
  if (!bar) return;

  let startX = 0;
  let dx = 0;
  let dragging = false;

  bar.addEventListener("pointerdown", e => {
    closeOtherEditors();

    startX = e.clientX;
    dx = 0;
    dragging = true;
    bar.setPointerCapture(e.pointerId);
  });

  bar.addEventListener("pointermove", e => {
    if (!dragging) return;
    dx = e.clientX - startX;
  });

  bar.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;

    if (dx > 120) {
      enterUnifiedMode();
    }

    if (dx < -120) {
      undoLastChange();
    }
  });

  bar.addEventListener("pointercancel", () => {
    dragging = false;
  });
}

function enableInsertGapSwipe() {
  const gaps = [...codeView.querySelectorAll(".insert-gap")];

  gaps.forEach(gap => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;

    gap.addEventListener("pointerdown", e => {
      if (document.body.classList.contains("unified-mode")) return;

      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      dragging = true;

      gap.setPointerCapture(e.pointerId);
    });

    gap.addEventListener("pointermove", e => {
      if (!dragging) return;

      dx = e.clientX - startX;
      dy = e.clientY - startY;
    });

    gap.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;

      const horizontalSwipe = Math.abs(dx) > 90;
      const mostlyHorizontal = Math.abs(dx) > Math.abs(dy) * 1.4;

      if (horizontalSwipe && mostlyHorizontal) {
        const index = Number(gap.dataset.insertIndex);
        insertEmptyBlock(index);
      }
    });

    gap.addEventListener("pointercancel", () => {
      dragging = false;
    });
  });
}

function findMatchingFunctionEnd(text, startIndex) {
  const openIndex = text.indexOf("{", startIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringChar) {
        inString = false;
        stringChar = "";
      }

      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) {
      return i + 1;
    }
  }

  return null;
}

function enableFunctionLineTap() {
  const labels = [...codeView.querySelectorAll(".function-line")];

  labels.forEach(label => {
    label.addEventListener("pointerdown", e => {
      e.stopPropagation();

      const block = label.closest(".code-block");
      if (!block) return;

      const index = Number(block.dataset.index);
      expandedBlocks.add(index);

      const text = currentParts[index] ? currentParts[index].content : "";
      const functionHeader = label.textContent.trim();

      closeOtherEditors(block);

      codeView.querySelectorAll(".code-block.selected-block").forEach(other => {
        if (other !== block && !other.classList.contains("editing-block")) {
          other.classList.remove("selected-block");
        }
      });

      block.classList.add("selected-block");

      const start = text.indexOf(functionHeader);
      if (start === -1) return;

      const end = findMatchingFunctionEnd(text, start);
      if (end === null) return;

      convertBlockToTextarea(block, start, end);
    });
  });
}

function enableLineNumberToggle() {
  const buttons = [...codeView.querySelectorAll(".line-number-box")];

  let active = false;
  let mode = "add";
  let pointerId = null;
  let touched = new Set();

  function applyButton(button) {
    if (!button) return;

    const block = button.dataset.block;
    const line = button.dataset.line;
    const key = `${block}:${line}`;

    if (touched.has(key)) return;
    touched.add(key);

    if (mode === "remove") {
      selectedLines.delete(key);
    } else {
      selectedLines.add(key);
    }

    const row = button.closest(".code-line");
    if (row) row.classList.toggle("selected-line", selectedLines.has(key));

    updateSelectedLineTools();
  }

  function buttonFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return el.closest(".line-number-box");
  }

  buttons.forEach(button => {
    button.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();

      const key = `${button.dataset.block}:${button.dataset.line}`;

      active = true;
      pointerId = e.pointerId;
      touched = new Set();
      mode = selectedLines.has(key) ? "remove" : "add";

      button.setPointerCapture(e.pointerId);
      applyButton(button);
    });

    button.addEventListener("pointermove", e => {
      if (!active || e.pointerId !== pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      applyButton(buttonFromPoint(e.clientX, e.clientY));
    });

    button.addEventListener("pointerup", e => {
      if (e.pointerId !== pointerId) return;

      active = false;
      pointerId = null;
      touched = new Set();

      try {
        button.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    button.addEventListener("pointercancel", e => {
      active = false;
      pointerId = null;
      touched = new Set();

      try {
        button.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    button.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
}

function enableSectionTapSelect() {
  const sections = [...codeView.querySelectorAll(".code-section")];

  sections.forEach(section => {
    section.addEventListener("click", e => {
      if (document.body.classList.contains("unified-mode")) return;
      if (e.target.closest(".block-editor")) return;
      if (e.target.closest(".function-line")) return;
      if (e.target.closest(".line-number-box")) return;
      if (e.target.closest(".selected-line-tools")) return;

      const index = Number(section.dataset.index);
      const block = section.querySelector(".code-block");
      if (!block) return;

      if (!expandedBlocks.has(index)) {
  expandedBlocks.add(index);
  renderBlockMode();
  return;
}

if (e.target.closest(".section-label")) {
  toggleSection(index);
  return;
}

      if (block.classList.contains("editing-block")) return;
      if (activeType && getBlockType(block) !== activeType) return;

      closeOtherEditors(block);

      codeView.querySelectorAll(".code-block.selected-block").forEach(other => {
        if (other !== block && !other.classList.contains("editing-block")) {
          other.classList.remove("selected-block");
        }
      });

      block.classList.add("selected-block");
      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";

      clearTextSelection();
    });
  });
}

function enableBlockSelectionAndErase() {
  const blocks = [...codeView.querySelectorAll(".code-block")];

  blocks.forEach(block => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;
    let moved = false;

    function blockIsActiveForEditing() {
      if (document.body.classList.contains("unified-mode")) return false;
      if (!activeType) return true;
      return getBlockType(block) === activeType;
    }

    block.addEventListener("pointerdown", e => {
      if (e.target.closest(".line-number-box")) return;
      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      const index = Number(block.dataset.index);
      if (!expandedBlocks.has(index)) return;

      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      moved = false;
      dragging = true;

      block.setPointerCapture(e.pointerId);
      clearTextSelection();
    });

    block.addEventListener("pointermove", e => {
      if (!dragging) return;
      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      dx = e.clientX - startX;
      dy = e.clientY - startY;

      const distance = Math.hypot(dx, dy);
      if (distance > 2) moved = true;

      if (distance > 18) {
        block.classList.add("dragging-block");
        block.style.transform = `translate(${dx}px, ${dy}px)`;
        block.style.opacity = "0.82";
      }
    });

    block.addEventListener("pointerup", e => {
      if (!dragging) return;

      dragging = false;

      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      if (!moved) {
        closeOtherEditors(block);

        codeView.querySelectorAll(".code-block.selected-block").forEach(other => {
          if (other !== block && !other.classList.contains("editing-block")) {
            other.classList.remove("selected-block");
          }
        });

        block.classList.add("selected-block");

        try {
          block.releasePointerCapture(e.pointerId);
        } catch (err) {}

        return;
      }

      const distance = Math.hypot(dx, dy);
      const eraseThreshold = 120;

      if (distance > eraseThreshold) {
  saveUndoState();

  const index = Number(block.dataset.index);
        block.classList.add("erasing-block");

        setTimeout(() => {
          currentParts[index] = null;
          currentParts = currentParts.filter(Boolean);

          expandedBlocks = new Set(
            [...expandedBlocks]
              .filter(i => i !== index)
              .map(i => i > index ? i - 1 : i)
          );

          cleanSelectedLines();
          renderBlockMode();
        }, 180);

        return;
      }

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";

      try {
        block.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    block.addEventListener("pointercancel", e => {
      dragging = false;

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";

      try {
        block.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });
  });
}

function cleanSelectedLines() {
  const validKeys = new Set();

  currentParts.forEach((part, blockIndex) => {
    if (!part || typeof part.content !== "string") return;

    const lineCount = part.content.split("\n").length;

    for (let i = 1; i <= lineCount; i++) {
      validKeys.add(`${blockIndex}:${i}`);
    }
  });

  selectedLines = new Set([...selectedLines].filter(key => validKeys.has(key)));
}

function getDisplayType(type) {
  if (type === "hidden") return "script-src";
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
function getBrownIndexLabel(part, index) {
  const content = String(part.content || "").trim();

  const classMatch = content.match(/class=["']([^"']+)["']/i);
  const idMatch = content.match(/id=["']([^"']+)["']/i);
  const functionMatch = content.match(/function\s+([A-Za-z0-9_$]+)/);
  const cssMatch = content.match(/([.#][A-Za-z0-9_-]+)\s*\{/);

  if (idMatch) return "#" + idMatch[1];
  if (classMatch) return "." + classMatch[1].split(/\s+/)[0];
  if (functionMatch) return functionMatch[1] + "()";
  if (cssMatch) return cssMatch[1];

return `${part.type}-${index + 1}`;
}

function buildBrownIndexBar() {
  const old = codeView.querySelector(".brown-index-wrap");
  if (old) old.remove();

  if (!currentParts.length) return;

  const wrap = document.createElement("div");
  wrap.className = "brown-index-wrap";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "function-menu-toggle";
  toggle.textContent = "FUNCTIONS";

const menu = document.createElement("div");
menu.className = "brown-index-menu";

const labellessMenu = document.createElement("div");
labellessMenu.className = "brown-index-menu";

const labellessToggle = document.createElement("button");
labellessToggle.type = "button";
labellessToggle.className = "function-menu-toggle";
labellessToggle.textContent = "LABELLESS";

labellessToggle.addEventListener("click", e => {
  e.stopPropagation();
  wrap.classList.toggle("open-labelless-menu");
});

wrap.appendChild(labellessToggle);
wrap.appendChild(labellessMenu);

  const items = [];

  currentParts.forEach((part, index) => {
    if (!part || !part.content) return;
    
const content = String(part.content).trim();

const hasNamedFunction =
  /function\s+([A-Za-z0-9_$]+)\s*\(/.test(content);

const hasAnyCode =
  content.length > 0;

if (
  part.type === "js" &&
  hasAnyCode &&
  !hasNamedFunction
) {
  const chip = document.createElement("button");

  chip.type = "button";
  chip.className = "brown-index-chip";
  chip.textContent = `js-${index + 1}`;

  chip.addEventListener("click", async e => {
    e.stopPropagation();

    try {
      const newText = await navigator.clipboard.readText();
      if (!newText || !newText.trim()) return;

      saveUndoState();

      currentParts[index].content = newText.trim();

      expandedBlocks.add(index);

      renderBlockMode();

    } catch (err) {
      alert("Labelless replace failed.");
    }
  });

  labellessMenu.appendChild(chip);
}
    const content = String(part.content);
    const functionMatches = [...content.matchAll(/function\s+([A-Za-z0-9_$]+)\s*\(/g)];

    if (part.type === "js" && functionMatches.length) {
      functionMatches.forEach(match => {
        items.push({
          index,
          label: match[1] + "()",
          startText: match[0],
          kind: "function"
        });
      });
    }
  });

  items.sort((a, b) => a.label.localeCompare(b.label));

  items.forEach(item => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "brown-index-chip";
    chip.textContent = item.label;

    chip.addEventListener("click", async e => {
      e.stopPropagation();

      try {
        const newText = await navigator.clipboard.readText();
        if (!newText || !newText.trim()) return;

        const part = currentParts[item.index];
        if (!part) return;

        saveUndoState();

        const text = part.content;
        const start = text.indexOf(item.startText);
        if (start === -1) return;

        const end = findMatchingFunctionEnd(text, start);
        if (end === null) {
          alert("Could not find function ending. Check for missing }");
          return;
        }

        part.content =
          text.slice(0, start) +
          newText.trim() +
          text.slice(end);

        selectedLines = new Set();
        expandedBlocks.add(item.index);

        wrap.classList.remove("open-function-menu");

        renderBlockMode();

      } catch (err) {
        alert("Function paste update failed. Copy code first.");
      }
    });

    menu.appendChild(chip);
  });

  toggle.addEventListener("click", e => {
    e.stopPropagation();
    wrap.classList.toggle("open-function-menu");
  });

  wrap.appendChild(toggle);
  wrap.appendChild(menu);

  codeView.prepend(wrap);
}

     

function renderBlockMode(animated = false) {
  closeOtherEditors();

  document.body.classList.remove("unified-mode");

  scene.classList.add("hidden");
  codeView.classList.remove("hidden");
  codeView.classList.toggle("fade-in-blocks", animated);

  cleanSelectedLines();

  const scrollY = codeView.scrollTop;
  const activeElement = document.activeElement;

  let html = "";

  currentParts.forEach((part, index) => {
    if (!part) return;

    const displayType = getDisplayType(part.type);
    const isExpanded = expandedBlocks.has(index);
    const blockMinClass = isExpanded ? "" : " minimized-block";

    html += `
      <section class="code-section"
        data-type="${part.type}"
        data-section-id="${part.type}-${index}"
        data-index="${index}">

        <div class="section-label" data-index="${index}">
          ${displayType}
        </div>

        <div class="section-body">
          <div class="code-block type-${part.type}${blockMinClass}" data-index="${index}">
            ${renderCodeBlockHTML(part.content, index, !isExpanded)}
          </div>
        </div>
      </section>
    `;

    html += `<div class="insert-gap" data-insert-index="${index + 1}"></div>`;
  });

  codeView.innerHTML = html;
  buildBrownIndexBar();

  requestAnimationFrame(() => {
    codeView.scrollTop = scrollY;

    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
  });

  buildTypeToolbar();
  buildSelectedLineTools();
  enableToolbarSwipe();
  enableInsertGapSwipe();
  enableBlockSelectionAndErase();
  enableSectionTapSelect();
  enableFunctionLineTap();
  enableLineNumberToggle();

  codeView.querySelectorAll(".section-label").forEach(label => {
    label.addEventListener("click", e => {
      e.stopPropagation();
      const index = Number(label.dataset.index);
      toggleSection(index);
    });
  });
}

function renderSeparatedBlocks(text) {
  currentParts = splitCode(text);
  activeType = null;
  selectedLines = new Set();
  expandedBlocks = new Set();
  renderBlockMode();
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
    const selected = selectedLines.has(key) ? " selected-line" : "";

    return `
      <div class="code-line${selected}" data-line="${lineNumber}">
        <button class="line-number-box" data-block="${blockIndex}" data-line="${lineNumber}" type="button">
          ${lineNumber}
        </button>
        <pre>${renderCodeHTML(line)}</pre>
      </div>
    `;
  }).join("");

  return `<div class="code-lines">${rows}</div>`;
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

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function injectCollapsedStyles() {
  if (document.getElementById("collapsed-block-style")) return;

  const style = document.createElement("style");
  style.id = "collapsed-block-style";
style.textContent = `
.brown-index-wrap.open-labelless-menu .brown-index-menu {
  display: flex;
}
.brown-index-wrap {
  position: sticky;
  top: 0;
  z-index: 120;
  padding: 10px;
  background: #150d08;
  border-bottom: 1px solid #6b3f22;
}

.function-menu-toggle {
  border: 1px solid #7b4a2a;
  border-radius: 999px;
  padding: 10px 14px;
  background: #3a2416;
  color: #ffd6aa;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .08em;
  cursor: pointer;
}

.brown-index-menu {
  display: none;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  padding-top: 10px;
}

.brown-index-wrap.open-function-menu .brown-index-menu {
  display: flex;
}
  .brown-index-bar {
  position: sticky;
  top: 0;
  z-index: 120;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px;
  background: #150d08;
  border-bottom: 1px solid #6b3f22;
}

.brown-index-chip {
  flex: none;
  border: 1px solid #7b4a2a;
  border-radius: 999px;
  padding: 8px 12px;
  background: #3a2416;
  color: #ffd6aa;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .04em;
  white-space: nowrap;
  cursor: pointer;
}

.brown-index-chip:active {
  transform: scale(.96);
}

.brown-index-flash {
  outline: 2px solid #ffb56b;
  box-shadow: 0 0 24px #ff9b3d88;
}
    .code-block.minimized-block {
      min-height: 44px;
      max-height: 62px;
      overflow: hidden;
      opacity: .86;
    }

    .code-block.minimized-block .collapsed-preview {
      min-height: 44px;
      padding: 10px 12px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      pointer-events: none;
    }

    .collapsed-preview span {
      flex: 0 0 auto;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      opacity: .52;
      white-space: nowrap;
    }

    .collapsed-preview pre {
      margin: 0;
      opacity: .74;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    .code-block.minimized-block::after {
      content: " +";
      opacity: .45;
    }

    .selected-line-tools {
      position: fixed;
      left: 18px;
      bottom: 76px;
      z-index: 91;
      display: none;
      gap: 8px;
    }

    .selected-line-tools.show-selected-tools {
      display: flex;
    }

    .selected-line-tools button {
      border: 0;
      border-radius: 999px;
      padding: 12px 14px;
      background: #111;
      color: white;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      box-shadow: 0 10px 24px rgba(0,0,0,.18);
      cursor: pointer;
      touch-action: manipulation;
    }
  `;

  document.head.appendChild(style);
}
  

function startDefaultCanvas() {
  injectCollapsedStyles();

  codeView.classList.add("hidden");
  codeView.classList.remove("fade-in-blocks");
  scene.classList.remove("hidden");
  document.body.classList.remove("unified-mode");
  activeType = null;
  currentParts = [];
  selectedLines = new Set();
  expandedBlocks = new Set();
  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}