const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");

const panelStore = {
  html: "",
  css: "",
  js: "",
  svg: ""
};

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

/* ---------- DETECTION ---------- */

function splitMixedCode(text) {
  const result = { html: "", css: "", js: "", svg: "" };

  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const svgRegex = /<svg\b[\s\S]*?<\/svg>/gi;

  const styles = [...text.matchAll(styleRegex)].map(m => m[1].trim());
  const scripts = [...text.matchAll(scriptRegex)].map(m => m[1].trim());
  const svgs = [...text.matchAll(svgRegex)].map(m => m[0].trim());

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

function loadCode(text) {
  Object.assign(panelStore, splitMixedCode(text));

  renderPanels();
}

/* ---------- PANELS ---------- */

function renderPanels() {
  stack.innerHTML = "";

  const types = ["html", "css", "js", "svg"].filter(t => panelStore[t]);

  types.forEach((type, i) => {
    const panel = document.createElement("div");
    panel.className = `flat-panel panel-${type}`;

    panel.innerHTML = `
      <div class="panel-label">${type.toUpperCase()}</div>
      <pre class="panel-code">${escapeHTML(panelStore[type])}</pre>
    `;

    panel.style.left = `calc(50% + ${(i - (types.length - 1)/2) * 220}px)`;

    panel.addEventListener("click", () => openPanel(type));

    stack.appendChild(panel);
  });
}

/* ---------- OPEN ---------- */

function openPanel(type) {
  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  const content = panelStore[type];

  codeView.innerHTML = content
    .split(/\n\s*\n/)
    .map((block, i) => `
      <div class="code-block color-${i % 4}">
        <pre>${escapeHTML(block)}</pre>
      </div>
    `)
    .join("");
}

/* ---------- UTIL ---------- */

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ---------- INIT ---------- */

function startDefaultCanvas() {
  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
