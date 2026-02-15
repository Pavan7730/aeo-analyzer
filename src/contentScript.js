/************************************************
 * MAIN CONTENT EXTRACTION
 ************************************************/
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
    ".sidebar"
  ].forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  return clone;
}

/************************************************
 * BUILD CONTENT MAP
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
 * PAGE TYPE DETECTION (FIXED LOGIC)
 ************************************************/
function detectPageType(sections) {
  let questionCount = 0;
  let optionCount = 0;

  sections.forEach(sec => {
    if (sec.heading.endsWith("?")) questionCount++;

    sec.blocks.forEach(block => {
      if (/^[A-D]\.|^\d+\./.test(block.text)) {
        optionCount++;
      }
    });
  });

  // ❌ ONLY MCQ EXAM PAGES
  if (questionCount > 0 && optionCount >= 2) {
    return "exam-mcq";
  }

  // ✅ Question-based informational pages
  if (questionCount > 0) {
    return "question-informational";
  }

  // ✅ Normal blog / guide
  return "informational";
}

/************************************************
 * AEO SCORING (QUESTION PAGES INCLUDED)
 ************************************************/
function scoreAEO(sections) {
  let score = 0;

  sections.forEach(sec => {
    // Question headings are GOOD for AEO
    if (/what|why|how|when|who/i.test(sec.heading)) {
      score += 12;
    }

    sec.blocks.forEach(block => {
      const words = block.text.split(" ").length;

      // Definition signals
      if (/ is | refers to | means /i.test(block.text)) score += 10;

      // Lists
      if (block.type === "ul" || block.type === "ol") score += 6;

      // Direct answer length
      if (words >= 25 && words <= 60) score += 6;

      // Penalize very long answers
      if (words > 120) score -= 4;
    });
  });

  return Math.max(0, Math.min(score, 100));
}

/************************************************
 * PAGE-AWARE FEEDBACK (WHAT / WHY LOGIC)
 ************************************************/
function generateFeedback(sections, pageType) {
  const feedback = [];

  // ❌ MCQ PAGES
  if (pageType === "exam-mcq") {
    feedback.push(
      "This page uses MCQ-style questions with answer options. AI answer engines do not use such pages."
    );
    feedback.push(
      "To make it AEO-ready, add a short explanation section explaining the correct answer in paragraph form."
    );
    return feedback;
  }

  // ✅ QUESTION-INFORMATIONAL & BLOG
  let hasDefinition = false;
  let weakQuestions = [];

  sections.forEach(sec => {
    sec.blocks.forEach(block => {
      if (/ is | refers to | means /i.test(block.text)) {
        hasDefinition = true;
      }
    });

    if (
      /what|why|how/i.test(sec.heading) &&
      sec.blocks.length > 0 &&
      sec.blocks[0].text.split(" ").length > 70
    ) {
      weakQuestions.push(sec.heading);
    }
  });

  if (!hasDefinition && sections[0]) {
    feedback.push(
      `Add a clear definition directly under “${sections[0].heading}” in 1–2 sentences.`
    );
  }

  weakQuestions.slice(0, 3).forEach(h => {
    feedback.push(
      `For “${h}”, add a short direct answer (30–40 words) before expanding the explanation.`
    );
  });

  if (feedback.length === 0) {
    feedback.push(
      "Strong AEO structure. The question-based format is well-suited for AI answers."
    );
  }

  return feedback;
}

/************************************************
 * EXPOSE ANALYZER
 ************************************************/
window.runAEOAnalyzer = function () {
  try {
    const root = extractMainContent();
    const sections = buildContentMap(root);
    const pageType = detectPageType(sections);

    if (pageType === "exam-mcq") {
      return {
        score: "N/A",
        intent: pageType,
        feedback: generateFeedback(sections, pageType),
        sections
      };
    }

    const score = scoreAEO(sections);
    const feedback = generateFeedback(sections, pageType);

    return {
      score,
      intent: pageType,
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
