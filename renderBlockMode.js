function renderBlockMode(animated = false) {
  closeOtherEditors();

  document.body.classList.remove("unified-mode");

  scene.classList.add("hidden");

  codeView.classList.remove("hidden");

  codeView.classList.toggle(
    "fade-in-blocks",
    animated
  );

  cleanSelectedLines();

  const scrollY = codeView.scrollTop;

  const activeElement = document.activeElement;

  let html = "";

  currentParts.forEach((part, index) => {
    if (!part) return;

    const displayType =
      getDisplayType(part.type);

    const isExpanded =
      expandedBlocks.has(index);

    const blockMinClass =
      isExpanded ? "" : " minimized-block";

    html += `
      <section
        class="code-section"
        data-type="${part.type}"
        data-section-id="${part.type}-${index}"
        data-index="${index}">

        <div
          class="section-label"
          data-index="${index}">
          ${displayType}
        </div>

        <div class="section-body">
          <div
            class="code-block type-${part.type}${blockMinClass}"
            data-index="${index}">

            ${renderCodeBlockHTML(
              part.content,
              index,
              !isExpanded
            )}

          </div>
        </div>
      </section>
    `;

    html += `
      <div
        class="insert-gap"
        data-insert-index="${index + 1}">
      </div>
    `;
  });

  codeView.innerHTML = html;

  requestAnimationFrame(() => {
    codeView.scrollTop = scrollY;

    if (
      activeElement &&
      activeElement.blur
    ) {
      activeElement.blur();
    }
  });

  buildTypeToolbar();

  buildSelectedLineTools();

  enableToolbarSwipe();

  enableInsertGapSwipe();

  enableBlockSelectionAndErase();

  enableSectionTapSelect();

  enableFunctionLineTap();

  enableLineNumberToggle();

  codeView
    .querySelectorAll(".section-label")
    .forEach(label => {
      label.addEventListener("click", e => {
        e.stopPropagation();

        const index = Number(
          label.dataset.index
        );

        toggleSection(index);
      });
    });
}