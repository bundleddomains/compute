const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");
const status = document.getElementById("status");

let activeType = null;
let currentParts = [];
let selectBox = null;
let statusWasPressed = false;

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

  if (isHeadTag(cleanedHTML)) {
    parts.push({
      type: "head",
      content: cleanedHTML
    });
  } else {
    parts.push({
      type: "html",
      content: cleanedHTML
    });
  }
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

function splitCode(text) {
  text = removePasteJunk(text);

  if (isStandaloneJS(text)) {
    return [{
      type: "js",
      content: text.trim()
    }];
  }

  const parts = [];

  const regex =
    /(<style\b[^>]*>[\s\S]*?<\/style>)|(<script\b[^>]*>[\s\S]*?<\/script>)|(<svg\b[\s\S]*?<\/svg>)|(<meta\b[^>]*>)|(<link\b[^>]*>)|(<title\b[^>]*>[\s\S]*?<\/title>)/gi;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();

    if (before) {
      pushCleanHTML(parts, before);
    }

    const full = match[0];

    if (/^<style/i.test(full)) {
      parts.push({
        type: "css",
        content: full
          .replace(/<style\b[^>]*>/i, "")
          .replace(/<\/style>/i, "")
          .trim()
      });
    }

    else if (/^<script/i.test(full)) {
      if (/\bsrc\s*=/.test(full)) {
        parts.push({
          type: "hidden",
          content: full.trim()
        });
      } else {
        parts.push({
          type: "js",
          content: full
            .replace(/<script\b[^>]*>/i, "")
            .replace(/<\/script>/i, "")
            .trim()
        });
      }
    }

    else if (/^<svg/i.test(full)) {
      parts.push({
        type: "svg",
        content: full.trim()
      });
    }

    else if (/^<meta/i.test(full) || /^<link/i.test(full) || /^<title/i.test(full)) {
      parts.push({
        type: "head",
        content: full.trim()
      });
    }

    lastIndex = regex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();

  if (after) {
    pushCleanHTML(parts, after);
  }

  return parts;
}

function guessInsertType(index) {
  if (activeType && activeType !== "head" && activeType !== "hidden") return activeType;

  const before = currentParts[index - 1];

  if (before) {
    if (before.type === "head" || before.type === "hidden") return "html";
    return before.type;
  }

  return "html";
}

