import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AsymptoteFigure } from './AsymptoteFigure.js';

describe('AsymptoteFigure — the no-reflow contract', () => {
  it('reserves space from asymptoteAspectRatio before compiling', async () => {
    const { container, findByText } = render(
      <AsymptoteFigure source="unitsize(1cm);" alt="A right triangle." aspectRatio={0.75} />,
    );
    // Asserted synchronously, while the compile is still outstanding: the box is
    // sized from the ratio, not from a result.
    expect(container.querySelector('figure')?.style.aspectRatio).toBe('0.75');
    // Then let the compile settle, or React warns about a state update outside act().
    await findByText(/Figure unavailable/);
  });

  it('degrades to alt text, never a blank box, when the build is unavailable', async () => {
    const { container, findByText } = render(
      <AsymptoteFigure source="unitsize(1cm);" alt="A right triangle." aspectRatio={1.333} />,
    );
    const caption = await findByText(/Figure unavailable/);
    expect(caption.textContent).toContain('A right triangle.');
    expect(container.querySelector('img')).toBeNull();
  });
});
