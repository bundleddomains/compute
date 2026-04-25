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

  eraseBtn.classList.add("fade-away");
  amp.classList.add("fade-away");
  replaceBtn.classList.add("move-center");

  status.textContent = "ERASING";

  setTimeout(() => {
    state = "file";

    replaceBtn.textContent = "FILE";
    replaceBtn.classList.remove("replace-button");
    replaceBtn.classList.add("file-button");

    activateFilePaste(replaceBtn);

    status.textContent = "FILE";
  }, 420);
}

function activateFilePaste(el) {
  el.addEventListener("click", () => {
    el.focus();
  });

  el.addEventListener("paste", (e) => {
    e.preventDefault();
    fileText = (e.clipboardData || window.clipboardData).getData("text");
    status.textContent = "FILE received";
  });
}

function activateMode() {
  state = "active";
  stack.innerHTML = "";

  const fileButton = document.createElement("textarea");
  fileButton.className = "tool-button file-button";
  fileButton.value = "FILE";
  fileButton.readOnly = true;

  const amp = document.createElement("div");
  amp.className = "start-amp";
  amp.textContent = "&";

  const snipButton = document.createElement("textarea");
  snipButton.className = "tool-button snip-button";
  snipButton.value = "SNIP";
  snipButton.readOnly = true;

  fileButton.addEventListener("paste", (e) => {
    e.preventDefault();
    fileText = (e.clipboardData || window.clipboardData).getData("text");
    status.textContent = "FILE received";
  });

  snipButton.addEventListener("paste", (e) => {
    e.preventDefault();
    snipText = (e.clipboardData || window.clipboardData).getData("text");
    status.textContent = "SNIP received";
  });

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
