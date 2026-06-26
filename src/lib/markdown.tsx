import type { ReactNode } from 'react';

/** Renders inline **bold** spans within a line. */
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
    if (part.startsWith('`') && part.endsWith('`')) {
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

/** Minimal markdown -> React for headings, bullets, and bold. Demo-grade. */
export function Markdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

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

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) {
      flushBullets();
      const text = line.replace(/^#{1,6}\s/, '');
      blocks.push(
        <h3 key={`h-${index}`} className="mt-3 mb-1 text-sm font-bold tracking-tight text-foreground">
          {inline(text, `h-${index}`)}
        </h3>,
      );
    } else if (/^[-*]\s/.test(line)) {
      bullets.push(line.replace(/^[-*]\s/, ''));
    } else if (line.trim() === '') {
      flushBullets();
    } else {
      flushBullets();
      blocks.push(
        <p key={`p-${index}`} className="my-1.5 leading-relaxed">
          {inline(line, `p-${index}`)}
        </p>,
      );
    }
  });
  flushBullets();

  return <div className="text-sm text-muted-foreground">{blocks}</div>;
}
