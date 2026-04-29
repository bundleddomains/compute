const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");

let activeSectionTypes = [];
let collapsedSections = {};

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
    renderSeparatedBlocks(text);
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

    block.classList.remove("editing-block");
    block.innerHTML = `<pre>${escapeHTML(newText)}</pre>`;
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

    block.addEventListener("pointerdown", (e) => {
      if (block.classList.contains("editing-block")) return;

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
        block.classList.contains("selected-block")
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
        block.classList.add("erasing-block");

        setTimeout(() => {
          block.remove();
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

function enableSectionConfirm() {
  const sections = [...codeView.querySelectorAll(".code-section")];

  sections.forEach((section) => {
    const label = section.querySelector(".type-label");
    const type = section.dataset.type;

    label.addEventListener("click", () => {
      collapsedSections[type] = !collapsedSections[type];
      section.classList.toggle("collapsed-section", collapsedSections[type]);
    });
  });
}

function renderSeparatedBlocks(text) {
  const parts = splitCode(text);
  const typesInOrder = [...new Set(parts.map(part => part.type))];

  activeSectionTypes = typesInOrder;
  collapsedSections = {};

  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  codeView.innerHTML = typesInOrder.map(type => {
    const matchingParts = parts
      .map((part, index) => ({ ...part, index }))
      .filter(part => part.type === type);

    collapsedSections[type] = false;

    return `
      <section class="code-section" data-type="${type}">
        <div class="type-label ${type}-label">${type.toUpperCase()}</div>
        <div class="section-body">
          ${matchingParts.map(part => `
            <div class="code-block type-${part.type}" data-index="${part.index}">
              <pre>${escapeHTML(part.content)}</pre>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");

  enableBlockSelectionAndErase();
  enableSectionConfirm();
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
  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
