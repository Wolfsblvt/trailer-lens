/**
 * Native-regex capture validation for the advanced compact-rule escape hatch.
 *
 * These expressions deliberately run on the GitHub tab's main thread. The
 * options warning makes that residual performance risk explicit; this module
 * only makes the stored configuration and capture-group contract precise.
 */

export const CAPTURE_FLAGS = ['i', 'm', 's', 'u'] as const;

export interface CaptureConfiguration {
  readonly pattern: string;
  readonly flags: string;
}

export type CaptureValidation =
  | { readonly valid: true; readonly configuration: CaptureConfiguration; readonly expression: RegExp }
  | { readonly valid: false; readonly message: string };

/** Compile a supported pattern and require exactly one real JavaScript capture group. */
export function validateCaptureConfiguration(pattern: string, flags: string): CaptureValidation {
  if (![...flags].every((flag) => CAPTURE_FLAGS.includes(flag as (typeof CAPTURE_FLAGS)[number]))) {
    return { valid: false, message: `Use only these flags: ${CAPTURE_FLAGS.join(', ')}.` };
  }
  if (new Set(flags).size !== flags.length) return { valid: false, message: 'Use each regex flag at most once.' };

  let expression: RegExp;
  try {
    expression = new RegExp(pattern, flags);
  } catch {
    return { valid: false, message: 'Enter valid JavaScript regex syntax.' };
  }

  if (countCaptureGroups(pattern) !== 1) {
    return { valid: false, message: 'Capture projection requires exactly one capturing group.' };
  }
  return { valid: true, configuration: { pattern, flags: expression.flags }, expression };
}

/** Return the single capture, or null when the expression does not match it. */
export function captureValue(expression: RegExp, value: string): string | null {
  const match = expression.exec(value);
  return match?.[1] ?? null;
}

/**
 * Counts JavaScript capture groups after the platform parser has accepted the
 * expression. Escapes, character classes, non-capturing groups, lookarounds,
 * and lookbehinds are deliberately distinguished rather than parenthesis-counted.
 */
function countCaptureGroups(pattern: string): number {
  let captures = 0;
  let inCharacterClass = false;

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === '\\') {
      index++;
      continue;
    }
    if (character === '[') {
      inCharacterClass = true;
      continue;
    }
    if (character === ']' && inCharacterClass) {
      inCharacterClass = false;
      continue;
    }
    if (character !== '(' || inCharacterClass) continue;

    if (pattern[index + 1] !== '?') {
      captures++;
      continue;
    }

    // A named capture starts `(?<name>...)`; lookbehinds are `(?<=...)` and
    // `(?<!...)`. The RegExp constructor above has already rejected any other
    // malformed group syntax, so this is a narrow grammar walk, not a parser.
    if (pattern[index + 2] === '<' && pattern[index + 3] !== '=' && pattern[index + 3] !== '!') captures++;
  }

  return captures;
}
