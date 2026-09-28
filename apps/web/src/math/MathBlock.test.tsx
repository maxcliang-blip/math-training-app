import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MathBlock } from './MathBlock.js';
import { RENDER_OPTIONS } from './renderOptions.js';

describe('renderOptions — the one place KaTeX options are decided', () => {
  it('pins the safety-relevant options from Rendering Conventions §2', () => {
    expect(RENDER_OPTIONS.output).toBe('htmlAndMathml');
    expect(RENDER_OPTIONS.throwOnError).toBe(false);
    expect(RENDER_OPTIONS.errorColor).toBe('#b91c1c');
    expect(RENDER_OPTIONS.strict).toBe('warn');
    expect(RENDER_OPTIONS.displayMode).toBe(false);
    expect(RENDER_OPTIONS.trust).toBe(false);
    expect(RENDER_OPTIONS.maxSize).toBe(20);
    expect(RENDER_OPTIONS.maxExpand).toBe(1000);
    expect(RENDER_OPTIONS.strictIgnores).toEqual(['\\text', '\\middle']);
  });

  it('emits MathML for screen readers, not HTML alone', () => {
    const { container } = render(<MathBlock latex="x^2" />);
    expect(container.querySelector('math')).not.toBeNull();
  });
});

describe('MathBlock', () => {
  it('renders inline LaTeX', () => {
    const { container } = render(<MathBlock latex={'x^2 + 2x + 1'} />);
    expect(container.textContent).toContain('x');
    expect(container.querySelector('.math-block--inline')).not.toBeNull();
  });

  it('honours displayMode from the component, never by sniffing $$', () => {
    const { container } = render(<MathBlock latex={'x^2'} displayMode />);
    expect(container.querySelector('.math-block--display')).not.toBeNull();
  });

  it('degrades to a copyable message instead of a blank box', () => {
    const { container } = render(<MathBlock latex={'\\frac{1}{'} />);
    const error = container.querySelector('.math-error');
    expect(error).not.toBeNull();
    expect(error?.textContent).toContain("didn't render");
    // The LaTeX source stays visible so it can be copied and reported.
    expect(error?.querySelector('code')?.textContent).toBe('\\frac{1}{');
  });

  it('does not execute content macros such as \\href (trust is false)', () => {
    const { container } = render(<MathBlock latex={'\\href{https://example.com}{x}'} />);
    expect(container.querySelector('a[href^="https://example.com"]')).toBeNull();
  });

  it('is announced to assistive tech when a formula fails', () => {
    render(<MathBlock latex={'\\unknowncommand'} />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
