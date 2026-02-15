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

  root.querySelectorAll("h1,h2,h3,p,ul,ol,li").forEach(el => {
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
 * STRONG MCQ DETECTION (FIXED)
 ************************************************/
function isMCQPage(sections) {
  let questionLikeHeadings = 0;
  let mcqClusters = 0;

  sections.forEach(sec => {
    if (sec.heading.endsWith("?")) {
      questionLikeHeadings++;

      // Look for short, similar-length options nearby
      const optionCandidates = sec.blocks
        .filter(b => b.text.length > 1 && b.text.length < 80)
        .map(b => b.text);

      if (optionCandidates.length >= 3) {
        const similarLength = optionCandidates.every(
          t => Math.abs(t.length - optionCandidates[0].length) < 25
        );

        const optionStyle = optionCandidates.some(t =>
          /^[A-D]\)|^[A-D]\.|^\([A-D]\)/.test(t)
        );

        if (similarLength && optionStyle) {
          mcqClusters++;
        }
      }
    }
  });

  return questionLikeHeadings > 0 && mcqClusters > 0;
}

/************************************************
 * PAGE TYPE DETECTION
 ************************************************/
function detectPageType(sections) {
  if (isMCQPage(sections)) return "exam-mcq";

  const hasQuestions = sections.some(sec =>
    /what|why|how|when|who/i.test(sec.heading)
  );

  if (hasQuestions) return "question-informational";

  return "informational";
}

/************************************************
 * AEO SCORING (QUESTIONS ARE GOOD)
 ************************************************/
function scoreAEO(sections) {
  let score = 0;

  sections.forEach(sec => {
    if (/what|why|how|when|who/i.test(sec.heading)) {
      score += 12;
    }

    sec.blocks.forEach(block => {
      const words = block.text.split(/\s+/).length;

      if (/ is | refers to | means /i.test(block.text)) score += 10;
      if (block.type === "ul" || block.type === "ol") score += 6;
      if (words >= 25 && words <= 60) score += 6;
      if (words > 120) score -= 4;
    });
  });

  return Math.max(0, Math.min(score, 100));
}

/************************************************
 * PAGE-AWARE FEEDBACK
 ************************************************/
function generateFeedback(sections, pageType) {
  const feedback = [];

  // ❌ REAL MCQ PAGE ONLY
  if (pageType === "exam-mcq") {
    feedback.push(
      "This page contains multiple-choice questions with selectable options. AI answer engines do not use MCQ-style pages."
    );
    feedback.push(
      "To make it AEO-ready, add a clear explanation paragraph after each question explaining the correct answer."
    );
    return feedback;
  }

  // ✅ QUESTION / INFORMATIONAL
  let hasDefinition = false;
  let weakSections = [];

  sections.forEach(sec => {
    sec.blocks.forEach(block => {
      if (/ is | refers to | means /i.test(block.text)) hasDefinition = true;
    });

    if (
      /what|why|how/i.test(sec.heading) &&
      sec.blocks.length &&
      sec.blocks[0].text.split(/\s+/).length > 70
    ) {
      weakSections.push(sec.heading);
    }
  });

  if (!hasDefinition && sections[0]) {
    feedback.push(
      `Add a short definition directly under “${sections[0].heading}” in 1–2 sentences.`
    );
  }

  weakSections.slice(0, 3).forEach(h => {
    feedback.push(
      `For “${h}”, add a direct 30–40 word answer before expanding with details.`
    );
  });

  if (feedback.length === 0) {
    feedback.push(
      "This page is well-structured for AEO. The question-based format works well for AI answers."
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
