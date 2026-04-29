const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");

let activeType = null;
let currentParts = [];

function buildStartUI() {
  stack.innerHTML = "";

  const startMessage = document.createElement("div");
  startMessage.className = "start-message";
  startMessage.innerHTML = `
    Replace and Erase;<br>
    Luhvcraft sculpted intellectual form of silence through the art of preservation.
  `;

  const mainBox = makeMainPasteBox();

  stack.appendChild(startMessage);
  stack.appendChild(mainBox);
}

function makeMainPasteBox() {
  const box = document.createElement("textarea");
  box.className = "start-button main-button main-paste";
  box.value = "REPLACE AND ERASE";

  box.spellcheck = false;
  box.autocapitalize = "off";
  box.autocomplete = "off";
  box.autocorrect = "off";

  box.addEventListener("focus", () => {
    box.setSelectionRange(0, box.value.length);
  });

  box.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    currentParts = splitCode(text);
    renderBlockMode();
  });

  return box;
}

function splitCode(text) {
  const parts = [];
  const regex = /(<style\b[^>]*>[\s\S]*?<\/style>)|(<script\b[^>]*>[\s\S]*?<\/script>)|(<svg\b[\s\S]*?<\/svg>)/gi;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();

    if (before) {
      parts.push({ type: "html", content: before });
    }

    const full = match[0];

    if (/^<style/i.test(full)) {
      parts.push({
        type: "css",
        content: full.replace(/<style\b[^>]*>/i, "").replace(/<\/style>/i, "").trim()
      });
    } else if (/^<script/i.test(full)) {
      parts.push({
        type: "js",
        content: full.replace(/<script\b[^>]*>/i, "").replace(/<\/script>/i, "").trim()
      });
    } else if (/^<svg/i.test(full)) {
      parts.push({
        type: "svg",
        content: full.trim()
      });
    }

    lastIndex = regex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();

  if (after) {
    parts.push({ type: "html", content: after });
  }

  return parts;
}

function clearTextSelection() {
  const selection = window.getSelection();
  if (selection) selection.removeAllRanges();
}

function selectBlockText(block) {
  const pre = block.querySelector("pre");
  if (!pre) return;

  const range = document.createRange();
  range.selectNodeContents(pre);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function convertBlockToTextarea(block) {
  if (block.classList.contains("editing-block")) return;

  const pre = block.querySelector("pre");
  if (!pre) return;

  const index = Number(block.dataset.index);
  const text = pre.textContent;

  block.classList.add("editing-block");
  block.innerHTML = "";

  const editor = document.createElement("textarea");
  editor.className = "block-editor";
  editor.value = text;

  editor.spellcheck = false;
  editor.autocapitalize = "off";
  editor.autocomplete = "off";
  editor.autocorrect = "off";

  block.appendChild(editor);

  requestAnimationFrame(() => {
    editor.focus();
    editor.setSelectionRange(0, editor.value.length);
  });

  editor.addEventListener("blur", () => {
    const newText = editor.value;

    if (currentParts[index]) {
      currentParts[index].content = newText;
    }

    block.classList.remove("editing-block");
    block.innerHTML = `<pre>${escapeHTML(newText)}</pre>`;
  });
}

function getBlockType(block) {
  if (block.classList.contains("type-html")) return "html";
  if (block.classList.contains("type-css")) return "css";
  if (block.classList.contains("type-js")) return "js";
  if (block.classList.contains("type-svg")) return "svg";
  return null;
}

function setActiveType(type) {
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

    block.classList.remove("active-type", "dimmed-type", "selected-block");

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
  let full = currentParts
    .map(part => part.content.trim())
    .filter(Boolean)
    .join("\n");

  full = full
    .replace(/\n\s*\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();

  return full;
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

function enableBlockSelectionAndErase() {
  const blocks = [...codeView.querySelectorAll(".code-block")];

  blocks.forEach((block) => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;
    let moved = false;
    let holdTimer = null;
    let holdActivated = false;

    function clearHoldTimer() {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    }

    function blockIsActiveForEditing() {
      if (document.body.classList.contains("unified-mode")) return false;
      if (!activeType) return true;
      return getBlockType(block) === activeType;
    }

    block.addEventListener("pointerdown", (e) => {
      if (block.classList.contains("editing-block")) return;
      if (!blockIsActiveForEditing()) return;

      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      moved = false;
      holdActivated = false;

      const isSelected = block.classList.contains("selected-block");
      dragging = !isSelected;

      if (dragging) {
        block.setPointerCapture(e.pointerId);
      }

      clearHoldTimer();

      if (isSelected) {
        holdTimer = setTimeout(() => {
          holdActivated = true;
          convertBlockToTextarea(block);
        }, 520);
      }
    });

    block.addEventListener("pointermove", (e) => {
      if (
        !dragging ||
        block.classList.contains("editing-block") ||
        block.classList.contains("selected-block") ||
        !blockIsActiveForEditing()
      ) return;

      dx = e.clientX - startX;
      dy = e.clientY - startY;

      if (Math.hypot(dx, dy) > 8) {
        moved = true;
        clearHoldTimer();

        block.classList.add("dragging-block");
        block.style.transform = `translate(${dx}px, ${dy}px)`;
        block.style.opacity = "0.82";
      }
    });

    block.addEventListener("pointerup", () => {
      if (!blockIsActiveForEditing()) return;

      const wasDragging = dragging;
      dragging = false;
      clearHoldTimer();

      if (holdActivated) {
        block.classList.remove("dragging-block");
        block.style.transform = "";
        block.style.opacity = "";
        return;
      }

      if (!wasDragging) {
        if (!moved) {
          const isNowSelected = !block.classList.contains("selected-block");

          block.classList.toggle("selected-block");

          if (isNowSelected) {
            selectBlockText(block);
          } else {
            clearTextSelection();
          }
        }

        return;
      }

      const distance = Math.hypot(dx, dy);
      const eraseThreshold = 120;

      if (moved && distance > eraseThreshold) {
        const index = Number(block.dataset.index);

        block.classList.add("erasing-block");

        setTimeout(() => {
          currentParts[index] = null;
          currentParts = currentParts.filter(Boolean);
          renderBlockMode();
        }, 180);

        return;
      }

      if (!moved) {
        const isNowSelected = !block.classList.contains("selected-block");

        block.classList.toggle("selected-block");

        if (isNowSelected) {
          selectBlockText(block);
        } else {
          clearTextSelection();
        }
      }

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";
    });

    block.addEventListener("pointercancel", () => {
      dragging = false;
      clearHoldTimer();

      block.classList.remove("dragging-block");
      block.style.transform = "";
      block.style.opacity = "";
    });
  });
}

function renderBlockMode() {
  document.body.classList.remove("unified-mode");

  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  codeView.innerHTML = currentParts.map((part, index) => {
    return `
      <section class="code-section" data-type="${part.type}" data-section-id="${part.type}-${index}">
        <div class="section-body">
          <div class="code-block type-${part.type}" data-index="${index}">
            <pre>${escapeHTML(part.content)}</pre>
          </div>
        </div>
      </section>
    `;
  }).join("");

  buildTypeToolbar();
  enableToolbarSwipe();
  enableBlockSelectionAndErase();
}

function renderSeparatedBlocks(text) {
  currentParts = splitCode(text);
  activeType = null;
  renderBlockMode();
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function startDefaultCanvas() {
  codeView.classList.add("hidden");
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
