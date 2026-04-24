const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

let state = "start";

function buildPanels() {
  stack.innerHTML = "";

  const replaceBtn = document.createElement("button");
  replaceBtn.className = "start-button replace-button";
  replaceBtn.textContent = "REPLACE";

  const eraseBtn = document.createElement("button");
  eraseBtn.className = "start-button erase-button";
  eraseBtn.textContent = "ERASE";

  const amp = document.createElement("div");
  amp.className = "start-amp";
  amp.textContent = "&";

  replaceBtn.addEventListener("click", () => {
    state = "replace-picked";

    replaceBtn.textContent = "THE FILE";
    eraseBtn.textContent = "THE SNIP";

    replaceBtn.classList.add("file-mode");
    eraseBtn.classList.add("snip-mode");

    status.textContent = "The File & The Snip";
  });

  eraseBtn.addEventListener("click", () => {
    state = "erase-picked";

    eraseBtn.classList.add("fade-out");

    replaceBtn.textContent = "THE FILE";
    replaceBtn.classList.add("file-mode", "move-center");

    amp.classList.add("fade-out");

    status.textContent = "The File";

    setTimeout(() => {
      eraseBtn.style.display = "none";
      amp.style.display = "none";
    }, 300);
  });

  stack.appendChild(replaceBtn);
  stack.appendChild(amp);
  stack.appendChild(eraseBtn);
}

function startDefaultCanvas() {
  scene.style.display = "flex";
  scene.style.inset = "0";

  stack.style.position = "relative";
  stack.style.width = "100vw";
  stack.style.height = "100vh";

  codeView.classList.add("hidden");
  scene.classList.remove("hidden");

  buildPanels();

  status.textContent = "REPLACE & ERASE";
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
