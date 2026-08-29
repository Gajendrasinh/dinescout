/** Parses a short duration string ("15m", "30d", "1h") into whole seconds.
 *  Used for JWT expiry config, kept numeric so it doesn't fight the JWT
 *  library's string-literal-typed `expiresIn` option. */
export function parseDurationSeconds(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) return 900; // 15 minutes, a safe short default
  const value = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return value * multiplier;
}
