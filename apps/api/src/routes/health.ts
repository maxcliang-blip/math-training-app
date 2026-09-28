import { Router } from 'express';

import type { ContentStore } from '../store.js';

export function healthRouter(store: ContentStore): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      content: {
        modules: store.index.modules.length,
        lessons: store.index.lessons.length,
        exercises: store.index.exercises.length,
      },
    });
  });
  return router;
}
