function enableBlockSelectionAndErase() {
  const blocks = [
    ...codeView.querySelectorAll(".code-block")
  ];

  blocks.forEach(block => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;
    let moved = false;

    function blockIsActiveForEditing() {
      if (
        document.body.classList.contains("unified-mode")
      ) {
        return false;
      }

      if (!activeType) return true;

      return getBlockType(block) === activeType;
    }

    block.addEventListener("pointerdown", e => {
      if (e.target.closest(".line-number-box")) {
        return;
      }

      if (!blockIsActiveForEditing()) {
        return;
      }

      if (block.classList.contains("editing-block")) {
        return;
      }

      const index = Number(block.dataset.index);

      if (!expandedBlocks.has(index)) {
        return;
      }

      startX = e.clientX;
      startY = e.clientY;

      dx = 0;
      dy = 0;

      moved = false;
      dragging = true;

      block.setPointerCapture(e.pointerId);

      clearTextSelection();
    });

    block.addEventListener("pointermove", e => {
      if (!dragging) return;

      if (!blockIsActiveForEditing()) {
        return;
      }

      if (block.classList.contains("editing-block")) {
        return;
      }

      dx = e.clientX - startX;
      dy = e.clientY - startY;

      const distance = Math.hypot(dx, dy);

      if (distance > 2) {
        moved = true;
      }

      if (distance > 18) {
        block.classList.add("dragging-block");

        block.style.transform =
          `translate(${dx}px, ${dy}px)`;

        block.style.opacity = "0.82";
      }
    });

    block.addEventListener("pointerup", e => {
      if (!dragging) return;

      dragging = false;

      if (!blockIsActiveForEditing()) {
        return;
      }

      if (block.classList.contains("editing-block")) {
        return;
      }

      if (!moved) {
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

        try {
          block.releasePointerCapture(e.pointerId);
        } catch (err) {}

        return;
      }

      const distance = Math.hypot(dx, dy);

      const eraseThreshold = 120;

      if (distance > eraseThreshold) {
        saveUndoState();

        const index = Number(block.dataset.index);

        block.classList.add("erasing-block");

        setTimeout(() => {
          currentParts[index] = null;

          currentParts =
            currentParts.filter(Boolean);

          expandedBlocks = new Set(
            [...expandedBlocks]
              .filter(i => i !== index)
              .map(i => i > index ? i - 1 : i)
          );

          cleanSelectedLines();

          renderBlockMode();
        }, 180);

        return;
      }

      block.classList.remove("dragging-block");

      block.style.transform = "";

      block.style.opacity = "";

      try {
        block.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    block.addEventListener("pointercancel", e => {
      dragging = false;

      block.classList.remove("dragging-block");

      block.style.transform = "";

      block.style.opacity = "";

      try {
        block.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });
  });
}