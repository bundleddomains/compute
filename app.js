const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");
const status = document.getElementById("status");

/* ---------------- SAFE MODE (NO iOS FREEZE) ---------------- */
// ❌ DO NOT block gestures globally (this breaks zoom + taps)
// removed gesturestart/gesturechange/gestureend preventDefault

let activeType = null;
let currentParts = [];
let selectBox = null;
let statusWasPressed = false;

let selectBoxRAF = null;
let latestSelectBoxPoint = null;

/* ---------------- STATUS ---------------- */

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

  stack.onclick = handleWholeScreenPaste;
}

/* ---------------- START CLICK / PASTE ---------------- */

async function handleWholeScreenPaste(e) {
  if (e.target.closest("#status")) return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text?.trim()) return;

    stack.classList.add("fade-out-start");

    setTimeout(() => {
      currentParts = splitCode(text);

      if (statusWasPressed && status) {
        status.classList.add("status-faded");
      }

      renderBlockMode(true);
    }, 320);

  } catch (err) {
    alert("Clipboard paste failed. Copy code first.");
  }
}

/* ---------------- CLEANING ---------------- */

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
  return /^<meta\b/i.test(t) || /^<title\b/i.test(t) || /^<link\b/i.test(t) || /^<base\b/i.test(t);
}

function pushCleanHTML(parts, html) {
  const cleaned = cleanHTMLShell(html);
  if (!cleaned) return;

  parts.push({
    type: isHeadTag(cleaned) ? "head" : "html",
    content: cleaned
  });
}

/* ---------------- TYPE DETECTION ---------------- */

function isStandaloneJS(text) {
  const t = text.trim();

  const jsLike =
    /\bfunction\b|\bconst\b|\blet\b|\bvar\b|\bdocument\./.test(t);

  const notHTML =
    !/^<html|^<div|^<style|^<script/i.test(t);

  return jsLike && notHTML;
}

function isStandaloneCSS(text) {
  const t = text.trim();

  const hasBraces = /\{[\s\S]*\}/.test(t);
  const hasProps = /[a-z-]+\s*:\s*[^;]+;/.test(t);
  const notHTML = !/^<html|^<div|^<script/i.test(t);

  return hasBraces && hasProps && notHTML;
}

/* ---------------- SPLIT CODE ---------------- */

function splitCode(text) {
  text = removePasteJunk(text);

  if (isStandaloneJS(text)) {
    return [{ type: "js", content: text.trim() }];
  }

  if (isStandaloneCSS(text)) {
    return [{ type: "css", content: text.trim() }];
  }

  const parts = [];

  const regex =
    /(<style[\s\S]*?<\/style>)|(<script[\s\S]*?<\/script>)|(<svg[\s\S]*?<\/svg>)|(<meta[^>]*>)|(<link[^>]*>)|(<title[\s\S]*?<\/title>)/gi;

  let last = 0;
  let m;

  while ((m = regex.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) pushCleanHTML(parts, before);

    const full = m[0];

    if (/^<style/i.test(full)) {
      parts.push({
        type: "css",
        content: full.replace(/<style[^>]*>/i, "").replace(/<\/style>/i, "").trim()
      });
    }

    else if (/^<script/i.test(full)) {
      if (/src=/i.test(full)) {
        parts.push({ type: "hidden", content: full.trim() });
      } else {
        parts.push({
          type: "js",
          content: full.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim()
        });
      }
    }

    else if (/^<svg/i.test(full)) {
      parts.push({ type: "svg", content: full.trim() });
    }

    else {
      parts.push({ type: "head", content: full.trim() });
    }

    last = regex.lastIndex;
  }

  const after = text.slice(last).trim();
  if (after) pushCleanHTML(parts, after);

  return parts;
}

/* ---------------- BUILD OUTPUT ---------------- */

function buildFullFile() {
  const head = [];
  const body = [];

  currentParts.forEach(p => {
    if (!p?.content?.trim()) return;

    if (p.type === "head") head.push(p.content);

    else if (p.type === "css")
      head.push(`<style>\n${p.content}\n</style>`);

    else if (p.type === "js")
      body.push(`<script>\n${p.content}\n</script>`);

    else if (p.type === "hidden")
      body.push(p.content);

    else
      body.push(p.content);
  });

  return `<!doctype html>
<html>
<head>
${head.join("\n")}
</head>
<body>
${body.join("\n\n")}
</body>
</html>`;
}

/* ---------------- COPY ---------------- */

async function copyFinalBuild() {
  const final = buildFullFile();

  try {
    await navigator.clipboard.writeText(final);

    if (status) {
      status.textContent = "COPIED";
      status.classList.add("status-green");
    }

  } catch (e) {
    alert("Copy failed");
  }
}

/* ---------------- VIEW SWITCH ---------------- */

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