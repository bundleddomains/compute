let undoStack = [];

function saveUndoState() {
  undoStack.push({
    parts: JSON.parse(JSON.stringify(currentParts)),
    selected: [...selectedLines],
    expanded: [...expandedBlocks],
    active: activeType
  });

  if (undoStack.length > 25) {
    undoStack.shift();
  }
}

function undoLastChange() {
  closeOtherEditors();

  const last = undoStack.pop();

  if (!last) return;

  currentParts = last.parts;

  selectedLines = new Set(last.selected);

  expandedBlocks = new Set(last.expanded);

  activeType = last.active;

  renderBlockMode();
}