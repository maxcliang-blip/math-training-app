import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../middleware.js';
import type { ContentStore } from '../store.js';

const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(200),
});

/** `GET /api/lessons` and `GET /api/lessons/:lessonId` (IA doc §7). */
export function lessonRouter(store: ContentStore): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { limit } = ListQuery.parse(req.query);
    res.json(
      store.index.lessons.slice(0, limit).map((lesson) => ({
        id: lesson.id,
        moduleId: lesson.moduleId,
        title: lesson.title,
        order: lesson.order,
        tiers: lesson.tiers,
        estimatedMinutes: lesson.estimatedMinutes,
        lockMode: lesson.lockMode,
        exerciseCount:
          lesson.sections.practiceIds.length + lesson.sections.masteryIds.length,
      })),
    );
  });

  /**
   * Returns **ids** for practice/solutions/mastery, never embedded copies, so the
   * client fetches the exercises themselves in one batch.
   */
  router.get('/:lessonId', (req, res) => {
    const lesson = store.lessonById(req.params.lessonId);
    if (lesson === undefined) {
      throw new HttpError(404, `no lesson ${req.params.lessonId}`, 'lesson_not_found');
    }
    res.json({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      order: lesson.order,
      tiers: lesson.tiers,
      estimatedMinutes: lesson.estimatedMinutes,
      lockMode: lesson.lockMode,
      exerciseCount: lesson.sections.practiceIds.length + lesson.sections.masteryIds.length,
      sections: lesson.sections,
    });
  });

  /** Convenience batch for the lesson page: practice + mastery in one round trip. */
  router.get('/:lessonId/exercises', (req, res) => {
    const lesson = store.lessonById(req.params.lessonId);
    if (lesson === undefined) {
      throw new HttpError(404, `no lesson ${req.params.lessonId}`, 'lesson_not_found');
    }
    res.json(store.exercisesByLessonId(lesson.id));
  });

  return router;
}
