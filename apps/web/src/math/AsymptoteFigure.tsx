import { useEffect, useState } from 'react';

export interface AsymptoteFigureProps {
  source: string;
  /** Required whenever `source` is present; the figure is an enhancement, never content. */
  alt: string;
  /** Width / height. Reserved *before* compiling — this is the no-reflow contract. */
  aspectRatio: number;
}

type FigureState = { status: 'pending' } | { status: 'ready'; url: string } | { status: 'unavailable' };

/**
 * Reserved figure box.
 *
 * The box is sized from `aspectRatio` before any compilation happens, so a slow
 * or failing Asymptote build cannot shift the lesson layout. Compilation is
 * client-side and the figure degrades to alt text, never to a blank box.
 *
 * The compile transport is a build decision owned by MAX-5; this component is
 * the contract it must satisfy.
 */
export function AsymptoteFigure({ source, alt, aspectRatio }: AsymptoteFigureProps) {
  const [state, setState] = useState<FigureState>({ status: 'pending' });

  useEffect(() => {
    let cancelled = false;
    void compileAsymptote(source)
      .then((url) => {
        if (!cancelled) setState({ status: 'ready', url });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  return (
    <figure className="figure" style={{ aspectRatio: String(aspectRatio) }}>
      {state.status === 'ready' ? (
        <img src={state.url} alt={alt} />
      ) : (
        <figcaption className={state.status === 'unavailable' ? 'figure--unavailable' : undefined}>
          {state.status === 'unavailable'
            ? `Figure unavailable — the text below is complete. ${alt}`
            : alt}
        </figcaption>
      )}
    </figure>
  );
}

async function compileAsymptote(source: string): Promise<string> {
  const endpoint = import.meta.env['VITE_ASYMPTOTE_ENDPOINT'] as string | undefined;
  if (endpoint === undefined || endpoint.length === 0) {
    throw new Error('no Asymptote compile endpoint configured');
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) throw new Error(`asymptote compile failed: ${res.status}`);
  const body = (await res.json()) as { url: string };
  return body.url;
}
