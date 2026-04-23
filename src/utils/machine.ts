export function formatMachineName(name: string): string {
  if (!name) return 'Unknown Machine';
  // Replace "M" followed by a number with "Machine" followed by that number
  // e.g., "M1 - F1" -> "Machine1 - F1"
  return name.replace(/^M(\d+)/, 'Machine$1');
}
