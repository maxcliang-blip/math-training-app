import { AppShell, EmptyState } from '../components/AppShell.js';

/**
 * `/progress` — per-module mastery, tier readiness, review queue.
 *
 * Progress lives client-side behind `ProgressStore` in v1 (no auth assumption);
 * the component lands with MAX-4.
 */
export function Progress() {
  return (
    <AppShell breadcrumb="Progress">
      <h1>Progress</h1>
      <EmptyState message="No lessons marked yet." />
    </AppShell>
  );
}
