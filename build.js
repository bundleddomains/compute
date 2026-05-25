function buildFullFile() {
  closeOtherEditors();

  const headParts = [];
  const bodyParts = [];

  currentParts.forEach(part => {
    const content = part.content.trim();
    if (!content) return;

    if (part.type === "head") {
      headParts.push(content);
    } else if (part.type === "css") {
      headParts.push(`<style>
${content}
</style>`);
    } else if (part.type === "js") {
      bodyParts.push(`<script>
${content}
</script>`);
    } else if (part.type === "hidden") {
      bodyParts.push(content);
    } else {
      bodyParts.push(content);
    }
  });

  return `<!doctype html>
<html>
<head>
${headParts.join("\n")}
</head>
<body>
${bodyParts.join("\n\n")}
</body>
</html>`;
}

function getUnifiedCleanText() {
  const usableParts = currentParts.filter(part => {
    return part && part.content && part.content.trim();
  });

  if (usableParts.length === 1) {
    return usableParts[0].content.trim();
  }

  return buildFullFile()
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

async function copyFinalBuild() {
  closeOtherEditors();

  const finalCode = getUnifiedCleanText();

  try {
    await navigator.clipboard.writeText(finalCode);

    if (status) {
      status.textContent = "COPIED";
      status.classList.remove("status-faded");
      status.classList.add("status-green");
    }

    const copyBtn = document.querySelector(".copy-final-btn");
    if (copyBtn) {
      copyBtn.textContent = "COPIED";
      setTimeout(() => {
        copyBtn.textContent = "COPY ALL";
      }, 900);
    }
  } catch (err) {
    alert("Copy failed. Try again.");
  }
}