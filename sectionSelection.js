function enableSectionTapSelect() {
  const sections = [
    ...codeView.querySelectorAll(".code-section")
  ];

  sections.forEach(section => {
    section.addEventListener("click", e => {
      if (
        document.body.classList.contains("unified-mode")
      ) return;

      if (e.target.closest(".block-editor")) return;

      if (e.target.closest(".function-line")) return;

      if (e.target.closest(".line-number-box")) return;

      if (e.target.closest(".selected-line-tools")) return;

      const index = Number(section.dataset.index);

      const block =
        section.querySelector(".code-block");

      if (!block) return;

      if (!expandedBlocks.has(index)) {
        expandedBlocks.add(index);

        renderBlockMode();

        return;
      }

      if (e.target.closest(".section-label")) {
        toggleSection(index);

        return;
      }

      if (block.classList.contains("editing-block")) {
        return;
      }

      if (
        activeType &&
        getBlockType(block) !== activeType
      ) {
        return;
      }

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

      block.classList.remove("dragging-block");

      block.style.transform = "";

      block.style.opacity = "";

      clearTextSelection();
    });
  });
}