import { describe, expect, it } from 'vitest';

import { evaluateNumeric, gradeResponse, normalizeAnswer } from './engine.js';

describe('normalizeAnswer — the §3.2 order, step by step', () => {
  it('strips $ delimiters and spacing macros', () => {
    expect(normalizeAnswer('$\\frac{1}{2}$')).toBe('\\frac{1}{2}');
    expect(normalizeAnswer('  3\\! \\, ')).toBe('3');
  });

  it('drops a leading + and a trailing period', () => {
    expect(normalizeAnswer('+4')).toBe('4');
    expect(normalizeAnswer('4.')).toBe('4');
  });

  it('drops \\left and \\right', () => {
    expect(normalizeAnswer('\\left(\\frac{1}{2}\\right)')).toBe('(\\frac{1}{2})');
  });

  it('unifies dfrac and tfrac to frac', () => {
    expect(normalizeAnswer('\\dfrac{1}{2}')).toBe('\\frac{1}{2}');
    expect(normalizeAnswer('\\tfrac{1}{2}')).toBe('\\frac{1}{2}');
  });

  it('strips thousands separators and stray commas', () => {
    expect(normalizeAnswer('1,024')).toBe('1024');
  });

  it('strips a trailing degree mark only when the exercise declares degrees', () => {
    expect(normalizeAnswer('50^\\circ', 'deg')).toBe('50');
    expect(normalizeAnswer('50^\\circ', 'rad')).toBe('50^\\circ');
  });
});

describe('evaluateNumeric', () => {
  it('parses the common AIME answer shapes', () => {
    expect(evaluateNumeric('42')).toBe(42);
    expect(evaluateNumeric('\\frac{1}{2}')).toBe(0.5);
    expect(evaluateNumeric('2^{10}')).toBe(1024);
    expect(evaluateNumeric('2^10')).toBe(1024);
    expect(evaluateNumeric('\\frac{-1}{5}')).toBeCloseTo(-0.2, 12);
    expect(evaluateNumeric('(1+2)(3+4)')).toBe(21);
    expect(evaluateNumeric('-3+5')).toBe(2);
  });

  it('parses trig, roots and constants', () => {
    expect(evaluateNumeric('\\sqrt{16}')).toBe(4);
    expect(evaluateNumeric('2\\pi')).toBeCloseTo(2 * Math.PI, 12);
    expect(evaluateNumeric('\\frac{\\pi}{2}')).toBeCloseTo(Math.PI / 2, 12);
  });

  it('refuses to guess on non-numeric input', () => {
    expect(evaluateNumeric('x + 1')).toBeUndefined();
    expect(evaluateNumeric('\\frac{1}{0}')).toBeUndefined();
    expect(evaluateNumeric('42)')).toBeUndefined();
    expect(evaluateNumeric('')).toBeUndefined();
  });
});

describe('gradeResponse', () => {
  const freeResponse = {
    answerLatex: '\\frac{1}{2}',
    answerAlternatives: ['0.5', '\\tfrac{1}{2}'],
    angleUnit: 'deg' as const,
  };

  it('accepts equivalent numeric forms within relative tolerance', () => {
    for (const response of ['0.5', '\\frac12', '\\frac{2}{4}', ' $0.500000 $ ']) {
      expect(gradeResponse(response, freeResponse).correct).toBe(true);
    }
  });

  it('rejects a wrong answer', () => {
    expect(gradeResponse('\\frac{1}{3}', freeResponse).correct).toBe(false);
  });

  it('never accepts an empty response', () => {
    expect(gradeResponse('   ', freeResponse).correct).toBe(false);
  });

  it('falls back to string compare for symbolic answers', () => {
    const symbolic = { answerLatex: '\\sqrt{3}', answerAlternatives: [], angleUnit: 'deg' as const };
    expect(gradeResponse('\\sqrt{3}', symbolic)).toMatchObject({
      correct: true,
      stringCompare: true,
    });
    expect(gradeResponse('\\sqrt{5}', symbolic).correct).toBe(false);
  });

  it('reports the accepted form only on a correct answer', () => {
    expect(gradeResponse('0.5', freeResponse).expectedForm).toBe('\\frac{1}{2}');
    expect(gradeResponse('9', freeResponse).expectedForm).toBeUndefined();
  });

  it('resolves multiple choice from the A-E label against the bare choice', () => {
    // MC self-grading compares the choice LaTeX, which the client sends verbatim.
    const mc = {
      answerLatex: 'x < -2',
      answerAlternatives: [],
      angleUnit: 'deg' as const,
    };
    expect(gradeResponse('x < -2', mc).correct).toBe(true);
    expect(gradeResponse('x > -2', mc).correct).toBe(false);
  });
});
