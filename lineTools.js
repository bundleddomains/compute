async function pasteIntoSelectedLines() {
  if (!selectedLines.size) return;

  try {
    const text = await navigator.clipboard.readText();

    replaceSelectedLinesWithText(text);
  } catch (err) {
    alert("Paste failed. Copy text first.");
  }
}

async function addBetweenSelectedLines() {
  if (selectedLines.size !== 2) return;

  const selected = [...selectedLines].map(key => {
    const [block, line] = key.split(":").map(Number);

    return { block, line };
  });

  if (selected[0].block !== selected[1].block) return;

  selected.sort((a, b) => a.line - b.line);

  if (selected[1].line !== selected[0].line + 1) return;

  const part = currentParts[selected[0].block];

  if (!part) return;

  try {
    const text = await navigator.clipboard.readText();

    if (!text) return;

    saveUndoState();

    const lines = part.content.split("\n");

    lines.splice(
      selected[0].line,
      0,
      ...String(text).split("\n")
    );

    part.content = lines.join("\n");

    selectedLines = new Set();

    renderBlockMode();
  } catch (err) {
    alert("AND failed. Copy text first.");
  }
}

function buildSelectedLineTools() {
  const old = document.querySelector(".selected-line-tools");

  if (old) old.remove();

  const tools = document.createElement("div");

  tools.className = "selected-line-tools";

  tools.innerHTML = `
    <button type="button" class="selected-replace-btn">
      REPLACE
    </button>

    <button type="button" class="selected-and-btn">
      AND
    </button>

    <button type="button" class="selected-erase-btn">
      ERASE
    </button>
  `;

  tools
    .querySelector(".selected-replace-btn")
    .addEventListener("click", e => {
      e.stopPropagation();

      pasteIntoSelectedLines();
    });

  tools
    .querySelector(".selected-and-btn")
    .addEventListener("click", e => {
      e.stopPropagation();

      addBetweenSelectedLines();
    });

  tools
    .querySelector(".selected-erase-btn")
    .addEventListener("click", e => {
      e.stopPropagation();

      eraseSelectedLines();
    });

  document.body.appendChild(tools);

  updateSelectedLineTools();
}

function updateSelectedLineTools() {
  const tools = document.querySelector(".selected-line-tools");

  if (!tools) return;

  tools.classList.toggle(
    "show-selected-tools",
    selectedLines.size > 0
  );

  const andBtn =
    tools.querySelector(".selected-and-btn");

  if (!andBtn) return;

  const selected = [...selectedLines].map(key => {
    const [block, line] = key.split(":").map(Number);

    return { block, line };
  });

  const canAnd =
    selected.length === 2 &&
    selected[0].block === selected[1].block &&
    Math.abs(selected[0].line - selected[1].line) === 1;

  andBtn.disabled = !canAnd;

  andBtn.classList.toggle("and-ready", canAnd);
}