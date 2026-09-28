import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import matter from 'gray-matter';
import { z } from 'zod';

import { ExerciseSchema, type Exercise } from './exercise.js';
import { LessonSchema, type Lesson } from './lesson.js';
import { ModuleSchema, type Module } from './module.js';

/**
 * Content file layout (frozen, v1):
 *
 *   content/
 *     modules.yaml                                  # the 9 modules
 *     lessons/<module-slug>/<lesson-slug>.md        # YAML frontmatter + concept prose body
 *     exercises/<module-slug>/<lesson-slug>/<exercise-slug>.md
 *
 * Authoring rule: **structured data in frontmatter, long-form prose in the body.**
 * For a lesson the body is exactly the `concept` section (the only 400-900 word
 * prose field); everything else is structured frontmatter. For an exercise the
 * frontmatter is the whole record and the body is authoring notes, ignored at
 * runtime.
 */
export const CONTENT_LAYOUT = {
  modulesFile: 'modules.yaml',
  lessonsDir: 'lessons',
  exercisesDir: 'exercises',
  extension: '.md',
} as const;

export class ContentError extends Error {
  constructor(
    message: string,
    readonly file?: string,
  ) {
    super(file === undefined ? message : `${file}: ${message}`);
    this.name = 'ContentError';
  }
}

export interface ContentIndex {
  modules: Module[];
  lessons: Lesson[];
  exercises: Exercise[];
  /** module code -> its lessons, ordered. */
  lessonsByModule: Map<string, Lesson[]>;
  /** exercise id -> exercise. */
  exercisesById: Map<string, Exercise>;
  /** lesson id -> its exercises. */
  exercisesByLesson: Map<string, Exercise[]>;
}

function listMarkdownFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries.sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listMarkdownFiles(full));
    } else if (entry.endsWith(CONTENT_LAYOUT.extension)) {
      files.push(full);
    }
  }
  return files;
}

function parseOne<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  file: string,
  label: string,
): T {
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const result = schema.safeParse(parsed.data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new ContentError(`invalid ${label} frontmatter:\n${issues}`, relative(process.cwd(), file));
  }
  return result.data;
}

/**
 * Parse one lesson file. The markdown body becomes `sections.concept`; all
 * other section fields come from frontmatter and are validated here.
 */
export function parseLessonFile(file: string): Lesson {
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const concept = parsed.content.trim();
  if (concept.length === 0) {
    throw new ContentError('lesson body (the `concept` section) is empty', relative(process.cwd(), file));
  }
  const frontmatter = parsed.data as { sections: Record<string, unknown> };
  const data: unknown = { ...frontmatter, sections: { ...frontmatter.sections, concept } };
  const result = LessonSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new ContentError(`invalid lesson frontmatter:\n${issues}`, relative(process.cwd(), file));
  }
  return result.data;
}

/** Parse one exercise file. The body is authoring notes and is ignored. */
export function parseExerciseFile(file: string): Exercise {
  return parseOne(ExerciseSchema, file, 'exercise');
}

/**
 * Cross-file integrity check. Content gaps are surfaced as errors, not silently
 * papered over — the only thing the loader absorbs is a missing figure.
 */
function validate(index: Omit<ContentIndex, 'lessonsByModule' | 'exercisesByLesson'>): void {
  const moduleCodes = new Set(index.modules.map((m) => m.code));
  const lessonIds = new Set(index.lessons.map((l) => l.id));

  for (const lesson of index.lessons) {
    if (!moduleCodes.has(lesson.moduleId)) {
      throw new ContentError(`lesson ${lesson.id} references unknown module ${lesson.moduleId}`);
    }
    for (const prereq of lesson.sections.prerequisites) {
      if (!lessonIds.has(prereq)) {
        throw new ContentError(`lesson ${lesson.id} references unknown prerequisite ${prereq}`);
      }
    }
  }

  for (const module of index.modules) {
    const orders = index.lessons
      .filter((l) => l.moduleId === module.code)
      .map((l) => l.order)
      .sort((a, b) => a - b);
    const expected = Array.from({ length: orders.length }, (_, i) => i + 1);
    if (orders.join(',') !== expected.join(',')) {
      throw new ContentError(
        `module ${module.code} lesson order must be 1..${orders.length}, got [${orders.join(', ')}]`,
      );
    }
  }

  for (const lesson of index.lessons) {
    for (const id of [...lesson.sections.practiceIds, ...lesson.sections.masteryIds]) {
      const exercise = index.exercisesById.get(id);
      if (exercise === undefined) {
        throw new ContentError(`lesson ${lesson.id} references unknown exercise ${id}`);
      }
      if (exercise.lessonId !== lesson.id || exercise.moduleId !== lesson.moduleId) {
        throw new ContentError(
          `exercise ${id} belongs to ${exercise.moduleId}/${exercise.lessonId} but is listed by ${lesson.moduleId}/${lesson.id}`,
        );
      }
    }
  }
}

/** Load and validate the whole `content/` tree. */
export function loadContent(root: string): ContentIndex {
  const modulesFile = join(root, CONTENT_LAYOUT.modulesFile);
  let modulesRaw: unknown;
  try {
    modulesRaw = matter(readFileSync(modulesFile, 'utf8')).data.modules;
  } catch (error) {
    throw new ContentError(
      `cannot read ${CONTENT_LAYOUT.modulesFile}: ${(error as Error).message}`,
      relative(process.cwd(), modulesFile),
    );
  }
  const modulesResult = z.array(ModuleSchema).min(1).safeParse(modulesRaw);
  if (!modulesResult.success) {
    throw new ContentError(
      `invalid modules list:\n${modulesResult.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`,
      relative(process.cwd(), modulesFile),
    );
  }
  const modules = [...modulesResult.data].sort((a, b) => a.order - b.order);

  const lessons = listMarkdownFiles(join(root, CONTENT_LAYOUT.lessonsDir)).map(parseLessonFile);
  const exercises = listMarkdownFiles(join(root, CONTENT_LAYOUT.exercisesDir)).map(parseExerciseFile);

  for (const [i, lesson] of lessons.entries()) {
    if (lessons.findIndex((other) => other.id === lesson.id) !== i) {
      throw new ContentError(`duplicate lesson id ${lesson.id}`);
    }
  }
  for (const [i, exercise] of exercises.entries()) {
    if (exercises.findIndex((other) => other.id === exercise.id) !== i) {
      throw new ContentError(`duplicate exercise id ${exercise.id}`);
    }
  }

  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const base = { modules, lessons, exercises, exercisesById };
  validate(base);

  const lessonsByModule = new Map<string, Lesson[]>();
  for (const lesson of [...lessons].sort((a, b) => a.order - b.order)) {
    const list = lessonsByModule.get(lesson.moduleId) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.moduleId, list);
  }
  const exercisesByLesson = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    const list = exercisesByLesson.get(exercise.lessonId) ?? [];
    list.push(exercise);
    exercisesByLesson.set(exercise.lessonId, list);
  }

  return { ...base, lessonsByModule, exercisesByLesson };
}

/** Resolve the `content/` directory: explicit arg > `CONTENT_DIR` > repo default. */
export function resolveContentRoot(explicit?: string): string {
  if (explicit !== undefined && explicit.length > 0) return explicit;
  const fromEnv = process.env['CONTENT_DIR'];
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv;
  return join(import.meta.dirname, '..', '..', '..', 'content');
}

/** Repo-relative path for error messages, with forward slashes. */
export function displayPath(root: string, file: string): string {
  return relative(root, file).split(sep).join('/');
}
