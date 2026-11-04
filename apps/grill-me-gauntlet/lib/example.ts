export const EXAMPLE_IDEA =
  "Let couples set aside money for irregular big expenses with a shared goal.";

export function isExampleIdea(idea: string) {
  return idea.trim().toLowerCase() === EXAMPLE_IDEA.toLowerCase();
}
