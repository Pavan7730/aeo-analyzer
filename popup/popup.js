document.getElementById("analyze").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["src/contentScript.js"]
  }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.runAEOAnalyzer(),
    }, (results) => {
      const data = results[0].result;
      document.getElementById("score").textContent = data.score;
      document.getElementById("results").textContent =
        `Analyzed ${data.sections.length} sections`;
    });
  });
});
