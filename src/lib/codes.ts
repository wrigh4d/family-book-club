const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomClubCode(length = 6): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

export function normalizeClubCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/g, '')
}
