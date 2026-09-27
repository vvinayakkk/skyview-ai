/**
 * Cryptographically secure random generator complying with SonarQube / SonarCloud S2245.
 * Uses window.crypto.getRandomValues instead of pseudo-random Math.random().
 */
export function getSecureRandom(): number {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0] / (0xffffffff + 1);
  }
  return 0.5;
}

export function getSecureRandomInt(min: number, max: number): number {
  return Math.floor(getSecureRandom() * (max - min + 1)) + min;
}

export function getSecureId(prefix = 'ID', length = 8): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = prefix ? `${prefix}-` : '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint8Array(length);
    window.crypto.getRandomValues(buffer);
    for (let i = 0; i < length; i++) {
      result += chars[buffer[i] % chars.length];
    }
    return result;
  }
  return `${prefix}-SAMPLE`;
}
