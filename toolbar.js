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