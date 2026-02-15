export function hasLists(sections) {
  let count = 0;
  sections.forEach(section => {
    section.blocks.forEach(block => {
      if (block.type === "ul" || block.type === "ol") {
        count++;
      }
    });
  });
  return count;
}
