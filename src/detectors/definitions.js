const DEF_REGEX = /\b(is|refers to|means)\b/i;

export function findDefinition(sections) {
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === "p" && DEF_REGEX.test(block.text)) {
        const wc = block.text.split(/\s+/).length;
        if (wc <= 25) {
          return block.text;
        }
      }
    }
  }
  return null;
}
