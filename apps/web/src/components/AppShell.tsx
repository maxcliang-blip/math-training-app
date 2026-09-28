import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { ModuleSummary } from '../api/client.js';

/** Topbar shell: brand, primary nav, breadcrumb slot. */
export function AppShell({ breadcrumb, children }: { breadcrumb?: string; children: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell__topbar">
        <Link to="/" className="shell__brand">
          MathTrain
        </Link>
        <nav className="shell__nav" aria-label="Primary">
          <Link to="/learn">Modules</Link>
          <Link to="/practice">Practice</Link>
          <Link to="/progress">Progress</Link>
        </nav>
        {breadcrumb !== undefined && <p className="shell__breadcrumb">{breadcrumb}</p>}
      </header>
      <main className="shell__main">{children}</main>
    </div>
  );
}

export function ModuleCard({ module }: { module: ModuleSummary }) {
  return (
    <li className="card module-card">
      <h3>
        <Link to={`/learn/${module.id}`}>
          {module.code} · {module.title}
        </Link>
      </h3>
      <p>{module.summary}</p>
      <p className="tier-row">
        {module.tiers.map((tier) => (
          <span key={tier} className={`tier tier--${tier.replace('+', 'plus')}`}>
            {tier}
          </span>
        ))}
      </p>
      <p className="muted">
        {module.lessonCount} lessons · {module.exerciseCount} exercises
      </p>
    </li>
  );
}

export function ModuleGrid({ modules }: { modules: ModuleSummary[] }) {
  return (
    <ul className="grid grid--modules">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </ul>
  );
}

/** Canonical loading copy (IA doc §6.7). */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="muted" role="status" aria-live="polite">
      {label}
    </p>
  );
}

/** Canonical empty copy (IA doc §6.7). */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <p>{message}</p>
      {action}
    </div>
  );
}
