export function getAnswerBlock(blocks) {
  let words = 0;
  let text = "";

  for (let i = 0; i < blocks.length && i < 2; i++) {
    if (blocks[i].type === "p") {
      const blockText = blocks[i].text;
      words += blockText.split(/\s+/).length;
      text += blockText + " ";
    }
  }

  if (words >= 20 && words <= 60) {
    return {
      valid: true,
      text: text.trim(),
      wordCount: words
    };
  }

  return { valid: false, wordCount: words };
}
