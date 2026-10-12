/**
 * Formats a duration or remaining hours to at most 2 decimal places,
 * stripping redundant trailing zeros (e.g. 5 -> "5", 5.5 -> "5.5", 5.25 -> "5.25", 5.166666 -> "5.17").
 */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return Number(rounded.toFixed(2)).toString();
}

/**
 * Formats hours to quarter fractions ('¼', '½', '¾') without decimals.
 * e.g. 24.5 -> "24½", 24.25 -> "24¼", 24.75 -> "24¾", 24.0 -> "24", 0 -> "0".
 */
export function formatQuarterHours(hours: number): string {
  const clamped = Math.max(0, hours);
  const rounded = Math.round(clamped * 4) / 4;
  const whole = Math.floor(rounded);
  const remainder = rounded - whole;
  let fracStr = '';
  if (Math.abs(remainder - 0.25) < 0.001) fracStr = '¼';
  else if (Math.abs(remainder - 0.5) < 0.001) fracStr = '½';
  else if (Math.abs(remainder - 0.75) < 0.001) fracStr = '¾';

  if (whole === 0 && fracStr) return fracStr;
  return `${whole}${fracStr}`;
}
