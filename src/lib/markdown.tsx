import type { ReactNode } from 'react';

/** Renders inline **bold** and `code` spans within a line. */
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

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+(\|[\s\-:|]+)+\|$/.test(line.trim());
}

function parseCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(rows: string[], key: string): ReactNode {
  if (rows.length === 0) return null;

  let headerCells = parseCells(rows[0]);
  let bodyStart = 1;
  if (rows.length > 1 && isSeparatorRow(rows[1])) {
    bodyStart = 2;
  }
  const bodyRows = rows.slice(bodyStart).map(parseCells);

  return (
    <div key={key} className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[280px] text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            {headerCells.map((cell, i) => (
              <th
                key={`${key}-h-${i}`}
                className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {inline(cell, `${key}-h-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((cells, rowIndex) => (
            <tr
              key={`${key}-r-${rowIndex}`}
              className="border-b border-border/70 last:border-0 hover:bg-muted/40"
            >
              {cells.map((cell, cellIndex) => (
                <td key={`${key}-r-${rowIndex}-c-${cellIndex}`} className="px-3 py-2 text-foreground">
                  {inline(cell, `${key}-r-${rowIndex}-c-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Minimal markdown -> React for headings, lists, tables, and bold. */
export function Markdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];
  let tableRows: string[] = [];

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

  function flushNumbered() {
    if (numbered.length === 0) return;
    const items = numbered;
    blocks.push(
      <ol key={`ol-${blocks.length}`} className="my-2 list-decimal space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={`oli-${blocks.length}-${i}`}>{inline(item, `oli-${blocks.length}-${i}`)}</li>
        ))}
      </ol>,
    );
    numbered = [];
  }

  function flushTable() {
    if (tableRows.length === 0) return;
    const rows = tableRows;
    blocks.push(renderTable(rows, `tbl-${blocks.length}`));
    tableRows = [];
  }

  function flushAll() {
    flushBullets();
    flushNumbered();
    flushTable();
  }

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();

    if (isTableRow(line)) {
      flushBullets();
      flushNumbered();
      tableRows.push(line);
      return;
    }

    if (tableRows.length > 0) {
      flushTable();
    }

    if (/^#{1,6}\s/.test(line)) {
      flushAll();
      const text = line.replace(/^#{1,6}\s/, '');
      blocks.push(
        <h3 key={`h-${index}`} className="mt-3 mb-1 text-sm font-bold tracking-tight text-foreground">
          {inline(text, `h-${index}`)}
        </h3>,
      );
    } else if (/^[-*]\s/.test(line)) {
      flushNumbered();
      bullets.push(line.replace(/^[-*]\s/, ''));
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets();
      numbered.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushAll();
    } else {
      flushAll();
      blocks.push(
        <p key={`p-${index}`} className="my-1.5 leading-relaxed">
          {inline(line, `p-${index}`)}
        </p>,
      );
    }
  });

  flushAll();

  return <div className="text-sm text-muted-foreground">{blocks}</div>;
}
