import { AppShell, Loading, ModuleGrid } from '../components/AppShell.js';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { ErrorState } from './ErrorState.js';

/** `/` — resume card, module grid, continue where you left off. */
export function Dashboard() {
  const state = useAsync(() => api.modules(), []);

  return (
    <AppShell>
      <h1>MathTrain</h1>
      <p className="lede">AMC-10, AMC-12 and AIME preparation — nine modules, four tiers.</p>
      {state.status === 'loading' && <Loading label="Loading modules…" />}
      {state.status === 'error' && <ErrorState error={state.error} />}
      {state.status === 'ready' && <ModuleGrid modules={state.data} />}
    </AppShell>
  );
}
