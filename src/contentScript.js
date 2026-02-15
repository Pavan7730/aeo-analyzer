/************************************************
 * 1. MAIN CONTENT EXTRACTION
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
 * 2. BUILD CONTENT MAP (H2/H3 + BLOCKS)
 ************************************************/
function buildContentMap(root) {
  const sections = [];
  let current = null;

  root.querySelectorAll("h2,h3,p,ul,ol,li").forEach(el => {
    const text = el.innerText.trim();
    if (!text) return;

    if (/H[2-3]/.test(el.tagName)) {
      current = {
        heading: text,
        blocks: []
      };
      sections.push(current);
    } else if (current) {
      current.blocks.push({
        type: el.tagName.toLowerCase(),
        text
      });
    }
  });

  return sections;
}

/************************************************
 * 3. MCQ PAGE DETECTION (STRICT)
 ************************************************/
function isMCQPage(sections) {
  let mcqHits = 0;

  sections.forEach(sec => {
    if (!sec.heading.endsWith("?")) return;

    const options = sec.blocks.filter(b =>
      /^[A-D]\)|^[A-D]\.|^\([A-D]\)/.test(b.text)
    );

    if (options.length >= 3) {
      const similar = options.every(
        o => Math.abs(o.text.length - options[0].text.length) < 25
      );
      if (similar) mcqHits++;
    }
  });

  return mcqHits > 0;
}

/************************************************
 * 4. PAGE TYPE DETECTION
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
 * 5. REAL AEO SCORING (NO 100 / NO FLAT 60)
 ************************************************/
function scoreAEO(sections) {
  const scores = [];

  sections.forEach(sec => {
    let s = 0;

    // Question intent
    if (/what|why|how|when|who/i.test(sec.heading)) s += 20;

    const first = sec.blocks[0];
    if (!first) return;

    const words = first.text.split(/\s+/).length;

    // Answer length quality
    if (words >= 25 && words <= 60) s += 35;
    else if (words >= 15 && words < 25) s += 20;
    else if (words > 60 && words <= 90) s += 20;

    // Definition clarity
    if (/ is | refers to | means /i.test(first.text)) s += 15;

    // Supporting structure
    const hasList = sec.blocks.some(
      b => b.type === "ul" || b.type === "ol"
    );
    if (hasList) s += 10;

    scores.push(Math.min(s, 80));
  });

  if (!scores.length) return 0;

  const best = scores.sort((a, b) => b - a).slice(0, 2);
  return Math.round(best.reduce((a, b) => a + b, 0) / best.length);
}

/************************************************
 * 6. SCORE-AWARE FEEDBACK (NOT GENERIC)
 ************************************************/
function generateFeedback(sections, pageType, score) {
  const feedback = [];

  // MCQ pages
  if (pageType === "exam-mcq") {
    feedback.push(
      "This page uses MCQ-style questions with answer options. AI answer engines do not extract answers from such formats."
    );
    feedback.push(
      "Add a short explanation paragraph after each question explaining why the correct answer is right."
    );
    return feedback;
  }

  let hasDefinition = false;
  let longAnswers = [];

  sections.forEach(sec => {
    const first = sec.blocks[0];
    if (!first) return;

    if (/ is | refers to | means /i.test(first.text)) {
      hasDefinition = true;
    }

    if (
      /what|why|how/i.test(sec.heading) &&
      first.text.split(/\s+/).length > 70
    ) {
      longAnswers.push(sec.heading);
    }
  });

  // Missing definition
  if (!hasDefinition && sections[0]) {
    feedback.push(
      `Add a concise definition (30–40 words) immediately under “${sections[0].heading}”.`
    );
  }

  // Weak answers
  longAnswers.slice(0, 2).forEach(h => {
    feedback.push(
      `For “${h}”, shorten the first paragraph to a direct 30–40 word answer before detailed explanation.`
    );
  });

  // Score-based coaching
  if (feedback.length === 0) {
    if (score < 60) {
      feedback.push(
        "The page contains answers, but they are not concise enough for AI extraction. Tighten the first paragraph under key headings."
      );
    } else if (score < 70) {
      feedback.push(
        "Improve AEO score by adding sharper, more direct answers immediately after question-based headings."
      );
      feedback.push(
        "Add a short bullet list summarizing answers to improve AI scannability."
      );
    } else if (score < 85) {
      feedback.push(
        "This page is close to being AEO-optimized. Minor refinements like summary bullets can increase visibility."
      );
    } else {
      feedback.push(
        "Excellent AEO structure. This content is highly suitable for AI answer extraction."
      );
    }
  }

  return feedback;
}

/************************************************
 * 7. EXPOSE ANALYZER
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
        feedback: generateFeedback(sections, pageType, 0),
        sections
      };
    }

    const score = scoreAEO(sections);
    const feedback = generateFeedback(sections, pageType, score);

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
