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
 * BUILD CONTENT MAP (STRUCTURE FIRST)
 * We care about H2/H3 + FIRST answer block
 ************************************************/
function buildContentMap(root) {
  const sections = [];
  let current = null;

  root.querySelectorAll("h1,h2,h3,p,ul,ol,li").forEach(el => {
    if (/H[2-3]/.test(el.tagName)) {
      current = {
        heading: el.innerText.trim(),
        blocks: []
      };
      sections.push(current);
    } else if (current && el.innerText.trim()) {
      current.blocks.push({
        type: el.tagName.toLowerCase(),
        text: el.innerText.trim()
      });
    }
  });

  return sections;
}

/************************************************
 * STRONG MCQ DETECTION (NO FALSE POSITIVES)
 ************************************************/
function isMCQPage(sections) {
  let mcqHits = 0;

  sections.forEach(sec => {
    if (!sec.heading.endsWith("?")) return;

    const options = sec.blocks.filter(b =>
      /^[A-D]\)|^[A-D]\.|^\([A-D]\)/.test(b.text)
    );

    // MCQ only if 3+ option-like short lines exist
    if (options.length >= 3) {
      const similarLength = options.every(
        o => Math.abs(o.text.length - options[0].text.length) < 25
      );
      if (similarLength) mcqHits++;
    }
  });

  return mcqHits > 0;
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
 * REAL AEO SCORING (NO 100 INFLATION)
 * - Score ONLY best answer blocks
 * - Ignore volume
 ************************************************/
function scoreAEO(sections) {
  const sectionScores = [];

  sections.forEach(sec => {
    let score = 0;

    // 1️⃣ Question intent (max 20)
    if (/what|why|how|when|who/i.test(sec.heading)) {
      score += 20;
    }

    // 2️⃣ First answer block (max 40)
    const firstBlock = sec.blocks[0];
    if (!firstBlock) return;

    const words = firstBlock.text.split(/\s+/).length;
    if (words >= 25 && words <= 60) score += 40;
    else if (words >= 15 && words < 25) score += 25;
    else if (words > 60 && words <= 90) score += 25;

    // 3️⃣ Definition clarity (max 15)
    if (/ is | refers to | means /i.test(firstBlock.text)) {
      score += 15;
    }

    // 4️⃣ Structural reinforcement (max 15)
    const hasListNearAnswer = sec.blocks.some(
      b => b.type === "ul" || b.type === "ol"
    );
    if (hasListNearAnswer) score += 15;

    // 5️⃣ Soft cap per section (80, not 60)
    sectionScores.push(Math.min(score, 80));
  });

  if (sectionScores.length === 0) return 0;

  // AI usually uses best 1–2 answers
  const best = sectionScores
    .sort((a, b) => b - a)
    .slice(0, 2);

  const finalScore =
    best.reduce((a, b) => a + b, 0) / best.length;

  return Math.round(finalScore);
}

/************************************************
 * PAGE-AWARE FEEDBACK (NON-GENERIC)
 ************************************************/
function generateFeedback(sections, pageType) {
  const feedback = [];

  // ❌ REAL MCQ PAGES
  if (pageType === "exam-mcq") {
    feedback.push(
      "This page contains MCQ-style questions with answer options. AI answer engines do not extract answers from such pages."
    );
    feedback.push(
      "To make it AEO-ready, add a short explanation paragraph explaining the correct answer after each question."
    );
    return feedback;
  }

  // ✅ QUESTION / INFORMATIONAL PAGES
  let hasDefinition = false;
  let weakAnswers = [];

  sections.forEach(sec => {
    sec.blocks.forEach(block => {
      if (/ is | refers to | means /i.test(block.text)) {
        hasDefinition = true;
      }
    });

    if (
      /what|why|how/i.test(sec.heading) &&
      sec.blocks[0] &&
      sec.blocks[0].text.split(/\s+/).length > 70
    ) {
      weakAnswers.push(sec.heading);
    }
  });

  if (!hasDefinition && sections[0]) {
    feedback.push(
      `Add a short definition directly under “${sections[0].heading}” in 1–2 sentences.`
    );
  }

  weakAnswers.slice(0, 3).forEach(h => {
    feedback.push(
      `For “${h}”, add a direct 30–40 word answer before expanding the explanation.`
    );
  });

  if (feedback.length === 0) {
    feedback.push(
      "This page is well-structured for AEO. Clear question-answer sections make it easy for AI to extract answers."
    );
  }

  return feedback;
}

/************************************************
 * EXPOSE ANALYZER (SAFE)
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
