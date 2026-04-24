const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

let state = "start";

function createStackedLabel(textTop, textBottom) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.lineHeight = "1.1";

  const top = document.createElement("div");
  top.textContent = textTop;

  const bottom = document.createElement("div");
  bottom.textContent = textBottom;

  wrap.appendChild(top);
  wrap.appendChild(bottom);

  return wrap;
}

function buildStartUI() {
  stack.innerHTML = "";

  const replaceBtn = document.createElement("button");
  replaceBtn.className = "start-button replace-button";

  const eraseBtn = document.createElement("button");
  eraseBtn.className = "start-button erase-button";

  replaceBtn.textContent = "REPLACE";
  eraseBtn.textContent = "ERASE";

  const amp = document.createElement("div");
  amp.className = "start-amp";
  amp.textContent = "&";

  replaceBtn.addEventListener("click", activateMode);
  eraseBtn.addEventListener("click", activateMode);

  stack.appendChild(replaceBtn);
  stack.appendChild(amp);
  stack.appendChild(eraseBtn);
}

function activateMode() {
  state = "active";

  stack.innerHTML = "";

  // THE FILE (left)
  const filePanel = document.createElement("div");
  filePanel.className = "tool-panel left";

  const fileLabel = createStackedLabel("THE", "FILE");

  const fileInput = document.createElement("textarea");
  fileInput.className = "tool-input";
  fileInput.placeholder = "";

  filePanel.appendChild(fileLabel);
  filePanel.appendChild(fileInput);

  // THE SNIP (right)
  const snipPanel = document.createElement("div");
  snipPanel.className = "tool-panel right";

  const snipLabel = createStackedLabel("THE", "SNIP");

  const snipInput = document.createElement("textarea");
  snipInput.className = "tool-input";
  snipInput.placeholder = "";

  snipPanel.appendChild(snipLabel);
  snipPanel.appendChild(snipInput);

  // paste logic (both)
  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    console.log("PASTED:", text);
    status.textContent = "Code received";
  };

  fileInput.addEventListener("paste", handlePaste);
  snipInput.addEventListener("paste", handlePaste);

  stack.appendChild(filePanel);
  stack.appendChild(snipPanel);

  status.textContent = "THE FILE & THE SNIP";
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
