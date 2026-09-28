/**
 * The one place KaTeX options are decided (Rendering Conventions §2).
 *
 * `MathBlock`, `LatexPreview` and the content linter all import from here.
 * Nobody passes KaTeX options at a call site.
 *
 * KaTeX is pinned to 0.16.11 exactly (no caret) because KaTeX renders are
 * visually version-dependent: an unpinned upgrade is a content-visible change.
 */
import type { KatexOptions } from 'katex';

/**
 * katex 0.16.11 accepts `strictIgnores` at runtime but omits it from the
 * bundled `KatexOptions`. The option is load-bearing here — without it every
 * `\text` and `\middle` in real content would be red-lined under `strict: 'warn'`.
 */
export type KatexAppOptions = KatexOptions & { strictIgnores?: string[] };

/** The reviewed app macro table. Content may not `\newcommand` inline. */
export const MACROS: Record<string, string> = {
  '\\dfrac': '\\dfrac',
  '\\degree': '^\\circ',
  '\\inv': '^{-1}',
  '\\binom': '{#1 \\choose #2}',
};

export const RENDER_OPTIONS: KatexAppOptions = {
  // MathML present for screen readers; HTML for speed.
  output: 'htmlAndMathml',
  // A bad formula must not throw into the React tree.
  throwOnError: false,
  // Renders the unparsed source in red inline — visible, not hidden.
  errorColor: '#b91c1c',
  // Accepts real-world content LaTeX; 'error' would red-line cosmetic tags.
  strict: 'warn',
  // Field-driven, never string-sniffed. MathBlock sets displayMode explicitly.
  displayMode: false,
  // No \htmlClass, no \href from content. Answers and hints are content.
  trust: false,
  macros: MACROS,
  // A runaway \left( cannot blow out the layout.
  maxSize: 20,
  // Bounds macro expansion cost.
  maxExpand: 1000,
  strictIgnores: ['\\text', '\\middle'],
};

/** Copy for the inline "this formula didn't render" state. Never a blank box. */
export const RENDER_ERROR_COPY = "This problem's formula didn't render.";

/**
 * How a failed KaTeX render announces itself in the output.
 *
 * `throwOnError: false` means KaTeX never throws, so a caller that wants to *show*
 * the failure has to recognise it in the markup. It reports two ways:
 *  - `katex-error` spans for a parse error it recovered from;
 *  - a red-lined source wrapped in `mathcolor=`, which is what an unsupported or
 *    untrusted command such as `\unknowncommand` or `\href` produces instead.
 *
 * A legitimately authored formula can only produce `mathcolor` by using `\color`
 * or `\textcolor`, which this configuration already red-lines, so matching on the
 * attribute cannot mistake good content for broken content.
 */
export const RENDER_ERROR_MARKERS: readonly string[] = ['katex-error', 'mathcolor='];
