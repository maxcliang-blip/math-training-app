/**
 * Content lint — a build gate, not a hope (Rendering Conventions §3.3).
 *
 * Validates the whole `content/` tree against the frozen contract. Wired into
 * `pnpm content:lint` and into CI so a malformed record fails the build instead
 * of failing silently in a learner's browser.
 */
import { loadContent, resolveContentRoot } from '../node.js';

function main(): void {
  const root = resolveContentRoot(process.argv[2]);
  try {
    const index = loadContent(root);
    const total = index.exercises.length;
    const byTier = new Map<string, number>();
    for (const exercise of index.exercises) {
      byTier.set(exercise.tier, (byTier.get(exercise.tier) ?? 0) + 1);
    }
    const figures = index.exercises.filter((e) => e.asymptoteSource !== null).length;
    process.stdout.write(
      [
        `content ok: ${index.modules.length} modules, ${index.lessons.length} lessons, ${total} exercises`,
        `  tiers: ${[...byTier].map(([tier, n]) => `${tier}=${n}`).join(' ')}`,
        `  asymptote figures: ${figures}`,
        '',
      ].join('\n'),
    );
  } catch (error) {
    process.stderr.write(`content lint failed\n  ${(error as Error).message}\n`);
    process.exitCode = 1;
  }
}

main();
