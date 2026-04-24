const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

const DEFAULT_CODE = `
<div class="for-u">For-u</div>

<style>
.for-u {
  width: 140px;
  height: 140px;
  display: grid;
  place-items: center;
  border: 2px solid black;
  border-radius: 18px;
  font-family: serif;
  background: white;
}
</style>
`;

const panelStore = { html: "", css: "", js: "", svg: "" };

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

  if (htmlOnly) result.html = cleanBlock(htmlOnly);

  return result;
}

function looksLikeMixedDocument(text) {
  return /<style\b/i.test(text) || /<script\b/i.test(text) || /<svg\b/i.test(text);
}

function loadCode(text) {
  panelStore.html = "";
  panelStore.css = "";
  panelStore.js = "";
  panelStore.svg = "";

  if (looksLikeMixedDocument(text)) {
    Object.assign(panelStore, splitMixedCode(text));
  } else {
    panelStore.html = text.trim();
  }

  activeTypes = ["html", "css", "js", "svg"].filter(type => panelStore[type].trim());

  rotation = 0;
  velocity = 0;
  activeFrontType = activeTypes[0];

  buildPanels();
  render();

  scene.classList.remove("hidden");
  codeView.classList.add("hidden");

  status.textContent = `${prettyLabel(activeFrontType)} ready`;
}

function buildPanels() {
  stack.innerHTML = "";

  activeTypes.forEach((type) => {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.dataset.type = type;

    const label = document.createElement("div");
    label.className = "panel-label";
    label.textContent = prettyLabel(type);

    panel.appendChild(label);

    panel.addEventListener("click", (e) => {
      if (dragJustHappened) return;
      e.preventDefault();
      e.stopPropagation();
      openPanelCode(type);
    });

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
      translateX(${x * 126}px)
      translateZ(${80 - abs * 58}px)
      rotateY(${-x * 16}deg)
      scale(${1 - abs * 0.06})
    `,
    opacity: Math.max(0.18, 1 - abs * 0.34),
    filter: `blur(${Math.min(0.5, abs * 0.25)}px)`,
    zIndex: Math.round((frontness * 100) + (2 - abs) * 10),
    background: `rgba(255,255,255,${0.18 + frontness * 0.4})`,
    boxShadow: `0 ${6 + frontness * 8}px ${14 + frontness * 16}px rgba(0,0,0,${0.04 + frontness * 0.06})`
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

    panel.style.position = "absolute";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.width = "110px";
    panel.style.height = "360px";
    panel.style.border = "2px solid black";
    panel.style.borderRadius = "44px";
    panel.style.display = "grid";
    panel.style.placeItems = "center";
    panel.style.color = "black";
    panel.style.transition = "transform 0.2s ease, opacity 0.2s ease";

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

function openPanelCode(type) {
  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  codeView.innerHTML = `<pre>${escapeHtml(panelStore[type])}</pre>`;
  status.textContent = `${prettyLabel(type)} opened`;
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
      status.textContent = `${prettyLabel(activeFrontType)} ready`;
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
  scene.style.display = "block";
  scene.style.position = "relative";
  scene.style.minHeight = "500px";

  stack.style.position = "relative";
  stack.style.width = "100%";
  stack.style.height = "500px";

  loadCode(DEFAULT_CODE);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
