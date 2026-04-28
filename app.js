const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

let state = "start";
let pastedText = "";

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

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function detectParts(text) {
  const parts = [];

  const styleMatches = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const scriptMatches = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  const svgMatches = [...text.matchAll(/<svg[\s\S]*?<\/svg>/gi)];

  let html = text;

  styleMatches.forEach(match => {
    parts.push({ type: "CSS", content: match[1].trim() });
    html = html.replace(match[0], "");
  });

  scriptMatches.forEach(match => {
    parts.push({ type: "JS", content: match[1].trim() });
    html = html.replace(match[0], "");
  });

  svgMatches.forEach(match => {
    parts.push({ type: "SVG", content: match[0].trim() });
    html = html.replace(match[0], "");
  });

  html = html.trim();

  if (html) {
    parts.unshift({ type: "HTML", content: html });
  }

  return parts;
}

function makePartTile(part, index) {
  const tile = document.createElement("div");
  tile.className = `part-tile part-${part.type.toLowerCase()}`;

  tile.innerHTML = `
    <div class="part-label">${part.type}</div>
    <pre class="part-code">${escapeHTML(part.content)}</pre>
  `;

  tile.style.left = `calc(50% + ${(index - 1.5) * 118}px)`;

  return tile;
}

function renderDetectedParts(text) {
  stack.innerHTML = "";

  const parts = detectParts(text);

  parts.forEach((part, index) => {
    stack.appendChild(makePartTile(part, index));
  });
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

    pastedText = (e.clipboardData || window.clipboardData).getData("text");
    renderDetectedParts(pastedText);
  });

  return box;
}

function startDefaultCanvas() {
  scene.style.display = "flex";
  scene.style.inset = "0";

  stack.style.position = "relative";
  stack.style.width = "100vw";
  stack.style.height = "100vh";

  codeView.classList.add("hidden");
  scene.classList.remove("hidden");

  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
