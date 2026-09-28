/**
 * Free-response answer normalization and comparison.
 *
 * Baseline implementation of the contract in the lesson/exercise spec §3.2.
 * Order matters: syntax normalization first, then numeric comparison when both
 * sides parse, then a canonical string compare. MAX-4 may widen this; it must
 * not reorder it, because the client normalizer has the same order and a
 * disagreement between the two is a user-visible grading bug.
 */
import { acceptedForms, type Exercise } from '@mta/content';

const SPACING_MACROS = /\\[!,;:]|\\quad|\\qquad|\\thinspace|\\medspace|\\thickspace/g;
const DELIMITERS = /\$\$?/g;

/** Step 1: strip syntax that cannot change the value of the answer. */
export function normalizeAnswer(raw: string, angleUnit: 'deg' | 'rad' = 'deg'): string {
  let s = raw.trim();
  s = s.replace(DELIMITERS, '');
  s = s.replace(SPACING_MACROS, '');
  s = s.replace(/\\[,;:!]/g, '');
  s = s.replace(/\u00a0/g, '');
  s = s.replace(/(\d{1,3}(?:,\d{3})+)/g, (_m, digits: string) => digits.replace(/,/g, ''));
  s = s.replace(/^\+/, '');
  s = s.replace(/\.$/, '');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\displaystyle|\\textstyle/g, '');
  s = s.replace(/\\dfrac|\\tfrac/g, '\\frac');
  s = s.replace(/\\cdot|\\times/g, '*');
  s = s.replace(/\\div/g, '/');
  s = s.replace(/\s+/g, '');
  if (angleUnit === 'deg') {
    s = s.replace(/\^?\{?\\circ\}?$/, '');
    s = s.replace(/^(-?[\d.]+)\\degree$/, '$1');
  }
  s = s.replace(/\\,/g, '');
  return s;
}

const FUNCS: Record<string, (...args: number[]) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  sqrt: (x) => Math.sqrt(x),
  abs: Math.abs,
  ln: Math.log,
  log: (x) => Math.log10(x),
  exp: Math.exp,
};

const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

/**
 * Step 2: evaluate a normalized answer to a number, or `undefined` when it is
 * not a closed numeric expression (symbols, roots with no numeric form, etc.).
 *
 * Deliberately a small grammar: numbers, `+ - * / ^`, unary minus, parentheses,
 * `frac{a}{b}`, `sqrt{a}`, `|a|`, and a fixed function/constant table.
 */
