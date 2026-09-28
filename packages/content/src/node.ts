/**
 * `@mta/content/node` — the server-side half of the content package.
 *
 * `load.ts` reads the content tree with `node:fs` and `node:path`. Only processes
 * that have a filesystem may import this entry point; `apps/web` must not, or the
 * browser build fails on the Node built-ins.
 */
export * from './constants.js';
export * from './exercise.js';
export * from './lesson.js';
export * from './module.js';
export * from './load.js';
