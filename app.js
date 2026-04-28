const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

const panelStore = {
  html: "",
  css: "",
  js: "",
  svg: ""
};

let activeTypes = [];
let activeFrontType = null;

let rotation = 0;
let velocity = 0;
let isDragging = false;
let animationFrame = null;

let startX = 0;
let lastX = 0;
let lastTime = 0;
let moved = false;
let dragJustHappened = false;

function buildStartUI() {
  stack.innerHTML = "";

  const startMessage = document.createElement("div");
  startMessage.className = "start-message";
  startMessage.innerHTML = `
    Replace & Erase;<br>
    Luhvcraft sculpted intellectual form of silence through the art of preservation.
  `;

  const mainBox = makeMainPasteBox();

  stack.appendChild(startMessage);
  stack.appendChild(mainBox);
}

function makeMainPasteBox() {
  const box = document.createElement("textarea");
  box.className = "start-button main-button main-paste";
  box.value = "REPLACE & ERASE";

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
    loadCode(text);
  });

  return box;
}

function prettyLabel(type) {
  return type.toUpperCase();
}

function cleanBlock(text) {
  return text.trim();
}

function extractMatches(text, regex, groupIndex = 1) {
  const results = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    results.push(groupIndex === 0 ? match[0] : match[groupIndex]);
  }

  return results;
}

function splitMixedCode(text) {
  const result = { html: "", css: "", js: "", svg: "" };

  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const svgRegex = /<svg\b[\s\S]*?<\/svg>/gi;

  const styles = extractMatches(text, new RegExp(styleRegex), 1).map(cleanBlock).filter(Boolean);
  const scripts = extractMatches(text, new RegExp(scriptRegex), 1).map(cleanBlock).filter(Boolean);
  const svgs = extractMatches(text, new RegExp(svgRegex), 0).map(cleanBlock).filter(Boolean);

  if (styles.length) result.css = styles.join("\n\n");
  if (scripts.length) result.js = scripts.join("\n\n");
  if (svgs.length) result.svg = svgs.join("\n\n");

  const htmlOnly = text
    .replace(styleRegex, "")
    .replace(scriptRegex, "")
    .replace(svgRegex, "")
    .trim();

  if (htmlOnly) result.html = htmlOnly;

  return result;
}

function detectSingleCodeType(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/<svg[\s>]/i.test(trimmed) || /<\/svg>/i.test(trimmed)) return "svg";

  if (
    /@media/i.test(trimmed) ||
    /@keyframes/i.test(trimmed) ||
    /[.#][\w-]+\s*\{/m.test(trimmed) ||
    /[a-z-]+\s*:\s*[^;]+;/i.test(trimmed)
  ) return "css";

  if (
    /\b(const|let|var|function|document\.|querySelector|addEventListener|setInterval|setTimeout|requestAnimationFrame)\b/.test(trimmed) ||
    /=>/.test(trimmed)
  ) return "js";

  return "html";
}

function looksLikeMixedDocument(text) {
  return /<style\b/i.test(text) || /<script\b/i.test(text) || /<svg\b/i.test(text);
}

function loadCode(text) {
  if (!text.trim()) return;

  panelStore.html = "";
  panelStore.css = "";
  panelStore.js = "";
  panelStore.svg = "";

  if (looksLikeMixedDocument(text)) {
    Object.assign(panelStore, splitMixedCode(text));
  } else {
    const type = detectSingleCodeType(text);
    if (type) panelStore[type] = text.trim();
  }

  activeTypes = ["html", "css", "js", "svg"].filter(type => panelStore[type].trim());

  if (!activeTypes.length) return;

  rotation = 0;
  velocity = 0;
  activeFrontType = activeTypes[0];

  stack.innerHTML = "";
  buildPanels();
  render();

  scene.classList.remove("hidden");
  codeView.classList.add("hidden");
}

function buildPanels() {
  stack.innerHTML = "";

  activeTypes.forEach((type) => {
    const panel = document.createElement("div");
    panel.className = `panel panel-${type}`;
    panel.dataset.type = type;

    const label = document.createElement("div");
    label.className = "panel-label";
    label.textContent = prettyLabel(type);

    panel.appendChild(label);

    const openIfTap = (e) => {
      if (dragJustHappened) return;
      e.preventDefault();
      e.stopPropagation();
      openPanelCode(type);
    };

    panel.addEventListener("click", openIfTap);
    panel.addEventListener("touchend", openIfTap, { passive: false });

    stack.appendChild(panel);
  });
}

function wrapIndex(value) {
  const total = activeTypes.length;
  return ((value % total) + total) % total;
}

function shortestStepDiff(from, to) {
  const total = activeTypes.length;
  let diff = wrapIndex(to) - wrapIndex(from);

  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;

  return diff;
}

function getFrontIndex() {
  return wrapIndex(Math.round(rotation));
}

function updateActiveFrontType() {
  if (!activeTypes.length) return;
  activeFrontType = activeTypes[getFrontIndex()];
}