export function evaluateNumeric(input: string): number | undefined {
  let pos = 0;
  const src = input;

  const skip = (): void => {
    while (pos < src.length && /\s/.test(src[pos] as string)) pos += 1;
  };

  const parseNumber = (): number | undefined => {
    skip();
    const match = /^\d*\.?\d+(?:[eE][-+]?\d+)?/.exec(src.slice(pos));
    if (match === null) return undefined;
    pos += match[0].length;
    return Number(match[0]);
  };

  const parseExpression = (): number | undefined => {
    let left = parseTerm();
    if (left === undefined) return undefined;
    for (;;) {
      skip();
      const op = src[pos];
      if (op !== '+' && op !== '-') return left;
      pos += 1;
      const right = parseTerm();
      if (right === undefined) return undefined;
      left = op === '+' ? left + right : left - right;
    }
  };

  const parseTerm = (): number | undefined => {
    let left = parsePower();
    if (left === undefined) return undefined;
    for (;;) {
      skip();
      const op = src[pos];
      if (op === '*' || op === '/') {
        pos += 1;
        const right = parsePower();
        if (right === undefined) return undefined;
        if (op === '/') {
          if (right === 0) return undefined;
          left = left / right;
        } else {
          left = left * right;
        }
        continue;
      }
      // LaTeX writes multiplication implicitly: `2\pi`, `2(3)`, `3\cdot` is explicit,
      // but `2x`, `2\pi` and `12(3)` are not. Treat an adjacent atom as a factor.
      if (!startsAtom(pos)) return left;
      const right = parsePower();
      if (right === undefined) return undefined;
      left = left * right;
    }
  };

  const startsAtom = (at: number): boolean => {
    if (at >= src.length) return false;
    const ch = src[at] as string;
    if (ch === '(' || ch === '{' || ch === '|') return true;
    if (/[\d.]/.test(ch)) return true;
    return ch === '\\' && at + 1 < src.length && /[a-zA-Z]/.test(src[at + 1] as string);
  };

  const parsePower = (): number | undefined => {
    const base = parseUnary();
    if (base === undefined) return undefined;
    skip();
    if (src[pos] !== '^') return base;
    pos += 1;
    const exponent = parseUnary();
    if (exponent === undefined) return undefined;
    const value = base ** exponent;
    return Number.isFinite(value) ? value : undefined;
  };

  const parseUnary = (): number | undefined => {
    skip();
    if (src[pos] === '-') {
      pos += 1;
      const value = parseUnary();
      return value === undefined ? undefined : -value;
    }
    if (src[pos] === '+') {
      pos += 1;
      return parseUnary();
    }
    return parseAtom();
  };

  const parseGroup = (): number | undefined => {
    skip();
    const open = src[pos];
    if (open === '(') {
      pos += 1;
      const value = parseExpression();
      skip();
      if (src[pos] !== ')') return undefined;
      pos += 1;
      return value;
    }
    // A bare `{}` group is legal LaTeX: `2^{10}` and `\frac12`-adjacent forms
    // depend on it being parsed as a single unit.
    if (open === '{') {
      pos += 1;
      const value = parseExpression();
      skip();
      if (src[pos] !== '}') return undefined;
      pos += 1;
      return value;
    }
    return parseAtom();
  };

  const parseBraced = (): number | undefined => {
    skip();
    if (src[pos] !== '{') return undefined;
    pos += 1;
    const value = parseExpression();
    skip();
    if (src[pos] !== '}') return undefined;
    pos += 1;
    return value;
  };

  const parseArgs = (): number[] | undefined => {
    const args: number[] = [];
    for (;;) {
      const braced = parseBraced();
      if (braced !== undefined) {
        args.push(braced);
      } else {
        const grouped = parseGroup();
        if (grouped === undefined) return undefined;
        args.push(grouped);
      }
      skip();
      if (src[pos] !== ',') return args;
      pos += 1;
    }
  };

  /**
   * One LaTeX argument: a brace group, a paren group, or a bare single digit.
   * LaTeX allows `\frac12` as shorthand for `\frac{1}{2}`, so a two-argument
   * command cannot read a whole number where it expects one argument.
   */
  const parseArg = (): number | undefined => {
    skip();
    const ch = src[pos];
    if (ch === '{') return parseBraced();
    if (ch === '(') return parseGroup();
    if (ch !== undefined && /[0-9]/.test(ch)) {
      pos += 1;
      return Number(ch);
    }
    return undefined;
  };

  const parseAtom = (): number | undefined => {
    skip();
    if (pos >= src.length) return undefined;
    if (src[pos] === '(' || src[pos] === '{') return parseGroup();
    const literal = parseNumber();
    if (literal !== undefined) return literal;

    const named = /^\\([a-zA-Z]+)/.exec(src.slice(pos));
    if (named !== null) {
      const name = named[1] as string;
      pos += named[0].length;
      if (name === 'frac') {
        const numer = parseArg();
        const denom = parseArg();
        if (numer === undefined || denom === undefined || denom === 0) return undefined;
        return numer / denom;
      }
      if (name === 'pi' || name === 'e') return CONSTS[name] as number;
      const fn = FUNCS[name];
      if (fn !== undefined) {
        const args = parseArgs();
        if (args === undefined || args.length !== 1) return undefined;
        const value = fn(args[0] as number);
        return Number.isFinite(value) ? value : undefined;
      }
      return undefined;
    }

    if (src[pos] === '|') {
      pos += 1;
      const value = parseExpression();
      skip();
      if (src[pos] !== '|') return undefined;
      pos += 1;
      return value === undefined ? undefined : Math.abs(value);
    }
    return undefined;
  };

  const result = parseExpression();
  skip();
  if (result === undefined || pos !== src.length || !Number.isFinite(result)) return undefined;
  return result;
}

const RELATIVE_TOLERANCE = 1e-9;

function closeEnough(a: number, b: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= RELATIVE_TOLERANCE * scale;
}

export type GradeOutcome = {
  correct: boolean;
  /** The canonical form the grader accepted, for "did you mean" messaging. */
  expectedForm?: string;
  /** True when the comparison fell back to string equality, not numeric. */
  stringCompare: boolean;
};

export function gradeResponse(response: string, exercise: Pick<Exercise, 'answerLatex' | 'answerAlternatives' | 'angleUnit'>): GradeOutcome {
  const candidate = normalizeAnswer(response, exercise.angleUnit);
  if (candidate.length === 0) {
    return { correct: false, stringCompare: false };
  }
  const candidateValue = evaluateNumeric(candidate);

  for (const form of acceptedForms(exercise)) {
    const expected = normalizeAnswer(form, exercise.angleUnit);
    if (candidate === expected) {
      return { correct: true, expectedForm: form, stringCompare: true };
    }
    if (candidateValue !== undefined) {
      const expectedValue = evaluateNumeric(expected);
      if (expectedValue !== undefined && closeEnough(candidateValue, expectedValue)) {
        return { correct: true, expectedForm: form, stringCompare: false };
      }
    }
  }
  return { correct: false, stringCompare: candidateValue === undefined };
}
