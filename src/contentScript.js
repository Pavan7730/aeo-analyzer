/*************************************
 * MAIN CONTENT EXTRACTION
 *************************************/
function extractMainContent() {
  const clone = document.body.cloneNode(true);

  [
    "nav",
    "footer",
    "aside",
    "script",
    "style",
    "noscript",
    ".ads",
    ".sidebar",
    ".menu"
  ].forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  return clone;
}

/*************************************
 * CONTENT MAP (H1–H3 + TEXT)
 *************************************/
function buildContentMap(root) {
  const sections = [];
  let current = null;

  root.querySelectorAll("h1,h2,h3,p,ul,ol").forEach(el => {
    if (/H[1-3]/.test(el.tagName)) {
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

/*************************************
 * PAGE INTENT DETECTION
 *************************************/
function detectPageIntent(sections) {
  let questionHeadings = 0;
  let optionLines = 0;

  sections.forEach(sec => {
    if (sec.heading.endsWith("?")) questionHeadings++;

    sec.blocks.forEach(block => {
      if (/^[A-D]\.|^\d+\./.test(block.text)) {
        optionLines++;
      }
    });
  });

  if (questionHeadings > 0 && optionLines >= 2) {
    return "exam";
  }

  return "informational";
}

/*************************************
 * AEO SCORE (SIMPLE BUT HONEST)
 *************************************/
function scoreAEO(sections) {
  let score = 0;

  sections.forEach(sec => {
    if (sec.heading.endsWith("?")) score += 10;

    sec.blocks.forEach(block => {
      if (/ is | refers to | means /i.test(block.text)) score += 10;
      if (block.type === "ul" || block.type === "ol") score += 5;
      if (block.text.split(" ").length < 60) score += 3;
    });
  });

  return Math.min(score, 100);
}

/*************************************
 * SMART FEEDBACK ENGINE (NON-GENERIC)
 *************************************/
function generateFeedback(sections, intent) {
  const feedback = [];

  // --- EXAM / QUESTION PAGES ---
  if (intent === "exam") {
    const sampleQuestion = sections.find(s => s.heading.endsWith("?"));

    feedback.push(
      "This page is designed to test users, not explain answers. AI answer engines do not use MCQ-style content."
    );

    if (sampleQuestion) {
      feedback.push(
        `Under the question “${sampleQuestion.heading}”, add a short explanation explaining the correct option in 2–3 sentences.`
      );
    }

    feedback.push(
      "To make this page AEO-ready, include a clear ‘Explanation’ or ‘Why this answer is correct’ section after each question."
    );

    feedback.push(
      "Answer engines prefer explanatory content that teaches concepts, not answer choices."
    );

    return feedback;
  }

  // --- INFORMATIONAL / BLOG PAGES ---
  const h2s = sections.slice(0, 3);
  let hasDefinition = false;
  let longParagraphs = [];
  let missingDirectAnswers = [];

  sections.forEach(sec => {
    sec.blocks.forEach(block => {
      if (/ is | refers to | means /i.test(block.text)) {
        hasDefinition = true;
      }
      if (block.text.split(" ").length > 90) {
        longParagraphs.push(sec.heading);
      }
    });

    if (
      sec.heading &&
      /what|how|why|when|who/i.test(sec.heading) &&
      sec.blocks.length > 0
    ) {
      const firstBlock = sec.blocks[0];
      if (firstBlock.text.split(" ").length > 70) {
        missingDirectAnswers.push(sec.heading);
      }
    }
  });

  if (!hasDefinition && sections[0]) {
    feedback.push(
      `Add a clear definition immediately under the heading “${sections[0].heading}” using 1–2 concise sentences.`
    );
  }

  missingDirectAnswers.forEach(h => {
    feedback.push(
      `Under the heading “${h}”, add a short direct answer (30–50 words) before going into details.`
    );
  });

  longParagraphs.slice(0, 2).forEach(h => {
    feedback.push(
      `Break the long paragraph under “${h}” into shorter, answer-focused blocks to improve AI extractability.`
    );
  });

  if (feedback.length === 0) {
    feedback.push(
      "This page is well-structured for AI answers. The content is clear, segmented, and easy to extract."
    );
  }

  return feedback;
}

/*************************************
 * EXPOSE ANALYZER
 *************************************/
window.runAEOAnalyzer = function () {
  const root = extractMainContent();
  const sections = buildContentMap(root);
  const intent = detectPageIntent(sections);

  if (intent === "exam") {
    return {
      score: 0,
      intent,
      feedback: generateFeedback(sections, intent),
      sections
    };
  }

  const score = scoreAEO(sections);
  const feedback = generateFeedback(sections, intent);

  return {
    score,
    intent,
    feedback,
    sections
  };
};
