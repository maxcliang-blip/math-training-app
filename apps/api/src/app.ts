import cors from 'cors';
import express, { type Express } from 'express';

import { createErrorHandler, notFound } from './middleware.js';
import { exerciseRouter } from './routes/exercises.js';
import { gradeRouter } from './routes/grade.js';
import { healthRouter } from './routes/health.js';
import { lessonRouter } from './routes/lessons.js';
import { moduleRouter } from './routes/modules.js';
import { practiceRouter } from './routes/practice.js';
import { progressRouter } from './routes/progress.js';
import { createStore, loadIndex, type ContentStore } from './store.js';

export interface AppOptions {
  /** Content root. Defaults to the repo `content/` directory. */
  contentRoot?: string;
  /** Pre-loaded store, for tests. */
  store?: ContentStore;
  corsOrigin?: string | boolean;
}

/**
 * Build the Express app.
 *
 * Route surface is the one the UI requires (IA doc §7). Raw LaTeX fields are
 * served verbatim — the server never pre-renders math to HTML.
 */
export function createApp(options: AppOptions = {}): Express {
  const store = options.store ?? createStore(loadIndex(options.contentRoot));

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: options.corsOrigin ?? true }));
  app.use(express.json({ limit: '256kb' }));

  app.use(healthRouter(store));
  app.use('/api/modules', moduleRouter(store));
  app.use('/api/lessons', lessonRouter(store));
  app.use('/api/exercises', exerciseRouter(store));
  app.use('/api/practice', practiceRouter(store));
  app.use('/api/progress', progressRouter());
  app.use('/api/grade', gradeRouter(store));

  app.use(notFound);
  app.use(createErrorHandler());

  return app;
}
