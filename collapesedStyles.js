function injectCollapsedStyles() {
  if (
    document.getElementById(
      "collapsed-block-style"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "collapsed-block-style";

  style.textContent = `
    .code-block.minimized-block {
      min-height: 44px;
      max-height: 62px;
      overflow: hidden;
      opacity: .86;
    }

    .code-block.minimized-block .collapsed-preview {
      min-height: 44px;
      padding: 10px 12px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      pointer-events: none;
    }

    .collapsed-preview span {
      flex: 0 0 auto;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      opacity: .52;
      white-space: nowrap;
    }

    .collapsed-preview pre {
      margin: 0;
      opacity: .74;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    .code-block.minimized-block::after {
      content: " +";
      opacity: .45;
    }

    .selected-line-tools {
      position: fixed;
      left: 18px;
      bottom: 76px;
      z-index: 91;
      display: none;
      gap: 8px;
    }

    .selected-line-tools.show-selected-tools {
      display: flex;
    }

    .selected-line-tools button {
      border: 0;
      border-radius: 999px;
      padding: 12px 14px;
      background: #111;
      color: white;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      box-shadow:
        0 10px 24px rgba(0,0,0,.18);

      cursor: pointer;
      touch-action: manipulation;
    }
  `;

  document.head.appendChild(style);
}