function removePasteJunk(text) {
  return text
    .replace(/^\s*[\w\-(). ]+\.(png|jpg|jpeg|gif|webp|svg)\s*\n+/i, "")
    .trim();
}

function cleanHTMLShell(html) {
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
}

function isHeadTag(text) {
  const trimmed = text.trim();

  return (
    /^<meta\b/i.test(trimmed) ||
    /^<title\b/i.test(trimmed) ||
    /^<link\b/i.test(trimmed) ||
    /^<base\b/i.test(trimmed)
  );
}

function pushCleanHTML(parts, html) {
  const cleanedHTML = cleanHTMLShell(html);
  if (!cleanedHTML) return;

  parts.push({
    type: isHeadTag(cleanedHTML) ? "head" : "html",
    content: cleanedHTML
  });
}

function isStandaloneJS(text) {
  const trimmed = text.trim();

  const startsLikeJS =
    /^(const|let|var|function|async function|class)\b/.test(trimmed);

  const hasJSStructure =
    /\bfunction\s+[A-Za-z0-9_$]+\s*\(/.test(trimmed) ||
    /\bconst\s+[A-Za-z0-9_$]+\s*=/.test(trimmed) ||
    /\bdocument\.getElementById\b/.test(trimmed);

  const startsLikeHTML =
    /^<!doctype|^<html|^<head|^<body|^<div|^<style|^<script|^<svg/i.test(trimmed);

  return hasJSStructure && startsLikeJS && !startsLikeHTML;
}

function isStandaloneCSS(text) {
  const trimmed = text.trim();

  const startsLikeHTML =
    /^<!doctype|^<html|^<head|^<body|^<div|^<style|^<script|^<svg/i.test(trimmed);

  const hasCSSBlock =
    /[.#a-zA-Z0-9_*:\-\s,[\]="'>]+?\s*\{[\s\S]*?\}/.test(trimmed);

  const hasCSSProps =
    /[a-z-]+\s*:\s*[^;]+;/.test(trimmed);

  const hasJSStructure =
    /\bfunction\s+[A-Za-z0-9_$]+\s*\(/.test(trimmed) ||
    /\bdocument\.getElementById\b/.test(trimmed) ||
    /\bconst\s+[A-Za-z0-9_$]+\s*=/.test(trimmed);

  return hasCSSBlock && hasCSSProps && !startsLikeHTML && !hasJSStructure;
}

function splitCode(text) {
  text = removePasteJunk(text);

  if (isStandaloneJS(text)) {
    return [{ type: "js", content: text.trim() }];
  }

  if (isStandaloneCSS(text)) {
    return [{ type: "css", content: text.trim() }];
  }

  const parts = [];

  const headMatch = text.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);

  if (headMatch) {
    let headContent = headMatch[1];
    let extractedFromHead = "";

    headContent = headContent.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>|<svg\b[\s\S]*?<\/svg>/gi,
      match => {
        extractedFromHead += "\n" + match + "\n";
        return "";
      }
    );

    const cleanHead = headContent.trim();

    if (cleanHead) {
      parts.push({
        type: "head",
        content: cleanHead
      });
    }

    text = text.replace(headMatch[0], "\n" + extractedFromHead + "\n");
  }

  const regex =
    /(<style\b[^>]*>[\s\S]*?<\/style>)|(<script\b[^>]*>[\s\S]*?<\/script>)|(<svg\b[\s\S]*?<\/svg>)/gi;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) pushCleanHTML(parts, before);

    const full = match[0];

    if (/^<style/i.test(full)) {
      parts.push({
        type: "css",
        content: full.replace(/<style\b[^>]*>/i, "").replace(/<\/style>/i, "").trim()
      });
    } else if (/^<script/i.test(full)) {
      if (/\bsrc\s*=/.test(full)) {
        parts.push({
          type: "hidden",
          content: full.trim()
        });
      } else {
        parts.push({
          type: "js",
          content: full.replace(/<script\b[^>]*>/i, "").replace(/<\/script>/i, "").trim()
        });
      }
    } else if (/^<svg/i.test(full)) {
      parts.push({
        type: "svg",
        content: full.trim()
      });
    }

    lastIndex = regex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();
  if (after) pushCleanHTML(parts, after);

  return parts;
}