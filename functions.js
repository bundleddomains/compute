function findMatchingFunctionEnd(text, startIndex) {
  const openIndex = text.indexOf("{", startIndex);

  if (openIndex === -1) return null;

  let depth = 0;

  let inString = false;
  let stringChar = "";
  let escaped = false;

  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }

      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }

      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringChar) {
        inString = false;
        stringChar = "";
      }

      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === "{") depth++;

    if (char === "}") depth--;

    if (depth === 0) {
      return i + 1;
    }
  }

  return null;
}

function enableFunctionLineTap() {
  const labels = [...codeView.querySelectorAll(".function-line")];

  labels.forEach(label => {
    label.addEventListener("pointerdown", e => {
      e.stopPropagation();

      const block = label.closest(".code-block");

      if (!block) return;

      const index = Number(block.dataset.index);

      expandedBlocks.add(index);

      const text = currentParts[index]
        ? currentParts[index].content
        : "";

      const functionHeader = label.textContent.trim();

      closeOtherEditors(block);

      codeView
        .querySelectorAll(".code-block.selected-block")
        .forEach(other => {
          if (
            other !== block &&
            !other.classList.contains("editing-block")
          ) {
            other.classList.remove("selected-block");
          }
        });

      block.classList.add("selected-block");

      const start = text.indexOf(functionHeader);

      if (start === -1) return;

      const end = findMatchingFunctionEnd(text, start);

      if (end === null) return;

      convertBlockToTextarea(block, start, end);
    });
  });
}