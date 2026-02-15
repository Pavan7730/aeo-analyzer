const QUESTION_REGEX = /^(what|how|why|when|who|which|can|does|is)\b/i;

export function isQuestion(text) {
  return text.includes("?") || QUESTION_REGEX.test(text);
}
