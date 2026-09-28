/**
 * @mta/content — the frozen content contract (v1).
 *
 * Everything exported here is depended on by:
 *   - apps/api  (backend services, MAX-4)
 *   - apps/web  (KaTeX / Asymptote rendering, MAX-5)
 *
 * Changes to a field name, enum value, or nullability are breaking and require a
 * contract version bump. See docs/CONTENT_CONTRACT.md.
 *
 * This entry point is **browser-safe**: schemas, constants and pure helpers only.
 * The filesystem loader lives behind `@mta/content/node`, because `apps/web` bundles
 * from this entry and a `node:fs` import here would break the browser build.
 */
export * from './constants.js';
export * from './exercise.js';
export * from './lesson.js';
export * from './module.js';
