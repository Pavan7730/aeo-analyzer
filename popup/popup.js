const scoreEl = document.getElementById("score");
const contentEl = document.getElementById("content");
const tabs = document.querySelectorAll(".tab");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderTab(tab.dataset.tab);
  });
});

document.getElementById("analyze").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    { target: { tabId: tab.id }, files: ["src/contentScript.js"] },
    () => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => window.runAEOAnalyzer()
        },
        results => renderResult(results[0].result)
      );
    }
  );
});

let currentData = null;

function renderResult(data) {
  currentData = data;

  if (data.intent === "test") {
    scoreEl.textContent = "N/A";
    scoreEl.className = "score bad";
    contentEl.innerHTML =
      "<div class='feedback'>This is a test/MCQ page. AEO applies to explanatory content.</div>";
    return;
  }

  scoreEl.textContent = data.score;

  scoreEl.className = "score " +
    (data.score >= 75 ? "good" : data.score >= 50 ? "medium" : "bad");

  renderTab("feedback");
}

function renderTab(tab) {
  if (!currentData) return;

  if (tab === "feedback") {
    contentEl.innerHTML = currentData.feedback
      .map(item => `<div class="feedback">${item}</div>`)
      .join("");
  }

  if (tab === "about") {
    contentEl.innerHTML = `
      <div class="feedback">
        <strong>What is AEO?</strong><br>
        Answer Engine Optimization helps your content get used as AI answers.
      </div>
      <div class="feedback">
        AI systems prefer direct answers, clear definitions, lists, and FAQs.
      </div>
      <div class="feedback">
        This tool measures how easy it is for AI to extract answers from your page.
      </div>
    `;
  }
}
