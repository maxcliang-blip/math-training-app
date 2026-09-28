import { describe, expect, it } from 'vitest';

import {
  ExerciseSchema,
  LESSON_SECTION_IDS,
  LessonSchema,
  ModuleSchema,
  TIERS,
  acceptedForms,
  choiceLabel,
  isMultipleChoice,
} from '../index.js';
import { loadContent, resolveContentRoot } from '../node.js';

const validExercise = {
  id: 'm1-linear-equations-01',
  moduleId: 'M1',
  lessonId: 'm1-linear-equations',
  tier: '12',
  difficulty: 2,
  promptLatex: 'If $2x+3=11$, what is $x$?',
  choices: ['3', '4', '5', '6', '7'],
  answerLatex: '4',
  answerAlternatives: [],
  solutionLatex: '$$2x+3=11 \\implies 2x=8 \\implies x=4$$',
  hintLatex: ['What do you get if you subtract 3 from both sides?', 'Now divide both sides by 2.'],
  asymptoteSource: null,
  asymptoteAspectRatio: 1.333,
  angleUnit: 'deg',
  tags: ['algebra'],
  estimatedMinutes: 2,
};

const validLesson = {
  id: 'm1-linear-equations',
  moduleId: 'M1',
  title: 'Linear Equations and Inequalities',
  order: 1,
  tiers: ['10', '12'],
  estimatedMinutes: 35,
  sections: {
    objective: 'Solve a linear equation in one unknown.',
    prerequisites: [],
    concept: 'An equation is a balance; every step must apply to both sides.',
    examples: [
      { title: 'a', latex: '$$x=1$$' },
      { title: 'b', latex: '$$x=2$$' },
      { title: 'c', latex: '$$x=3$$' },
    ],
    techniques: [{ slug: 'balance-model', name: 'Balance model', summary: 'Keep both sides equal.' }],
    pitfalls: [
      { title: 'Sign', wrongLatex: '-4', why: 'Dropped the sign.', fix: 'Keep the sign when dividing.' },
      { title: 'Order', wrongLatex: '8', why: 'Forgot to divide.', fix: 'Divide by 2 last.' },
    ],
    practiceIds: [
      'm1-linear-equations-01',
      'm1-linear-equations-02',
      'm1-linear-equations-03',
      'm1-linear-equations-04',
      'm1-linear-equations-05',
      'm1-linear-equations-06',
      'm1-linear-equations-07',
      'm1-linear-equations-08',
    ],
    masteryIds: [
      'm1-linear-equations-m1',
      'm1-linear-equations-m2',
      'm1-linear-equations-m3',
    ],
  },
};

