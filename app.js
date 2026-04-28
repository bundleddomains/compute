const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

let state = "start";
let fileText = "";
let snipText = "";

function buildStartUI() {
  stack.innerHTML = "";

  const startMessage = document.createElement("div");
  startMessage.className = "start-message";
  startMessage.innerHTML = `
    Replace & Erase;<br>
    Luhvcraft sculpted intellectual form of silence through the art of preservation.
  `;

  const mainBtn = document.createElement("button");
  mainBtn.className = "start-button main-button";
  mainBtn.textContent = "REPLACE & ERASE";

  mainBtn.addEventListener("click", activateMode);

  stack.appendChild(startMessage);
  stack.appendChild(mainBtn);
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatCodeBlocks(text) {
  const parts = text.split("}");

  return parts
    .map(part => part.trim())
    .filter(Boolean)
    .map((part, i) => {
      return `
        <div class="code-block ${i % 2 ? "alt" : ""}">
${escapeHTML(part + "}")}
        </div>
      `;
    })
    .join("");
}

function makeCodeTile(text, type) {
  const tile = document.createElement("div");
  tile.className = `tool-button expanded ${type.toLowerCase()}-button code-tile`;
  tile.innerHTML = formatCodeBlocks(text);
  return tile;
}

function makePasteBox(label, type) {
  const box = document.createElement("textarea");
  box.className = `tool-button ${type.toLowerCase()}-button`;
  box.value = label;
  box.spellcheck = false;
  box.autocapitalize = "off";
  box.autocomplete = "off";
  box.autocorrect = "off";
  box.readOnly = false;

  box.addEventListener("focus", () => {
    if (!box.classList.contains("expanded")) {
      box.value = label;
      box.setSelectionRange(0, box.value.length);
    }
  });

  box.addEventListener("paste", (e) => {
    e.preventDefault();

    const pasted = (e.clipboardData || window.clipboardData).getData("text");

    if (type === "FILE") {
      fileText = pasted;
    }

    if (type === "SNIP") {
      snipText = pasted;
    }

    const tile = makeCodeTile(pasted, type);
    box.replaceWith(tile);
  });

  return box;
}

function activateMode() {
  state = "active";
  stack.innerHTML = "";

  const fileButton = makePasteBox("FILE", "FILE");

  const amp = document.createElement("div");
  amp.className = "start-amp";
  amp.textContent = "&";

  const snipButton = makePasteBox("SNIP", "SNIP");

  stack.appendChild(fileButton);
  stack.appendChild(amp);
  stack.appendChild(snipButton);
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
