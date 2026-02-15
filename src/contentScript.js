/************************************************
 * MAIN CONTENT EXTRACTION
 ************************************************/
function extractMainContent() {
  const clone = document.body.cloneNode(true);

  const removeSelectors = [
    "nav",
    "footer",
    "aside",
    "script",
    "style",
    "noscript",
    ".ads",
    ".sidebar",
    ".menu",
    ".popup"
  ];

  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  return clone;
}

/************************************************
 * BUILD CONTENT MAP (H1–H3 + TEXT)
 ************************************************/
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

/************************************************
 * PAGE INTENT DETECTION
 ************************************************/
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

/************************************************
 * AEO SCORING (HONEST & INTENT-AWARE)
 ************************************************/
function scoreAEO(sections, intent) {
  if (intent === "exam") return 0;

  let score = 0;

  sections.forEach(sec => {
    // Question-style headings
    if (/what|how|why|when|who/i.test(sec.heading)) {
      score += 8;
    }

    sec.blocks.forEach(block => {
      const wordCount = block.text.split(" ").length;

      // Definition signals
      if (/ is | refers to | means /i.test(block.text)) score += 10;

      // Lists and steps
      if (block.type === "ul" || block.type === "ol") score += 5;

      // Direct answer sized paragraphs
      if (wordCount >= 25 && wordCount <= 60) score += 5;

      // Penalize very long paragraphs
      if (wordCount > 120) score -= 5;
    });
  });

  return Math.max(0, Math.min(score, 100));
}

/************************************************
 * SMART, PAGE-SPECIFIC FEEDBACK
 ************************************************/
function generateFeedback(sections, intent) {
  const feedback = [];

  /* ---------- EXAM / MCQ PAGES ---------- */
  if (intent === "exam") {
    const example = sections.find(s => s.heading.endsWith("?"));

    feedback.push(
      "This page is designed for testing users, not for explaining answers. Answer engines do not use MCQ-style content."
    );

    if (example) {
      feedback.push(
        `Under the question “${example.heading}”, add a short explanation describing why the correct option is right.`
      );
    }

    feedback.push(
      "Add an 'Explanation' or 'Solution' section after each question to make this page usable for AI answers."
    );

    feedback.push(
      "AI systems prefer explanatory content that teaches concepts, not answer choices."
    );

    return feedback;
  }

  /* ---------- INFORMATIONAL / BLOG PAGES ---------- */
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
      `Add a concise definition immediately below “${sections[0].heading}” using 1–2 sentences.`
    );
  }

  missingDirectAnswers.slice(0, 3).forEach(h => {
    feedback.push(
      `Under the heading “${h}”, add a short direct answer (30–50 words) before going into details.`
    );
  });

  longParagraphs.slice(0, 2).forEach(h => {
    feedback.push(
      `Break the long paragraph under “${h}” into shorter, answer-focused blocks.`
    );
  });

  if (feedback.length === 0) {
    feedback.push(
      "Strong AEO structure. The content is clear, segmented, and easy for AI to extract."
    );
  }

  return feedback;
}

/************************************************
 * EXPOSE ANALYZER (SAFE FOR POPUP.JS)
 ************************************************/
window.runAEOAnalyzer = function () {
  try {
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

    const score = scoreAEO(sections, intent);
    const feedback = generateFeedback(sections, intent);

    return {
      score,
      intent,
      feedback,
      sections
    };
  } catch (e) {
    return {
      score: 0,
      intent: "error",
      feedback: [
        "Unable to analyze this page due to dynamic or restricted content."
      ],
      sections: []
    };
  }
};
