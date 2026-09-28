import { Router } from 'express';
import { z } from 'zod';

import { TIERS } from '@mta/content';

import { HttpError } from '../middleware.js';
import type { ContentStore } from '../store.js';

const ListQuery = z.object({
  tier: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.split(',').filter((t) => (TIERS as readonly string[]).includes(t)))),
});

/** `GET /api/modules` — cheap list, cached in memory by the client for the session. */
export function moduleRouter(store: ContentStore): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { tier } = ListQuery.parse(req.query);
    const modules =
      tier === undefined || tier.length === 0
        ? store.moduleList()
        : store.moduleList().filter((m) => m.tiers.some((t) => tier.includes(t)));
    res.json(modules);
  });

  /** `GET /api/modules/:moduleId` — lesson list plus resolved prerequisite titles, no N+1. */
  router.get('/:moduleId', (req, res) => {
    const module = store.moduleById(req.params.moduleId);
    if (module === undefined) {
      throw new HttpError(404, `no module ${req.params.moduleId}`, 'module_not_found');
    }
    const lessons = store.index.lessonsByModule.get(module.code) ?? [];
    res.json({
      module,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        order: lesson.order,
        title: lesson.title,
        exerciseCount: lesson.sections.practiceIds.length + lesson.sections.masteryIds.length,
        tiers: lesson.tiers,
        estimatedMinutes: lesson.estimatedMinutes,
        lockMode: lesson.lockMode,
        prerequisites: lesson.sections.prerequisites,
      })),
      prerequisitesFlat: [
        ...new Set(lessons.flatMap((l) => l.sections.prerequisites)),
      ].map((id) => ({ id, title: store.lessonById(id)?.title ?? id })),
    });
  });

  return router;
}
