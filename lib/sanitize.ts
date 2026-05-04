export function sanitize(input: string, maxLen = 200): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, maxLen);
}
