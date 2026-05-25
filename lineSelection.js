function enableLineNumberToggle() {
  const buttons = [
    ...codeView.querySelectorAll(".line-number-box")
  ];

  let active = false;

  let mode = "add";

  let pointerId = null;

  let touched = new Set();

  function applyButton(button) {
    if (!button) return;

    const block = button.dataset.block;

    const line = button.dataset.line;

    const key = `${block}:${line}`;

    if (touched.has(key)) return;

    touched.add(key);

    if (mode === "remove") {
      selectedLines.delete(key);
    } else {
      selectedLines.add(key);
    }

    const row = button.closest(".code-line");

    if (row) {
      row.classList.toggle(
        "selected-line",
        selectedLines.has(key)
      );
    }

    updateSelectedLineTools();
  }

  function buttonFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);

    if (!el) return null;

    return el.closest(".line-number-box");
  }

  buttons.forEach(button => {
    button.addEventListener("pointerdown", e => {
      e.preventDefault();

      e.stopPropagation();

      const key =
        `${button.dataset.block}:${button.dataset.line}`;

      active = true;

      pointerId = e.pointerId;

      touched = new Set();

      mode =
        selectedLines.has(key)
          ? "remove"
          : "add";

      button.setPointerCapture(e.pointerId);

      applyButton(button);
    });

    button.addEventListener("pointermove", e => {
      if (!active || e.pointerId !== pointerId) return;

      e.preventDefault();

      e.stopPropagation();

      applyButton(
        buttonFromPoint(e.clientX, e.clientY)
      );
    });

    button.addEventListener("pointerup", e => {
      if (e.pointerId !== pointerId) return;

      active = false;

      pointerId = null;

      touched = new Set();

      try {
        button.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    button.addEventListener("pointercancel", e => {
      active = false;

      pointerId = null;

      touched = new Set();

      try {
        button.releasePointerCapture(e.pointerId);
      } catch (err) {}
    });

    button.addEventListener("click", e => {
      e.preventDefault();

      e.stopPropagation();
    });
  });
}