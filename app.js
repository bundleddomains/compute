const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");
const status = document.getElementById("status");

document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("gesturechange", e => e.preventDefault());
document.addEventListener("gestureend", e => e.preventDefault());

let activeType = null;
let currentParts = [];
let selectBox = null;
let statusWasPressed = false;

let selectBoxRAF = null;
let latestSelectBoxPoint = null;

// 🔥 FIX: scroll memory
let savedScrollY = 0;

if (status) {
  status.addEventListener("click", (e) => {
    e.stopPropagation();
    statusWasPressed = true;
    status.classList.remove("status-faded");
    status.classList.add("status-green");
  });
}

/* ---------------- START UI ---------------- */

function buildStartUI() {
  stack.innerHTML = "";
  stack.classList.remove("fade-out-start");

  const startMessage = document.createElement("div");
  startMessage.className = "start-message";
  startMessage.innerHTML = `
    Replace and Erase;<br>
    Luhvcraft sculpted intellectual form of silence through the art of preservation.
  `;

  const ghostTitle = document.createElement("div");
  ghostTitle.className = "ghost-title";
  ghostTitle.innerHTML = `
    <div>Replace</div>
    <div>&amp; Erase</div>
  `;

  const centerTitle = document.createElement("div");
  centerTitle.className = "center-title";
  centerTitle.innerHTML = `
    <span class="center-word word-replace">REPLACE</span>
    <span class="center-word word-and">AND</span>
    <span class="center-word word-erase">ERASE</span>
  `;

  stack.appendChild(startMessage);
  stack.appendChild(ghostTitle);
  stack.appendChild(centerTitle);

  stack.removeEventListener("click", handleWholeScreenPaste);
  stack.addEventListener("click", handleWholeScreenPaste);
}

async function handleWholeScreenPaste(e) {
  if (e.target.closest("#status")) return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) return;

    stack.classList.add("fade-out-start");

    setTimeout(() => {
      currentParts = splitCode(text);

      if (statusWasPressed && status) {
        status.classList.add("status-faded");
      }

      stack.removeEventListener("click", handleWholeScreenPaste);
      renderBlockMode(true);
    }, 320);

  } catch (err) {
    alert("Clipboard paste failed.");
  }
}

/* ---------------- CORE PARSER (UNCHANGED LOGIC) ---------------- */

function removePasteJunk(text) {
  return text
    .replace(/^\s*[\w\-(). ]+\.(png|jpg|jpeg|gif|webp|svg)\s*\n+/i, "")
    .trim();
}

function cleanHTMLShell(html) {
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
}

function isHeadTag(text) {
  const t = text.trim();
  return /^<meta\b|^<title\b|^<link\b|^<base\b/i.test(t);
}

function pushCleanHTML(parts, html) {
  const cleaned = cleanHTMLShell(html);
  if (!cleaned) return;

  parts.push({
    type: isHeadTag(cleaned) ? "head" : "html",
    content: cleaned
  });
}

function isStandaloneJS(text) {
  const t = text.trim();
  return (
    /^(const|let|var|function|class)\b/.test(t) &&
    (/\bdocument\./.test(t) || /\bfunction\b/.test(t))
  );
}

function isStandaloneCSS(text) {
  const t = text.trim();
  return /\{[\s\S]*:\s*[^;]+;/.test(t) && !/function|document/.test(t);
}

function splitCode(text) {
  text = removePasteJunk(text);

  if (isStandaloneJS(text)) return [{ type: "js", content: text.trim() }];
  if (isStandaloneCSS(text)) return [{ type: "css", content: text.trim() }];

  const parts = [];
  const regex =
    /(<style[\s\S]*?<\/style>)|(<script[\s\S]*?<\/script>)|(<meta[^>]*>)|(<link[^>]*>)|(<title[\s\S]*?<\/title>)/gi;

  let last = 0;
  let m;

  while ((m = regex.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) pushCleanHTML(parts, before);

    const full = m[0];

    if (/^<style/i.test(full)) {
      parts.push({ type: "css", content: full.replace(/<\/?style[^>]*>/g, "").trim() });
    } else if (/^<script/i.test(full)) {
      parts.push({ type: "js", content: full.replace(/<\/?script[^>]*>/g, "").trim() });
    } else {
      parts.push({ type: "head", content: full.trim() });
    }

    last = regex.lastIndex;
  }

  const after = text.slice(last).trim();
  if (after) pushCleanHTML(parts, after);

  return parts;
}

/* ---------------- 🔥 FIXED RENDER (KEY CHANGE) ---------------- */

function renderBlockMode(animated = false) {
  closeOtherEditors();

  document.body.classList.remove("unified-mode");

  scene.classList.add("hidden");
  codeView.classList.remove("hidden");
  codeView.classList.toggle("fade-in-blocks", animated);

  // 🔥 SAVE SCROLL BEFORE WIPE
  savedScrollY = codeView.scrollTop;

  let html = "";

  currentParts.forEach((part, index) => {
    if (part.type === "head" || part.type === "hidden") return;

    html += `
      <section class="code-section">
        <div class="code-block" data-index="${index}">
          <pre>${escapeHTML(part.content)}</pre>
        </div>
      </section>
    `;
  });

  codeView.innerHTML = html;

  buildTypeToolbar();
  enableToolbarSwipe();
  enableInsertGapSwipe();
  enableBlockSelectionAndErase();
  enableSectionTapSelect();
  enableFunctionLineTap();

  // 🔥 RESTORE SCROLL AFTER DOM UPDATE
  requestAnimationFrame(() => {
    codeView.scrollTop = savedScrollY;
  });
}

/* ---------------- UI HELPERS ---------------- */

function escapeHTML(text) {
  return text.replaceAll("&", "&amp;")
             .replaceAll("<", "&lt;")
             .replaceAll(">", "&gt;");
}

/* ---------------- PLACEHOLDERS (unchanged) ---------------- */

function closeOtherEditors() {}
function enableToolbarSwipe() {}
function enableInsertGapSwipe() {}
function enableBlockSelectionAndErase() {}
function enableSectionTapSelect() {}
function enableFunctionLineTap() {}

/* ---------------- INIT ---------------- */

function startDefaultCanvas() {
  codeView.classList.add("hidden");
  scene.classList.remove("hidden");
  activeType = null;
  currentParts = [];
  buildStartUI();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startDefaultCanvas);
} else {
  startDefaultCanvas();
}