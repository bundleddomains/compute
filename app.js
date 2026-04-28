const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");

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
    renderSeparatedBlocks(text);
  });

  return box;
}

function splitCode(text) {
  const parts = [];

  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const svgRegex = /<svg\b[\s\S]*?<\/svg>/gi;

  let html = text;

  const styles = [...text.matchAll(styleRegex)].map(m => m[1].trim()).filter(Boolean);
  const scripts = [...text.matchAll(scriptRegex)].map(m => m[1].trim()).filter(Boolean);
  const svgs = [...text.matchAll(svgRegex)].map(m => m[0].trim()).filter(Boolean);

  html = html
    .replace(styleRegex, "")
    .replace(scriptRegex, "")
    .replace(svgRegex, "")
    .trim();

  if (html) parts.push({ type: "html", content: html });
  if (styles.length) parts.push({ type: "css", content: styles.join("\n\n") });
  if (scripts.length) parts.push({ type: "js", content: scripts.join("\n\n") });
  if (svgs.length) parts.push({ type: "svg", content: svgs.join("\n\n") });

  return parts;
}

function splitCssBlocks(cssText) {
  const blocks = [];
  let current = "";
  let depth = 0;

  for (const char of cssText) {
    current += char;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;

      if (depth === 0) {
        const cleaned = current.trim();
        if (cleaned) blocks.push(cleaned);
        current = "";
      }
    }
  }

  const leftover = current.trim();
  if (leftover) blocks.push(leftover);

  return blocks.length ? blocks : [cssText];
}

function splitBasicBlocks(text) {
  return text
    .split(/\n\s*\n/g)
    .map(block => block.trim())
    .filter(Boolean);
}

function getBlocksForPart(part) {
  if (part.type === "css") return splitCssBlocks(part.content);
  return splitBasicBlocks(part.content);
}

function renderSeparatedBlocks(text) {
  const parts = splitCode(text);

  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  codeView.innerHTML = parts.map(part => {
    const blocks = getBlocksForPart(part);

    return `
      <div class="type-label ${part.type}-label">${part.type.toUpperCase()}</div>
      ${blocks.map(block => `
        <div class="code-block type-${part.type}">
          <pre>${escapeHTML(block)}</pre>
        </div>
      `).join("")}
    `;
  }).join("");
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
