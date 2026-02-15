export function buildContentMap(root) {
  const sections = [];
  let currentSection = null;

  root.querySelectorAll("h1, h2, h3, p, ul, ol").forEach(el => {
    if (el.tagName.startsWith("H")) {
      currentSection = {
        heading: el.innerText.trim(),
        level: Number(el.tagName[1]),
        blocks: []
      };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.blocks.push({
        type: el.tagName.toLowerCase(),
        text: el.innerText.trim()
      });
    }
  });

  return sections;
}
