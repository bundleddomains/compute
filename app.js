const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const status = document.getElementById("status");
const codeView = document.getElementById("codeView");

const panelStore = {
  blank: "",
  html: "",
  css: "",
  js: "",
  svg: ""
};

let activeTypes = ["blank"];
let activeFrontType = "blank";

let rotation = 0;
let velocity = 0;
let isDragging = false;
let animationFrame = null;
let startX = 0;
let lastX = 0;
let lastTime = 0;
let moved = false;
let dragJustHappened = false;

function prettyLabel(type) {
  if (type === "blank") return "";
  return type.toUpperCase();
}

function buildPanels() {
  stack.innerHTML = "";

  activeTypes.forEach((type) => {
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.dataset.type = type;

    const label = document.createElement("div");
    label.className = "panel-label";
    label.textContent = prettyLabel(type);

    panel.appendChild(label);

    panel.addEventListener("click", (e) => {
      if (dragJustHappened || type === "blank") return;
      e.preventDefault();
      e.stopPropagation();
      openPanelCode(type);
    });

    stack.appendChild(panel);
  });
}

function wrapIndex(value) {
  const total = activeTypes.length;
  return ((value % total) + total) % total;
}

function shortestStepDiff(from, to) {
  const total = activeTypes.length;
  let diff = wrapIndex(to) - wrapIndex(from);

  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;

  return diff;
}

function getFrontIndex() {
  return wrapIndex(Math.round(rotation));
}

function updateActiveFrontType() {
  activeFrontType = activeTypes[getFrontIndex()];
}

function getPanelVisual(stepOffset) {
  let x = stepOffset;
  const total = activeTypes.length;

  while (x > total / 2) x -= total;
  while (x < -total / 2) x += total;

  const abs = Math.abs(x);
  const maxDepth = Math.max(1, total / 2);
  const frontness = Math.max(0, 1 - Math.min(abs, maxDepth) / maxDepth);

  return {
    transform: `
      translate(-50%, -50%)
      translateX(${x * 106}px)
      translateZ(${76 - abs * 54}px)
      rotateY(${-x * 16}deg)
      scale(${1 - abs * 0.06})
    `,
    opacity: Math.max(0.18, 1 - abs * 0.34),
    filter: `blur(${Math.min(0.5, abs * 0.25)}px)`,
    zIndex: Math.round((frontness * 100) + (2 - abs) * 10),
    background: `rgba(255,255,255,${0.16 + frontness * 0.34})`,
    boxShadow: `0 ${6 + frontness * 8}px ${14 + frontness * 16}px rgba(0,0,0,${0.04 + frontness * 0.06})`
  };
}

function render() {
  updateActiveFrontType();

  const panels = [...document.querySelectorAll(".panel")];

  panels.forEach((panel) => {
    const type = panel.dataset.type;
    const index = activeTypes.indexOf(type);
    const offset = shortestStepDiff(rotation, index);
    const visual = getPanelVisual(offset);

    panel.style.position = "absolute";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.width = "90px";
    panel.style.height = "72vh";
    panel.style.maxHeight = "640px";
    panel.style.minHeight = "420px";
    panel.style.border = "2px solid black";
    panel.style.borderRadius = "44px";
    panel.style.display = "grid";
    panel.style.placeItems = "center";
    panel.style.color = "black";
    panel.style.transition = "transform 0.2s ease, opacity 0.2s ease";

    panel.style.transform = visual.transform;
    panel.style.opacity = visual.opacity;
    panel.style.filter = visual.filter;
    panel.style.zIndex = visual.zIndex;
    panel.style.background = visual.background;
    panel.style.boxShadow = visual.boxShadow;

    panel.classList.toggle("active-front", type === activeFrontType);
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function openPanelCode(type) {
  scene.classList.add("hidden");
  codeView.classList.remove("hidden");

  codeView.innerHTML = `<pre>${escapeHtml(panelStore[type])}</pre>`;
  status.textContent = `${prettyLabel(type)} opened`;
}

function snapToNearest() {
  const target = Math.round(rotation);

  const animate = () => {
    const diff = target - rotation;
    rotation += diff * 0.16;

    if (Math.abs(diff) < 0.002) {
      rotation = target;
      velocity = 0;
      render();
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      status.textContent = activeFrontType === "blank" ? "Ready" : `${prettyLabel(activeFrontType)} ready`;
      return;
    }

    render();
    animationFrame = requestAnimationFrame(animate);
  };

  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}

function startMomentum() {
  const animate = () => {
    if (isDragging) return;

    rotation += velocity;
    velocity *= 0.94;

    if (Math.abs(velocity) < 0.003) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
      snapToNearest();
      return;
    }

    render();
    animationFrame = requestAnimationFrame(animate);
  };

  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}

function onStart(x) {
  isDragging = true;
  moved = false;
  startX = x;
  lastX = x;
  lastTime = performance.now();
  velocity = 0;

  cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function onMove(x) {
  if (!isDragging) return;

  const now = performance.now();
  const dx = x - lastX;
  const dt = Math.max(1, now - lastTime);

  if (Math.abs(x - startX) > 6) moved = true;

  rotation -= dx / 90;
  velocity = -(dx / dt) * 0.18;

  lastX = x;
  lastTime = now;

  render();
}

function onEnd() {
  if (!isDragging) return;
  isDragging = false;

  if (moved) {
    dragJustHappened = true;
    setTimeout(() => {
      dragJustHappened = false;
    }, 180);
  }

  startMomentum();
}

scene.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  onStart(e.touches[0].clientX);
}, { passive: true });

scene.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 1) return;
  onMove(e.touches[0].clientX);
}, { passive: true });

scene.addEventListener("touchend", onEnd);

scene.addEventListener("mousedown", (e) => {
  onStart(e.clientX);
});

window.addEventListener("mousemove", (e) => {
  onMove(e.clientX);
});

window.addEventListener("mouseup", onEnd);

function startDefaultCanvas() {
  scene.style.display = "flex";
  scene.style.position = "absolute";
  scene.style.inset = "0";
  scene.style.width = "100vw";
  scene.style.height = "100vh";

  stack.style.position = "relative";
  stack.style.width = "100%";
  stack.style.height = "100%";

  codeView.classList.add("hidden");
  scene.classList.remove("hidden");

  buildPanels();
  render();

  status.textContent = "Ready";
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}
