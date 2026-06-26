import type { ReactNode } from 'react';

import { Chart, parseChartSpec } from '@/components/Chart';

/** Renders inline **bold**, *italic*, and `code` spans within a line. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${index}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={`${keyPrefix}-c-${index}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>;
  });
}

function ChartBlock({ json, keyId }: { json: string; keyId: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return (
      <pre
        key={keyId}
        className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-xs"
      >
        {json}
      </pre>
    );
  }
  const spec = parseChartSpec(parsed);
  if (!spec) return null;
  return <Chart key={keyId} spec={spec} />;
}

/** Minimal markdown -> React for headings, lists, bold, code, and ```chart blocks. */
export function Markdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let ordered: string[] = [];

  function flushBullets() {
    if (bullets.length === 0) return;
    const items = bullets;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={`li-${blocks.length}-${i}`}>{inline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  }

  function flushOrdered() {
    if (ordered.length === 0) return;
    const items = ordered;
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="my-2 list-decimal space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={`oli-${blocks.length}-${i}`}>{inline(item, `oli-${blocks.length}-${i}`)}</li>
        ))}
      </ol>,
    );
    ordered = [];
  }

  function flushLists() {
    flushBullets();
    flushOrdered();
  }

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const line = raw.trimEnd();

    // Fenced code block (``` or ```lang). `chart` blocks render as charts.
    const fence = line.trimStart().match(/^```(\w*)\s*$/);
    if (fence) {
      flushLists();
      const lang = fence[1].toLowerCase();
      const buf: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trimStart().startsWith('```')) {
        buf.push(lines[index]);
        index++;
      }
      const body = buf.join('\n');
      if (lang === 'chart' || lang === 'json') {
        const node = (lang === 'chart' ? true : parseChartSpec(safeJson(body)) != null)
          ? <ChartBlock key={`chart-${index}`} json={body} keyId={`chart-${index}`} />
          : null;
        if (node) {
          blocks.push(node);
          continue;
        }
      }
      blocks.push(
        <pre
          key={`pre-${index}`}
          className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs text-foreground"
        >
          {body}
        </pre>,
      );
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      flushLists();
      const text = line.replace(/^#{1,6}\s/, '');
      blocks.push(
        <h3 key={`h-${index}`} className="mt-3 mb-1 text-sm font-bold tracking-tight text-foreground">
          {inline(text, `h-${index}`)}
        </h3>,
      );
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets();
      ordered.push(line.replace(/^\d+\.\s/, ''));
    } else if (/^[-*]\s/.test(line)) {
      flushOrdered();
      bullets.push(line.replace(/^[-*]\s/, ''));
    } else if (line.trim() === '') {
      flushLists();
    } else {
      flushLists();
      blocks.push(
        <p key={`p-${index}`} className="my-1.5 leading-relaxed">
          {inline(line, `p-${index}`)}
        </p>,
      );
    }
  }
  flushLists();

  return <div className="text-sm text-muted-foreground">{blocks}</div>;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
