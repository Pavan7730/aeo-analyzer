import { extractMainContent } from "./extractor.js";
import { buildContentMap } from "./contentMap.js";
import { scoreAEO } from "./scorer.js";

export function runAEOAnalyzer() {
  const root = extractMainContent();
  const sections = buildContentMap(root);
  const score = scoreAEO(sections);

  return {
    score,
    sections
  };
}
