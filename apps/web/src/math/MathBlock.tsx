import katex from 'katex';
import { useMemo } from 'react';

import { RENDER_ERROR_COPY, RENDER_ERROR_MARKERS, RENDER_OPTIONS } from './renderOptions.js';

export interface MathBlockProps {
  /** Raw LaTeX. Never pre-rendered HTML from the server. */
  latex: string;
  /** Set by the component, never sniffed from `$$` in the string. */
  displayMode?: boolean;
  className?: string;
}

/**
 * The one component that renders content math.
 *
 * Math is never optional and never a blank box: a render failure degrades to a
 * readable, actionable message with the LaTeX source visible and copyable, and
 * it never throws away the surrounding lesson or shifts layout.
 */
export function MathBlock({ latex, displayMode = false, className }: MathBlockProps) {
  const html = useMemo(() => {
    try {
      // The shared options keep `throwOnError: false` because that is what the content
      // linter wants when it merely *checks* a formula. Rendering has the opposite job:
      // it must not hand a learner a blank box, so it narrows the setting to turn a
      // failure into something catchable, and still checks the markers for the failures
      // KaTeX recovers from silently.
      const rendered = katex.renderToString(latex, {
        ...RENDER_OPTIONS,
        displayMode,
        throwOnError: true,
      });
      const failed = RENDER_ERROR_MARKERS.some((marker) => rendered.includes(marker));
      return failed ? { ok: false as const, html: '' } : { ok: true as const, html: rendered };
    } catch {
      return { ok: false as const, html: '' };
    }
  }, [latex, displayMode]);

  if (!html.ok) {
    return (
      <span className={['math-error', className].filter(Boolean).join(' ')} role="note">
        {RENDER_ERROR_COPY}{' '}
        <code>{latex}</code>
      </span>
    );
  }

  return (
    <span
      className={['math-block', displayMode ? 'math-block--display' : 'math-block--inline', className]
        .filter(Boolean)
        .join(' ')}
      // KaTeX output is generated locally from content LaTeX with `trust: false`.
      dangerouslySetInnerHTML={{ __html: html.html }}
    />
  );
}