function getPanelVisual(stepOffset) {
  let x = stepOffset;
  const total = activeTypes.length;

  while (x > total / 2) x -= total;
  while (x < -total / 2) x += total;

  const abs = Math.abs(x);
  const maxDepth = Math.max(1, total / 2);
  const frontness = Math.max(0, 1 - Math.min(abs, maxDepth) / maxDepth);

  return {
    transform: `
      translate(-50%, -50%)
      translateX(${x * 96}px)
      translateZ(${92 - abs * 58}px)
      rotateY(${-x * 18}deg)
      scale(${1 - abs * 0.08})
    `,
    opacity: Math.max(0.2, 1 - abs * 0.36),
    filter: `blur(${Math.min(0.55, abs * 0.25)}px)`,
    zIndex: Math.round(frontness * 100),
    background: `rgba(255,255,255,${0.22 + frontness * 0.42})`,
    boxShadow: `0 ${8 + frontness * 10}px ${18 + frontness * 18}px rgba(0,0,0,${0.05 + frontness * 0.07})`
  };
}

function render() {
  updateActiveFrontType();

  const panels = [...document.querySelectorAll(".panel")];

  panels.forEach((panel) => {
    const type = panel.dataset.type;
    const index = activeTypes.indexOf(type);
    const offset = shortestStepDiff(rotation, index);
    const visual = getPanelVisual(offset);

    panel.style.transform = visual.transform;
    panel.style.opacity = visual.opacity;
    panel.style.filter = visual.filter;
    panel.style.zIndex = visual.zIndex;
    panel.style.background = visual.background;
    panel.style.boxShadow = visual.boxShadow;

    panel.classList.toggle("active-front", type === activeFrontType);
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function splitCssIntoBlocks(cssText) {
  const blocks = [];
  let current = "";
  let depth = 0;

  for (const char of cssText) {
    current += char;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        const cleaned = current.trim();
        if (cleaned) blocks.push(cleaned);
        current = "";
      }
    }
  }

  const leftover = current.trim();
  if (leftover) blocks.push(leftover);

  return blocks.length ? blocks : [cssText.trim()];
}

function splitBasicBlocks(text) {
  return text
    .split(/\n\s*\n/g)
    .map(block => block.trim())
    .filter(Boolean);
}

function renderCodeContent(type, content) {
  codeView.classList.add("block-mode");

  let blocks = [];

  if (type === "css") {
    blocks = splitCssIntoBlocks(content);
  } else {
    blocks = splitBasicBlocks(content);
  }

  if (!blocks.length) blocks = [content];

  codeView.innerHTML = blocks
    .map((block, index) => `
      <div class="code-block color-${index % 4}" data-block-index="${index}">
        <pre>${escapeHtml(block.trim())}</pre>
      </div>
    `)
    .join("");
}

function openPanelCode(type) {
  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  const content = panelStore[type] || `${prettyLabel(type)} is empty.`;
  renderCodeContent(type, content);
}

function snapToNearest() {
  const target = Math.round(rotation);

  const animate = () => {
    const diff = target - rotation;
    rotation += diff * 0.16;

    if (Math.abs(diff) < 0.002) {
      rotation = target;
      velocity = 0;
      render();
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      return;
    }

    render();
    animationFrame = requestAnimationFrame(animate);
  };

  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}

function startMomentum() {
  const animate = () => {
    if (isDragging) return;

    rotation += velocity;
    velocity *= 0.94;

    if (Math.abs(velocity) < 0.003) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      snapToNearest();
      return;
    }

    render();
    animationFrame = requestAnimationFrame(animate);
  };

  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}

function onStart(x) {
  if (!activeTypes.length) return;

  isDragging = true;
  moved = false;
  startX = x;
  lastX = x;
  lastTime = performance.now();
  velocity = 0;

  cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function onMove(x) {
  if (!isDragging) return;

  const now = performance.now();
  const dx = x - lastX;
  const dt = Math.max(1, now - lastTime);

  if (Math.abs(x - startX) > 6) moved = true;

  rotation -= dx / 90;
  velocity = -(dx / dt) * 0.18;

  lastX = x;
  lastTime = now;

  render();
}

function onEnd() {
  if (!isDragging) return;
  isDragging = false;

  if (moved) {
    dragJustHappened = true;
    setTimeout(() => {
      dragJustHappened = false;
    }, 180);
  }

  startMomentum();
}

scene.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  onStart(e.touches[0].clientX);
}, { passive: true });

scene.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 1) return;
  onMove(e.touches[0].clientX);
}, { passive: true });

scene.addEventListener("touchend", onEnd);

scene.addEventListener("mousedown", (e) => {
  onStart(e.clientX);
});

window.addEventListener("mousemove", (e) => {
  onMove(e.clientX);
});

window.addEventListener("mouseup", onEnd);

function startDefaultCanvas() {
  scene.style.display = "flex";
  scene.style.inset = "0";

  stack.style.position = "relative";
  stack.style.width = "100vw";
  stack.style.height = "100vh";
  stack.style.transformStyle = "preserve-3d";

  codeView.classList.add("hidden");
  scene.classList.remove("hidden");

  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
