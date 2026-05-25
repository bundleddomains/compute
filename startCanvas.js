function startDefaultCanvas() {
  injectCollapsedStyles();

  codeView.classList.add("hidden");

  codeView.classList.remove(
    "fade-in-blocks"
  );

  scene.classList.remove("hidden");

  document.body.classList.remove(
    "unified-mode"
  );

  activeType = null;

  currentParts = [];

  selectedLines = new Set();

  expandedBlocks = new Set();

  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener(
    "DOMContentLoaded",
    startDefaultCanvas
  );
} else {
  startDefaultCanvas();
}