function cleanSelectedLines() {
  const validKeys = new Set();

  currentParts.forEach((part, blockIndex) => {
    if (
      !part ||
      typeof part.content !== "string"
    ) {
      return;
    }

    const lineCount =
      part.content.split("\n").length;

    for (let i = 1; i <= lineCount; i++) {
      validKeys.add(`${blockIndex}:${i}`);
    }
  });

  selectedLines = new Set(
    [...selectedLines].filter(key =>
      validKeys.has(key)
    )
  );
}

function getDisplayType(type) {
  if (type === "hidden") {
    return "script-src";
  }

  return type;
}

function toggleSection(index) {
  if (expandedBlocks.has(index)) {
    expandedBlocks.delete(index);
  } else {
    expandedBlocks.add(index);
  }

  renderBlockMode();
}