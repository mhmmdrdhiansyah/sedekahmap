// ============================================================
// GENERATE DISTRIBUTION CODE UTILITY
// ============================================================

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE_LENGTH = 6;
const PREFIX = 'SDK';

/**
 * generateDistributionCode - Generate kode distribusi unik format SDK-XXXXXX
 * @returns Kode distribusi 10 karakter (SDK + 6 digit alphanumeric)
 */
export function generateDistributionCode(): string {
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return `${PREFIX}-${result}`;
}
