import { isQuestion } from "./detectors/questions.js";
import { getAnswerBlock } from "./detectors/answers.js";
import { findDefinition } from "./detectors/definitions.js";
import { hasLists } from "./detectors/lists.js";
import { isQuotable } from "./detectors/quotability.js";

export function scoreAEO(sections) {
  let score = 0;

  // Question + Answer
  sections.forEach(section => {
    if (isQuestion(section.heading)) {
      const answer = getAnswerBlock(section.blocks);
      if (answer.valid) score += 15;
    }
  });

  // Definition
  if (findDefinition(sections)) score += 15;

  // Lists
  const listCount = hasLists(sections);
  if (listCount > 0) score += 10;

  // Quotability
  sections.forEach(section => {
    section.blocks.forEach(block => {
      if (block.type === "p" && isQuotable(block.text)) {
        score += 2;
      }
    });
  });

  return Math.min(score, 100);
}
