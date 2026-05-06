export function cn(...inputs: (string | undefined | null | false | 0)[]): string {
  return inputs
    .filter(Boolean)
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter(Boolean)
    .join(' ')
}
