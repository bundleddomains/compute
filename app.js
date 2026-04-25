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

  const replaceBtn = document.createElement("button");
  replaceBtn.className = "start-button replace-button";
  replaceBtn.textContent = "REPLACE";

  const eraseBtn = document.createElement("button");
  eraseBtn.className = "start-button erase-button";
  eraseBtn.textContent = "ERASE";

  const amp = document.createElement("div");
  amp.className = "start-amp";
  amp.textContent = "&";

  replaceBtn.addEventListener("click", activateMode);
  eraseBtn.addEventListener("click", eraseToFileMode);

  stack.appendChild(startMessage);
  stack.appendChild(replaceBtn);
  stack.appendChild(amp);
  stack.appendChild(eraseBtn);
}

function eraseToFileMode() {
  state = "file";

  const replaceBtn = stack.querySelector(".replace-button");
  const eraseBtn = stack.querySelector(".erase-button");
  const amp = stack.querySelector(".start-amp");

  const cleanFile = replaceBtn.cloneNode(true);
  replaceBtn.replaceWith(cleanFile);

  cleanFile.textContent = "FILE";
  cleanFile.className = "start-button file-button file-center move-center";

  eraseBtn.classList.add("fade-away");
  amp.classList.add("fade-away");

  cleanFile.addEventListener("click", () => {
    cleanFile.focus();
  });
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
    box.value = label;
    box.setSelectionRange(0, box.value.length);
  });

  box.addEventListener("paste", (e) => {
    e.preventDefault();

    const pasted = (e.clipboardData || window.clipboardData).getData("text");

    if (type === "FILE") {
      fileText = pasted;
      box.value = "FILE ✓";
    }

    if (type === "SNIP") {
      snipText = pasted;
      box.value = "SNIP ✓";
    }

    box.blur();
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