describe('ExerciseSchema — the frozen contract', () => {
  it('accepts a well-formed multiple-choice exercise and applies defaults', () => {
    const parsed = ExerciseSchema.parse(validExercise);
    expect(parsed.asymptoteAspectRatio).toBe(1.333);
    expect(parsed.angleUnit).toBe('deg');
    expect(isMultipleChoice(parsed)).toBe(true);
  });

  it('accepts free response with choices: null', () => {
    const parsed = ExerciseSchema.parse({ ...validExercise, tier: 'A', choices: null });
    expect(parsed.choices).toBeNull();
    expect(isMultipleChoice(parsed)).toBe(false);
  });

  it('rejects multiple choice with other than 5 choices', () => {
    expect(() =>
      ExerciseSchema.parse({ ...validExercise, choices: ['1', '2', '3'] }),
    ).toThrow();
  });

  it('rejects $-wrapped choices (bare inline fragments only)', () => {
    expect(() =>
      ExerciseSchema.parse({
        ...validExercise,
        choices: ['$1$', '$2$', '$3$', '$4$', '$5$'],
      }),
    ).toThrow(/bare LaTeX fragment/);
  });

  it('rejects choices on an AIME exercise', () => {
    expect(() => ExerciseSchema.parse({ ...validExercise, tier: 'A' })).toThrow(
      /AIME exercises are free-response/,
    );
  });

  it('rejects an answer wrapped in \\boxed', () => {
    expect(() =>
      ExerciseSchema.parse({ ...validExercise, answerLatex: '\\boxed{4}' }),
    ).toThrow(/boxed/);
  });

  it('rejects an answer with a leading + or a trailing period', () => {
    expect(() => ExerciseSchema.parse({ ...validExercise, answerLatex: '+4' })).toThrow();
    expect(() => ExerciseSchema.parse({ ...validExercise, answerLatex: '4.' })).toThrow();
  });

  it('requires 2-3 hint rungs', () => {
    expect(() => ExerciseSchema.parse({ ...validExercise, hintLatex: ['only one'] })).toThrow();
    expect(() =>
      ExerciseSchema.parse({ ...validExercise, hintLatex: ['a', 'b', 'c', 'd'] }),
    ).toThrow();
  });

  it('requires asymptoteAlt whenever asymptoteSource is present', () => {
    expect(() =>
      ExerciseSchema.parse({
        ...validExercise,
        asymptoteSource: 'unitsize(1cm); draw((0,0)--(1,0));',
      }),
    ).toThrow(/asymptoteAlt/);
    const ok = ExerciseSchema.parse({
      ...validExercise,
      asymptoteSource: 'unitsize(1cm); draw((0,0)--(1,0));',
      asymptoteAlt: 'A unit segment from the origin along the x-axis.',
    });
    expect(ok.asymptoteAlt).toContain('unit segment');
  });

  it('constrains tier, difficulty, moduleId and tags to closed sets', () => {
    for (const tier of TIERS) {
      expect(
        ExerciseSchema.safeParse({
          ...validExercise,
          tier,
          choices: tier === 'A' ? null : validExercise.choices,
        }).success,
      ).toBe(true);
    }
    expect(() => ExerciseSchema.parse({ ...validExercise, tier: 'AIME1' })).toThrow();
    expect(() => ExerciseSchema.parse({ ...validExercise, difficulty: 6 })).toThrow();
    expect(() => ExerciseSchema.parse({ ...validExercise, difficulty: 2.5 })).toThrow();
    expect(() => ExerciseSchema.parse({ ...validExercise, moduleId: 'M10' })).toThrow();
    expect(() => ExerciseSchema.parse({ ...validExercise, tags: ['not-a-real-tag'] })).toThrow();
  });

  it('labels AMC choices A-E, not 1-5', () => {
    expect([0, 1, 2, 3, 4].map(choiceLabel)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(() => choiceLabel(5)).toThrow(RangeError);
  });

  it('exposes the canonical answer first in acceptedForms', () => {
    const parsed = ExerciseSchema.parse({
      ...validExercise,
      answerLatex: '\\frac{\\sqrt{3}}{2}',
      answerAlternatives: ['\\frac{1}{2}\\sqrt{3}', '\\sin(\\pi/3)'],
    });
    expect(acceptedForms(parsed)[0]).toBe('\\frac{\\sqrt{3}}{2}');
    expect(acceptedForms(parsed)).toHaveLength(3);
  });
});

describe('LessonSchema — the 8 fixed sections', () => {
  it('accepts a well-formed lesson and defaults solutionIds to practiceIds', () => {
    const parsed = LessonSchema.parse(validLesson);
    expect(parsed.lockMode).toBe('soft');
    expect(parsed.sections.solutionIds).toEqual(parsed.sections.practiceIds);
  });

  it('exposes exactly 8 section ids in fixed order', () => {
    expect(LESSON_SECTION_IDS).toEqual([
      'objective',
      'prerequisites',
      'concept',
      'techniques',
      'pitfalls',
      'practice',
      'solutions',
      'mastery',
    ]);
  });

  it('requires at least 3 worked examples', () => {
    expect(() =>
      LessonSchema.parse({
        ...validLesson,
        sections: { ...validLesson.sections, examples: [{ title: 'a', latex: '$$x=1$$' }] },
      }),
    ).toThrow(/3 worked/);
  });

  it('requires 2-3 pitfalls each carrying an explicit wrong answer', () => {
    expect(() =>
      LessonSchema.parse({ ...validLesson, sections: { ...validLesson.sections, pitfalls: [] } }),
    ).toThrow();
    const { wrongLatex: _dropped, ...withoutWrongAnswer } = validLesson.sections.pitfalls[0]!;
    expect(() =>
      LessonSchema.parse({ ...validLesson, sections: { ...validLesson.sections, pitfalls: [withoutWrongAnswer] } }),
    ).toThrow();
  });

  it('requires a mastery check of exactly 3 problems', () => {
    expect(() =>
      LessonSchema.parse({
        ...validLesson,
        sections: { ...validLesson.sections, masteryIds: ['a', 'b'] },
      }),
    ).toThrow(/exactly 3/);
  });

  it('rejects a mastery check that repeats a practice exercise', () => {
    expect(() =>
      LessonSchema.parse({
        ...validLesson,
        sections: {
          ...validLesson.sections,
          masteryIds: ['m1-linear-equations-01', 'm1-linear-equations-03', 'm1-linear-equations-04'],
        },
      }),
    ).toThrow(/distinct from the practice set/);
  });

  it('rejects a self-referential prerequisite', () => {
    expect(() =>
      LessonSchema.parse({
        ...validLesson,
        sections: { ...validLesson.sections, prerequisites: ['m1-linear-equations'] },
      }),
    ).toThrow(/own prerequisite/);
  });
});

describe('ModuleSchema — the 9-module spine', () => {
  it('accepts M1..M9 with contiguous 1-based order', () => {
    const module = ModuleSchema.parse({
      code: 'M1',
      title: 'Algebra Foundations',
      topicSlug: 'algebra',
      order: 1,
      summary: 'Linear and quadratic equations, inequalities, absolute value.',
      tiers: ['10', '12'],
      targetExerciseCount: 120,
    });
    expect(module.code).toBe('M1');
    expect(() => ModuleSchema.parse({ ...module, code: 'M0' })).toThrow();
    expect(() => ModuleSchema.parse({ ...module, order: 10 })).toThrow();
  });
});

describe('loadContent — the shipped content tree validates against the contract', () => {
  it('loads modules, lessons and exercises with all cross references resolved', () => {
    const index = loadContent(resolveContentRoot());
    expect(index.modules).toHaveLength(9);
    expect(index.lessons.length).toBeGreaterThan(0);
    expect(index.exercises.length).toBeGreaterThan(0);

    for (const lesson of index.lessons) {
      for (const id of lesson.sections.practiceIds) {
        expect(index.exercisesById.get(id)?.lessonId).toBe(lesson.id);
      }
      for (const id of lesson.sections.masteryIds) {
        expect(index.exercisesById.get(id)?.lessonId).toBe(lesson.id);
      }
    }
  });

  it('keeps every module ordered 1..9', () => {
    const index = loadContent(resolveContentRoot());
    expect(index.modules.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(index.modules.map((m) => m.code)).toEqual([
      'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9',
    ]);
  });
});
