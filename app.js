const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");
const status = document.getElementById("status");

document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("gesturechange", e => e.preventDefault());
document.addEventListener("gestureend", e => e.preventDefault());

let activeType = null;
let currentParts = [];
let selectBox = null;
let statusWasPressed = false;
let selectedLines = new Set();
let expandedBlocks = new Set();

let selectBoxRAF = null;
let latestSelectBoxPoint = null;

if (status) {
  status.addEventListener("click", (e) => {
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
    .replace(/<\/?head[^>]*>/gi, "")
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

  const regex =
    /(<style\b[^>]*>[\s\S]*?<\/style>)|(<script\b[^>]*>[\s\S]*?<\/script>)|(<svg\b[\s\S]*?<\/svg>)|(<meta\b[^>]*>)|(<link\b[^>]*>)|(<title\b[^>]*>[\s\S]*?<\/title>)/gi;

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
    } else if (/^<meta/i.test(full) || /^<link/i.test(full) || /^<title/i.test(full)) {
      parts.push({
        type: "head",
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

  const type = guessInsertType(index);

  currentParts.splice(index, 0, {
    type,
    content: ""
  });

  expandedBlocks = new Set(
    [...expandedBlocks].map(i => i >= index ? i + 1 : i)
  );

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
        copyBtn.textContent = "COPY ALL";
      }, 900);
    }

  } catch (err) {
    alert("Copy failed. Try again.");
  }
}

function clearTextSelection() {
  const selection = window.getSelection();
  if (selection) selection.removeAllRanges();
}

function rangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }

  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;

    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }

  return null;
}

function getTextOffset(root, node, offset) {
  let total = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const textNode = walker.currentNode;

    if (textNode === node) return total + offset;

    total += textNode.textContent.length;
  }

  return total;
}

