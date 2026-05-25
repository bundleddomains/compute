function getSelectedLineGroups() {
  const groups = {};

  selectedLines.forEach(key => {
    const [block, line] = key.split(":").map(Number);

    if (!groups[block]) groups[block] = [];
    groups[block].push(line);
  });

  Object.keys(groups).forEach(block => {
    groups[block].sort((a, b) => a - b);
  });

  return groups;
}

function cleanSelectedLines() {
  const validKeys = new Set();

  currentParts.forEach((part, blockIndex) => {
    if (!part || typeof part.content !== "string") return;

    const lineCount = part.content.split("\n").length;

    for (let i = 1; i <= lineCount; i++) {
      validKeys.add(`${blockIndex}:${i}`);
    }
  });

  selectedLines = new Set(
    [...selectedLines].filter(key => validKeys.has(key))
  );
}

function eraseSelectedLines() {
  replaceSelectedLinesWithText("");
}

function replaceSelectedLinesWithText(newText) {
  closeOtherEditors();

  const groups = getSelectedLineGroups();

  const blockIndexes = Object
    .keys(groups)
    .map(Number)
    .sort((a, b) => a - b);

  if (!blockIndexes.length) return;

  saveUndoState();

  const pasteLines = String(newText).split("\n");
  const firstBlock = blockIndexes[0];

  blockIndexes.forEach(blockIndex => {
    const part = currentParts[blockIndex];
    if (!part) return;

    const lines = part.content.split("\n");

    const selected = new Set(groups[blockIndex]);

    const minLine = Math.min(...groups[blockIndex]);

    const insertAt = Math.max(0, minLine - 1);

    const kept = lines.filter((line, i) => {
      return !selected.has(i + 1);
    });

    if (blockIndex === firstBlock && newText !== "") {
      kept.splice(insertAt, 0, ...pasteLines);
    }

    part.content = kept.join("\n");
  });

  selectedLines = new Set();
  renderBlockMode();
}