function insertEmptyBlock(index) {
  closeOtherEditors();

  const type = guessInsertType(index);

  currentParts.splice(index, 0, {
    type,
    content: ""
  });

  renderBlockMode();

  requestAnimationFrame(() => {
    const block = codeView.querySelector(`.code-block[data-index="${index}"]`);
    if (block) {
      convertBlockToTextarea(block, 0, 0);
    }
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
    }

    else if (part.type === "css") {
      headParts.push(`<style>
${content}
</style>`);
    }

    else if (part.type === "js") {
      bodyParts.push(`<script>
${content}
</script>`);
    }

    else if (part.type === "hidden") {
      bodyParts.push(content);
    }

    else {
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

    if (textNode === node) {
      return total + offset;
    }

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

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  selectBox.style.left = left + "px";
  selectBox.style.top = top + "px";
  selectBox.style.width = width + "px";
  selectBox.style.height = height + "px";
}

function removeSelectBox() {
  if (selectBox) {
    selectBox.remove();
    selectBox = null;
  }
}

function boxOverlapsBlock(block) {
  if (!selectBox) return false;

  const a = selectBox.getBoundingClientRect();
  const b = block.getBoundingClientRect();

  return (
    a.right > b.left &&
    a.left < b.right &&
    a.bottom > b.top &&
    a.top < b.bottom
  );
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
  block.innerHTML = `<pre>${renderCodeHTML(newText)}</pre>`;
  clearTextSelection();
}

function convertBlockToTextarea(block, start = 0, end = 0) {
  if (block.classList.contains("editing-block")) return;

  const pre = block.querySelector("pre");
  if (!pre) return;

  const index = Number(block.dataset.index);
  const text = pre.textContent;

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
    editor.focus();
    autoSizeEditor(editor);
    editor.setSelectionRange(start, end);
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

  ["html", "css", "js", "svg"].forEach(type => {
    const button = document.createElement("button");
    button.className = `type-tool type-tool-${type}`;
    button.dataset.type = type;
    button.textContent = type.toUpperCase();

    button.addEventListener("click", () => {
      setActiveType(type);
    });

    bar.appendChild(button);
  });

  codeView.appendChild(bar);
}

function getUnifiedCleanText() {
  return buildFullFile()
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

function enterUnifiedMode() {
  activeType = null;
  document.body.classList.add("unified-mode");
  clearTextSelection();

  const clean = getUnifiedCleanText();

  codeView.innerHTML = `
    <pre>${escapeHTML(clean)}</pre>
  `;

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

function enableFunctionLineTap() {
  const labels = [...codeView.querySelectorAll(".function-line")];

  labels.forEach(label => {
    label.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
    });

    label.addEventListener("click", (e) => {
      e.stopPropagation();

      const block = label.closest(".code-block");
      if (!block) return;

      closeOtherEditors(block);

      codeView.querySelectorAll(".code-block.selected-block").forEach(other => {
        if (other !== block && !other.classList.contains("editing-block")) {
          other.classList.remove("selected-block");
        }
      });

      block.classList.add("selected-block");

      const pre = block.querySelector("pre");
      const text = pre ? pre.textContent : "";
      const functionName = label.textContent.trim();
      const start = text.indexOf(functionName);
      const safeStart = Math.max(0, start);
      const safeEnd = Math.max(0, start + functionName.length);

      convertBlockToTextarea(block, safeStart, safeEnd);
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
      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      moved = false;

      const alreadySelected =
        block.classList.contains("selected-block");

      if (alreadySelected) {
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

      if (distance > 8) {
        moved = true;
      }

      if (boxSelecting) {
        updateSelectBox(startX, startY, e.clientX, e.clientY);
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
        boxSelecting = false;

        const pre = block.querySelector("pre");

        if (pre && selectBox) {
          const box = selectBox.getBoundingClientRect();

          const startRange = rangeFromPoint(box.left, box.top);
          const endRange = rangeFromPoint(box.right, box.bottom);

          if (startRange && endRange) {
            let start = getTextOffset(
              pre,
              startRange.startContainer,
              startRange.startOffset
            );

            let end = getTextOffset(
              pre,
              endRange.startContainer,
              endRange.startOffset
            );

            if (start > end) {
              const temp = start;
              start = end;
              end = temp;
            }

            convertBlockToTextarea(block, start, end);
          }
        }

        removeSelectBox();
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

        block.classList.toggle("selected-block");
        removeSelectBox();
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
          renderBlockMode();
        }, 180);

        return;
      }

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";
      removeSelectBox();
    });

    block.addEventListener("pointercancel", () => {
      dragging = false;
      boxSelecting = false;

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";

      removeSelectBox();
    });
  });
}

    block.addEventListener("pointerup", () => {
      if (!blockIsActiveForEditing()) return;
      if (block.classList.contains("editing-block")) return;

      const wasDragging = dragging;
      const wasSelectingText = selectingText;

      dragging = false;
      selectingText = false;

      if (wasSelectingText) {
        const pre = block.querySelector("pre");

        if (pre && selectStartRange && selectEndRange) {
          let start = getTextOffset(pre, selectStartRange.startContainer, selectStartRange.startOffset);
          let end = getTextOffset(pre, selectEndRange.startContainer, selectEndRange.startOffset);

          if (start > end) {
            const temp = start;
            start = end;
            end = temp;
          }

          convertBlockToTextarea(block, start, end);
        }

        selectStartRange = null;
        selectEndRange = null;
        removeSelectBox();
        return;
      }

      if (!wasDragging) {
        removeSelectBox();
        return;
      }

      if (!moved) {
        closeOtherEditors(block);

        codeView.querySelectorAll(".code-block.selected-block").forEach(otherBlock => {
          if (otherBlock !== block && !otherBlock.classList.contains("editing-block")) {
            otherBlock.classList.remove("selected-block");
          }
        });

        block.classList.toggle("selected-block");
        removeSelectBox();
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
          renderBlockMode();
        }, 180);

        return;
      }

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";
      removeSelectBox();
    });

    block.addEventListener("pointercancel", () => {
      dragging = false;
      selectingText = false;
      selectStartRange = null;
      selectEndRange = null;

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";
      removeSelectBox();
    });
  });
}

function renderBlockMode(animated = false) {
  closeOtherEditors();

  document.body.classList.remove("unified-mode");

  scene.classList.add("hidden");
  codeView.classList.remove("hidden");
  codeView.classList.toggle("fade-in-blocks", animated);

  let html = "";

  currentParts.forEach((part, index) => {
    if (part.type === "head" || part.type === "hidden") return;

    html += `
      <section class="code-section" data-type="${part.type}" data-section-id="${part.type}-${index}">
        <div class="section-body">
          <div class="code-block type-${part.type}" data-index="${index}">
            <pre>${renderCodeHTML(part.content)}</pre>
          </div>
        </div>
      </section>
    `;

    html += `
      <div class="insert-gap" data-insert-index="${index + 1}"></div>
    `;
  });

  codeView.innerHTML = html;

  buildTypeToolbar();
  enableToolbarSwipe();
  enableInsertGapSwipe();
  enableBlockSelectionAndErase();
  enableFunctionLineTap();
}

function renderSeparatedBlocks(text) {
  currentParts = splitCode(text);
  activeType = null;
  renderBlockMode();
}

function renderCodeHTML(text) {
  return escapeHTML(text).replace(
    /(^|\n)(function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{)/g,
    '$1<span class="function-line">$2</span>'
  );
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function startDefaultCanvas() {
  codeView.classList.add("hidden");
  codeView.classList.remove("fade-in-blocks");
  scene.classList.remove("hidden");
  document.body.classList.remove("unified-mode");
  activeType = null;
  currentParts = [];
  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}