function clampNumber(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function makeSelectBox() {
  removeSelectBox();

  selectBox = document.createElement("div");
  selectBox.className = "custom-select-box";
  document.body.appendChild(selectBox);
}

function updateSelectBox(x1, y1, x2, y2) {
  if (!selectBox) return;

  selectBox.style.left = Math.min(x1, x2) + "px";
  selectBox.style.top = Math.min(y1, y2) + "px";
  selectBox.style.width = Math.abs(x2 - x1) + "px";
  selectBox.style.height = Math.abs(y2 - y1) + "px";
}

function scheduleSelectBoxUpdate(x1, y1, x2, y2) {
  latestSelectBoxPoint = { x1, y1, x2, y2 };

  if (selectBoxRAF) return;

  selectBoxRAF = requestAnimationFrame(() => {
    if (latestSelectBoxPoint) {
      updateSelectBox(
        latestSelectBoxPoint.x1,
        latestSelectBoxPoint.y1,
        latestSelectBoxPoint.x2,
        latestSelectBoxPoint.y2
      );
    }

    selectBoxRAF = null;
  });
}

function removeSelectBox() {
  if (selectBoxRAF) {
    cancelAnimationFrame(selectBoxRAF);
    selectBoxRAF = null;
  }

  latestSelectBoxPoint = null;

  if (selectBox) {
    selectBox.remove();
    selectBox = null;
  }
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

  button.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  button.addEventListener("click", (e) => {
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

  bar.addEventListener("pointerdown", (e) => {
    closeOtherEditors();

    startX = e.clientX;
    dx = 0;
    dragging = true;
    bar.setPointerCapture(e.pointerId);
  });

  bar.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
  });

  bar.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;

    if (Math.abs(dx) > 120) {
      codeView.querySelectorAll(".code-block").forEach(block => {
        block.classList.remove("active-type", "dimmed-type", "selected-block", "dragging-block");
        block.style.transform = "";
        block.style.opacity = "";
      });

      enterUnifiedMode();
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

    gap.addEventListener("pointerdown", (e) => {
      if (document.body.classList.contains("unified-mode")) return;

      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      dragging = true;

      gap.setPointerCapture(e.pointerId);
    });

    gap.addEventListener("pointermove", (e) => {
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
    label.addEventListener("pointerdown", (e) => {
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
  }

  function buttonFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return el.closest(".line-number-box");
  }

  buttons.forEach(button => {
    button.addEventListener("pointerdown", (e) => {
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

    button.addEventListener("pointermove", (e) => {
      if (!active || e.pointerId !== pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      applyButton(buttonFromPoint(e.clientX, e.clientY));
    });

    button.addEventListener("pointerup", (e) => {
      if (e.pointerId !== pointerId) return;

      active = false;
      pointerId = null;
      touched = new Set();

      try {
        button.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    button.addEventListener("pointercancel", (e) => {
      active = false;
      pointerId = null;
      touched = new Set();

      try {
        button.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
}

function enableSectionTapSelect() {
  const sections = [...codeView.querySelectorAll(".code-section")];

  sections.forEach(section => {
    section.addEventListener("click", (e) => {
      if (document.body.classList.contains("unified-mode")) return;
      if (e.target.closest(".block-editor")) return;
      if (e.target.closest(".function-line")) return;
      if (e.target.closest(".line-number-box")) return;

      const index = Number(section.dataset.index);
      const block = section.querySelector(".code-block");
      if (!block) return;

      if (!expandedBlocks.has(index)) {
        expandedBlocks.add(index);
        renderBlockMode();
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
      removeSelectBox();
    });
  });
}

function enableBlockSelectionAndErase() {
  const blocks = [...codeView.querySelectorAll(".code-block")];

  blocks.forEach((block) => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;
    let moved = false;
    let boxSelecting = false;

    function blockIsActiveForEditing() {
      if (document.body.classList.contains("unified-mode")) return false;
      if (!activeType) return true;
      return getBlockType(block) === activeType;
    }

    block.addEventListener("pointerdown", (e) => {
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

      const alreadySelected = block.classList.contains("selected-block");

      if (alreadySelected) {
        e.preventDefault();
        clearTextSelection();

        boxSelecting = true;
        dragging = false;

        makeSelectBox();
        updateSelectBox(startX, startY, startX, startY);

        block.setPointerCapture(e.pointerId);
        return;
      }

      boxSelecting = false;
      dragging = true;

      block.setPointerCapture(e.pointerId);
      clearTextSelection();
    });

    block.addEventListener("pointermove", (e) => {
      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      dx = e.clientX - startX;
      dy = e.clientY - startY;

      const distance = Math.hypot(dx, dy);
      if (distance > 2) moved = true;

      if (boxSelecting) {
        e.preventDefault();
        scheduleSelectBoxUpdate(startX, startY, e.clientX, e.clientY);
        return;
      }

      if (!dragging) return;

      if (distance > 18) {
        moved = true;
        block.classList.add("dragging-block");
        block.style.transform = `translate(${dx}px, ${dy}px)`;
        block.style.opacity = "0.82";
      }
    });

    block.addEventListener("pointerup", (e) => {
      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      if (boxSelecting) {
        e.preventDefault();

        boxSelecting = false;
        updateSelectBox(startX, startY, e.clientX, e.clientY);

        const codeLines = block.querySelector(".code-lines");

        if (codeLines && selectBox) {
          const box = selectBox.getBoundingClientRect();
          const startRange = rangeFromPoint(box.left, box.top);
          const endRange = rangeFromPoint(box.right, box.bottom);

          if (startRange && endRange) {
            let start = getTextOffset(codeLines, startRange.startContainer, startRange.startOffset);
            let end = getTextOffset(codeLines, endRange.startContainer, endRange.startOffset);

            if (start > end) {
              const temp = start;
              start = end;
              end = temp;
            }

            convertBlockToTextarea(block, start, end);
          }
        }

        removeSelectBox();

        try {
          block.releasePointerCapture(e.pointerId);
        } catch (err) {}

        return;
      }

      const wasDragging = dragging;
      dragging = false;

      if (!wasDragging) {
        removeSelectBox();
        return;
      }

      if (!moved) {
        closeOtherEditors(block);

        codeView.querySelectorAll(".code-block.selected-block").forEach(other => {
          if (other !== block && !other.classList.contains("editing-block")) {
            other.classList.remove("selected-block");
          }
        });

        block.classList.add("selected-block");
        removeSelectBox();

        try {
          block.releasePointerCapture(e.pointerId);
        } catch (err) {}

        return;
      }

      const distance = Math.hypot(dx, dy);
      const eraseThreshold = 120;

      if (distance > eraseThreshold) {
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
      removeSelectBox();

      try {
        block.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    block.addEventListener("pointercancel", (e) => {
      dragging = false;
      boxSelecting = false;

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";

      removeSelectBox();

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
  let globalLine = 1; // ✅ GLOBAL LINE COUNTER FIX

  currentParts.forEach((part, index) => {
    if (!part) return;

    const displayType = getDisplayType(part.type);
    const isExpanded = expandedBlocks.has(index);
    const collapsedClass = isExpanded ? "" : " collapsed-section";

    html += `
      <section class="code-section${collapsedClass}"
        data-type="${part.type}"
        data-section-id="${part.type}-${index}"
        data-index="${index}">

        <div class="section-label" data-index="${index}">
          ${displayType}
        </div>

        <div class="section-body">
          <div class="code-block type-${part.type}" data-index="${index}">
            ${renderCodeBlockHTML(
              part.content,
              index,
              !isExpanded,
              () => globalLine++   // ✅ GLOBAL LINE HOOK
            )}
          </div>
        </div>
      </section>
    `;

    html += `
      <div class="insert-gap" data-insert-index="${index + 1}"></div>
    `;
  });

  codeView.innerHTML = html;

  requestAnimationFrame(() => {
    codeView.scrollTop = scrollY;

    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
  });

  buildTypeToolbar();
  enableToolbarSwipe();
  enableInsertGapSwipe();
  enableBlockSelectionAndErase();
  enableSectionTapSelect();
  enableFunctionLineTap();
  enableLineNumberToggle();

  // ✅ NEW: SECTION TOGGLE HOOK
  codeView.querySelectorAll(".section-label").forEach(label => {
    label.addEventListener("click", () => {
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
    /(^|\n)(\s*(?:[.#][A-Za-z0-9_-]+)+(?:\s*[,{])?)/g,
    (full, lead, selector) => {
      if (!selector.includes("{")) return full;
      return `${lead}<span class="function-line" data-select-type="brace">${selector}</span>`;
    }
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
    .code-section.collapsed-section .section-body {
      cursor: pointer;
      opacity: .84;
    }

    .code-section.collapsed-section .code-block {
      min-height: 44px;
    }

    .collapsed-preview {
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

    .code-section.collapsed-section .section-label::after {
      content: " +";
      opacity: .5;
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