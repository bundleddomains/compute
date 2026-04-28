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

function autoGrow(box) {
  box.style.height = "auto";

  const idealHeight = Math.min(
    box.scrollHeight,
    window.innerHeight * 0.72
  );

  box.style.height = idealHeight + "px";
}

function eraseToFileMode() {
  state = "file";

  const replaceBtn = stack.querySelector(".replace-button");
  const eraseBtn = stack.querySelector(".erase-button");
  const amp = stack.querySelector(".start-amp");

  const fileBox = makePasteBox("FILE", "FILE");
  fileBox.className = "start-button tool-button file-button";
  fileBox.value = "FILE";

  replaceBtn.replaceWith(fileBox);

  eraseBtn.classList.add("fade-away");
  amp.classList.add("fade-away");

  requestAnimationFrame(() => {
    fileBox.classList.add("file-center", "move-center");
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

    box.value = pasted;
    box.classList.add("expanded");

    requestAnimationFrame(() => {
      autoGrow(box);
      box.blur();
    });
  });

  box.addEventListener("input", () => {
    autoGrow(box);

    if (type === "FILE") {
      fileText = box.value;
    }

    if (type === "SNIP") {
      snipText = box.value;
    }
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
