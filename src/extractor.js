export function extractMainContent() {
  const clone = document.body.cloneNode(true);

  const removeSelectors = [
    "nav", "footer", "aside",
    ".sidebar", ".menu", ".comments",
    ".ads", ".related", "script", "style"
  ];

  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  return clone;
}
