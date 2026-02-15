const scoreEl = document.getElementById("score");
const contentEl = document.getElementById("content");
const tabs = document.querySelectorAll(".tab");

let currentData = null;

/* ---------------- TAB HANDLING ---------------- */
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderTab(tab.dataset.tab);
  });
});

/* ---------------- ANALYZE BUTTON ---------------- */
document.getElementById("analyze").addEventListener("click", async () => {
  contentEl.innerHTML = "Analyzing page…";
  scoreEl.textContent = "--";
  scoreEl.className = "score";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    // Inject content script
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["src/contentScript.js"]
      },
      () => {
        // Execute analyzer
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: () => window.runAEOAnalyzer && window.runAEOAnalyzer()
          },
          (results) => {
            // SAFETY CHECK (THIS FIXES YOUR ERROR)
            if (
              !results ||
              !Array.isArray(results) ||
              !results[0] ||
              !results[0].result
            ) {
              renderResult({
                score: 0,
                intent: "unknown",
                feedback: [
                  "Unable to analyze this page.",
                  "The content may be dynamically loaded, restricted, or blocked."
                ]
              });
              return;
            }

            renderResult(results[0].result);
          }
        );
      }
    );
  } catch (err) {
    renderResult({
      score: 0,
      intent: "error",
      feedback: ["Unexpected error occurred while analyzing the page."]
    });
  }
});

/* ---------------- RENDER RESULT ---------------- */
function renderResult(data) {
  currentData = data;

  // Score display
  if (data.intent === "exam" || data.intent === "unknown") {
    scoreEl.textContent = "N/A";
    scoreEl.className = "score bad";
  } else {
    scoreEl.textContent = data.score;
    scoreEl.className =
      "score " +
      (data.score >= 75 ? "good" : data.score >= 50 ? "medium" : "bad");
  }

  renderTab("feedback");
}

/* ---------------- TAB CONTENT ---------------- */
function renderTab(tab) {
  if (!currentData) return;

  if (tab === "feedback") {
    contentEl.innerHTML = currentData.feedback
      .map(f => `<div class="feedback">${f}</div>`)
      .join("");
  }

  if (tab === "about") {
    contentEl.innerHTML = `
      <div class="feedback">
        <strong>What is AEO?</strong><br>
        Answer Engine Optimization (AEO) focuses on making content easy for AI systems to extract clear answers.
      </div>
      <div class="feedback">
        AI engines prefer definitions, direct answers, lists, and explanations.
      </div>
      <div class="feedback">
        Exam and MCQ pages are usually not suitable for AEO unless explanations are provided.
      </div>
    `;
  }
}
