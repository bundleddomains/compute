
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

let activeTypes = ["replace", "erase"];
let rotation = 0;
let isDragging = false;
let startX = 0;
let lastX = 0;

function prettyLabel(type) {
  if (type === "replace") return "REPLACE";
  if (type === "erase") return "ERASE";
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

async function loadFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    loadCode(text);
  } catch {
    status.textContent = "Clipboard blocked";
  }
}

function buildPanels() {
  stack.innerHTML = "";

  // LEFT + RIGHT PANELS
  activeTypes.forEach((type, i) => {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.dataset.type = type;

    const label = document.createElement("div");
    label.className = "panel-label";
    label.textContent = prettyLabel(type);
    panel.appendChild(label);

    if (type === "replace" || type === "erase") {
      panel.addEventListener("click", loadFromClipboard);

      panel.style.position = "absolute";
      panel.style.top = "50%";
      panel.style.left = i === 0 ? "30%" : "70%"; // ← spaced out
      panel.style.transform = "translate(-50%, -50%)";
      panel.style.width = "112px";
      panel.style.height = "112px";
      panel.style.border = "2px solid black";
      panel.style.borderRadius = "14px";
      panel.style.display = "flex";
      panel.style.alignItems = "center";
      panel.style.justifyContent = "center";
      panel.style.background = "white";
      panel.style.color = "black";
      panel.style.fontWeight = "700";
      panel.style.letterSpacing = "0.06em";
      panel.style.cursor = "pointer";
    }

    stack.appendChild(panel);
  });

  // CENTER "&"
  const amp = document.createElement("div");
  amp.textContent = "&";

  amp.style.position = "absolute";
  amp.style.top = "50%";
  amp.style.left = "50%";
  amp.style.transform = "translate(-50%, -50%)";
  amp.style.fontSize = "28px";
  amp.style.fontWeight = "600";
  amp.style.color = "black";
  amp.style.pointerEvents = "none";

  stack.appendChild(amp);
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
  if (activeTypes[0] === "replace" || activeTypes[0] === "erase") return;

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
  if (activeTypes[0] === "replace" || activeTypes[0] === "erase") return;
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

  status.textContent = "REPLACE & ERASE";
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
