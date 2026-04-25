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
  state = "erasing";

  const replaceBtn = stack.querySelector(".replace-button");
  const eraseBtn = stack.querySelector(".erase-button");
  const amp = stack.querySelector(".start-amp");

  replaceBtn.textContent = "FILE";
  replaceBtn.classList.remove("replace-button");
  replaceBtn.classList.add("file-button", "file-center");

  eraseBtn.classList.add("fade-away");
  amp.classList.add("fade-away");
  replaceBtn.classList.add("move-center");

  activateFilePaste(replaceBtn);

  state = "file";
}

function activateFilePaste(el) {
  el.tabIndex = 0;

  el.addEventListener("click", () => {
    el.focus();
  });

  el.addEventListener("paste", (e) => {
    e.preventDefault();

    fileText = (e.clipboardData || window.clipboardData).getData("text");

    el.dataset.stored = "true";
    el.textContent = "FILE ✓";
  });
}

function activatePasteBox(el, type) {
  el.tabIndex = 0;

  el.addEventListener("click", () => {
    el.focus();
  });

  el.addEventListener("paste", (e) => {
    e.preventDefault();

    const pasted = (e.clipboardData || window.clipboardData).getData("text");

    if (type === "FILE") {
      fileText = pasted;
      el.dataset.stored = "true";
      el.textContent = "FILE ✓";
    }

    if (type === "SNIP") {
      snipText = pasted;
      el.dataset.stored = "true";
      el.textContent = "SNIP ✓";
    }
  });
}

function activateMode() {
  state = "active";
  stack.innerHTML = "";

  const fileButton = document.createElement("div");
  fileButton.className = "tool-button file-button paste-box";
  fileButton.textContent = "FILE";

  const amp = document.createElement("div");
  amp.className = "start-amp";
  amp.textContent = "&";

  const snipButton = document.createElement("div");
  snipButton.className = "tool-button snip-button paste-box";
  snipButton.textContent = "SNIP";

  activatePasteBox(fileButton, "FILE");
  activatePasteBox(snipButton, "SNIP");

  stack.appendChild(fileButton);
  stack.appendChild(amp);
  stack.appendChild(snipButton);

  status.textContent = "FILE & SNIP";
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

  status.textContent = "REPLACE & ERASE";
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
