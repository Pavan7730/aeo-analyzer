// ---------- extractor ----------
function extractMainContent() {
  const clone = document.body.cloneNode(true);

  ["nav", "footer", "aside", "script", "style"].forEach(tag => {
    clone.querySelectorAll(tag).forEach(el => el.remove());
  });

  return clone;
}

// ---------- content map ----------
function buildContentMap(root) {
  const sections = [];
  let current = null;

  root.querySelectorAll("h1,h2,h3,p,ul,ol").forEach(el => {
    if (el.tagName.startsWith("H")) {
      current = {
        heading: el.innerText,
        blocks: []
      };
      sections.push(current);
    } else if (current) {
      current.blocks.push({
        type: el.tagName.toLowerCase(),
        text: el.innerText
      });
    }
  });

  return sections;
}

// ---------- scoring ----------
function scoreAEO(sections) {
  let score = 0;

  sections.forEach(sec => {
    if (sec.heading.includes("?")) score += 10;
  });

  return Math.min(score, 100);
}

// ---------- expose ----------
window.runAEOAnalyzer = function () {
  const root = extractMainContent();
  const sections = buildContentMap(root);
  const score = scoreAEO(sections);

  return { score, sections };
};
