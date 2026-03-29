/**
 * Lightweight class concatenation helper used across the design system.
 */
export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
