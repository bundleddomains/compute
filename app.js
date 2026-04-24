const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

const panelStore = {
  paste1: "",
  paste2: "",
  html: "",
  css: "",
  js: "",
  svg: ""
};

let activeTypes = ["paste1", "paste2"];
let activeFrontType = "paste1";

let rotation = 0;
let isDragging = false;
let startX = 0;
let lastX = 0;

function prettyLabel(type) {
  if (type === "paste1") return "REPLACE";
  if (type === "paste2") return "ERASE";
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
  if (!text.trim()) return;

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
  buildPanels();
  render();

  status.textContent = "Loaded";
}

function buildPanels() {
  stack.innerHTML = "";

  activeTypes.forEach((type, i) => {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.dataset.type = type;

    if (type.startsWith("paste")) {
      const textarea = document.createElement("textarea");
      textarea.className = "paste-panel-input";
      textarea.placeholder = prettyLabel(type);

      textarea.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        loadCode(text);
      });

      panel.appendChild(textarea);

      panel.style.position = "absolute";
      panel.style.top = "50%";
      panel.style.left = i === 0 ? "38%" : "62%";
      panel.style.transform = "translate(-50%, -50%)";
      panel.style.width = "160px";
      panel.style.height = "160px";
      panel.style.border = "2px solid black";
      panel.style.borderRadius = "18px";
      panel.style.display = "grid";
      panel.style.placeItems = "center";
      panel.style.background = "white";
      panel.style.color = "black";
      panel.style.boxSizing = "border-box";
      panel.style.overflow = "hidden";
    } else {
      const label = document.createElement("div");
      label.className = "panel-label";
      label.textContent = prettyLabel(type);
      panel.appendChild(label);

      panel.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPanelCode(type);
      });
    }

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

function getPanelVisual(stepOffset) {
  let x = stepOffset;
  const total = activeTypes.length;

  while (x > total / 2) x -= total;
  while (x < -total / 2) x += total;

  const abs = Math.abs(x);

  return {
    transform: `
      translate(-50%, -50%)
      translateX(${x * 120}px)
      rotateY(${-x * 16}deg)
    `,
    opacity: Math.max(0.2, 1 - abs * 0.3),
    zIndex: Math.round(100 - abs * 10)
  };
}

function render() {
  if (activeTypes[0].startsWith("paste")) return;

  const panels = [...document.querySelectorAll(".panel")];

  panels.forEach((panel) => {
    const type = panel.dataset.type;
    const index = activeTypes.indexOf(type);
    const offset = shortestStepDiff(rotation, index);
    const visual = getPanelVisual(offset);

    panel.style.position = "absolute";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.width = "90px";
    panel.style.height = "72vh";
    panel.style.border = "2px solid black";
    panel.style.borderRadius = "44px";
    panel.style.display = "grid";
    panel.style.placeItems = "center";
    panel.style.background = "rgba(255,255,255,0.38)";
    panel.style.color = "black";

    panel.style.transform = visual.transform;
    panel.style.opacity = visual.opacity;
    panel.style.zIndex = visual.zIndex;
  });
}

function openPanelCode(type) {
  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  codeView.innerHTML = `<pre>${panelStore[type]}</pre>`;
  status.textContent = `${prettyLabel(type)} opened`;
}

function onStart(x) {
  if (activeTypes[0].startsWith("paste")) return;
  isDragging = true;
  startX = x;
  lastX = x;
}

function onMove(x) {
  if (!isDragging) return;

  const dx = x - lastX;
  rotation -= dx / 90;

  lastX = x;
  render();
}

function onEnd() {
  isDragging = false;
}

scene.addEventListener("mousedown", (e) => onStart(e.clientX));
window.addEventListener("mousemove", (e) => onMove(e.clientX));
window.addEventListener("mouseup", onEnd);

function startDefaultCanvas() {
  scene.style.display = "flex";
  scene.style.inset = "0";

  buildPanels();
  render();

  status.textContent = "REPLACE or ERASE";
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
