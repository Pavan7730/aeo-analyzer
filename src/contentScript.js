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
        heading: el.innerText.trim(),
        blocks: []
      };
      sections.push(current);
    } else if (current) {
      current.blocks.push({
        type: el.tagName.toLowerCase(),
        text: el.innerText.trim()
      });
    }
  });

  return sections;
}

// ---------- feedback ----------
function generateFeedback(sections) {
  const feedback = [];

  let hasDefinition = false;
  let hasQuestions = false;
  let hasLists = false;

  sections.forEach(sec => {
    if (sec.heading && sec.heading.includes("?")) hasQuestions = true;

    sec.blocks.forEach(block => {
      if (/ is | refers to | means /i.test(block.text)) hasDefinition = true;
      if (block.type === "ul" || block.type === "ol") hasLists = true;
    });
  });

  if (!hasDefinition)
    feedback.push("Add a clear definition near the top of the content.");

  if (!hasQuestions)
    feedback.push("Use question-based headings like 'What is…' or 'How does…'.");

  if (!hasLists)
    feedback.push("Use bullet points or steps to improve AI extractability.");

  if (feedback.length === 0)
    feedback.push("Great structure! Your content is AI-friendly.");

  return feedback;
}

// ---------- scoring ----------
function scoreAEO(sections) {
  let score = 0;

  sections.forEach(sec => {
    if (sec.heading && sec.heading.includes("?")) score += 10;
  });

  return Math.min(score, 100);
}

// ---------- expose ----------
window.runAEOAnalyzer = function () {
  const root = extractMainContent();
  const sections = buildContentMap(root);
  const score = scoreAEO(sections);
  const feedback = generateFeedback(sections);

  return {
    score,
    sections,
    intent: "informational",
    feedback
  };
};
