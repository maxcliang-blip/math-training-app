import { loadContent, resolveContentRoot, type ContentIndex } from '@mta/content/node';
import type { Exercise, Lesson, Module, ModuleSummary } from '@mta/content';

/** Content is immutable in v1, so it is loaded once at boot. */
export function loadIndex(contentRoot?: string): ContentIndex {
  return loadContent(contentRoot ?? resolveContentRoot());
}

export type { ContentIndex, Exercise, Lesson, Module, ModuleSummary };

export interface ContentStore {
  index: ContentIndex;
  moduleList(): ModuleSummary[];
  moduleById(moduleId: string): ModuleSummary | undefined;
  lessonById(lessonId: string): Lesson | undefined;
  exerciseById(exerciseId: string): Exercise | undefined;
  exercisesByIds(ids: string[]): Exercise[];
  exercisesByLessonId(lessonId: string): Exercise[];
}

function moduleSummary(index: ContentIndex, module: Module): ModuleSummary {
  const lessons = index.lessonsByModule.get(module.code) ?? [];
  const exerciseIds = new Set<string>();
  for (const lesson of lessons) {
    for (const id of lesson.sections.practiceIds) exerciseIds.add(id);
    for (const id of lesson.sections.masteryIds) exerciseIds.add(id);
  }
  return {
    ...module,
    id: module.code,
    topicCount: module.tiers.length,
    lessonCount: lessons.length,
    exerciseCount: exerciseIds.size,
  };
}

export function createStore(index: ContentIndex): ContentStore {
  const summaries = index.modules.map((m) => moduleSummary(index, m));
  return {
    index,
    moduleList: () => summaries,
    moduleById: (moduleId) => summaries.find((m) => m.id === moduleId || m.code === moduleId),
    lessonById: (lessonId) => index.lessons.find((l) => l.id === lessonId),
    exerciseById: (exerciseId) => index.exercisesById.get(exerciseId),
    exercisesByIds: (ids) => ids.map((id) => index.exercisesById.get(id)).filter((e) => e !== undefined),
    exercisesByLessonId: (lessonId) => index.exercisesByLesson.get(lessonId) ?? [],
  };
}
