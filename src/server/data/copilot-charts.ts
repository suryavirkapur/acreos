type ChartPoint = { label: string; value: number };

type ChartSpec = {
  type: 'bar' | 'hbar' | 'line' | 'area' | 'pie' | 'donut';
  title: string;
  unit?: string;
  data: ChartPoint[];
};

function chartMarkdown(spec: ChartSpec): string {
  return `\`\`\`chart\n${JSON.stringify(spec)}\n\`\`\``;
}

function isChartLike(obj: unknown): obj is ChartSpec {
  if (!obj || typeof obj !== 'object') return false;
  const rec = obj as Record<string, unknown>;
  return (
    typeof rec.type === 'string' &&
    ['bar', 'hbar', 'line', 'area', 'pie', 'donut'].includes(rec.type) &&
    Array.isArray(rec.data)
  );
}

/** Remove model-emitted JSON chart blocks so we don't duplicate or show raw JSON. */
export function stripRawChartJsonBlocks(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const fence = lines[i].trimStart().match(/^```(\w*)\s*$/);
    if (!fence) {
      out.push(lines[i]);
      i++;
      continue;
    }

    const buf: string[] = [];
    i++;
    while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
      buf.push(lines[i]);
      i++;
    }
    if (i < lines.length) i++; // closing fence

    const body = buf.join('\n').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }

    if (!isChartLike(parsed)) {
      out.push('```' + fence[1]);
      out.push(...buf);
      out.push('```');
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildChartForTool(name: string, data: unknown): ChartSpec | null {
  if (!data) return null;

  if (name === 'price_trend_by_district' && Array.isArray(data)) {
    const rows = data as Array<{ district: string; avgPricePerSqm: number }>;
    if (rows.length === 0) return null;
    return {
      type: 'hbar',
      title: 'Average sale price per sqm by district',
      unit: '/sqm',
      data: rows.slice(0, 10).map((r) => ({ label: r.district, value: r.avgPricePerSqm })),
    };
  }

  if (name === 'capital_supply_by_sector' && Array.isArray(data)) {
    const rows = data as Array<{ sector: string; mandates: number }>;
    if (rows.length === 0) return null;
    return {
      type: 'donut',
      title: 'Investor mandates by sector',
      data: rows.map((r) => ({
        label: r.sector.replace(/_/g, ' '),
        value: r.mandates,
      })),
    };
  }

  if (name === 'service_demand_by_district' && Array.isArray(data)) {
    const rows = data as Array<{ district: string; avgDemandIndex: number }>;
    if (rows.length === 0) return null;
    return {
      type: 'hbar',
      title: 'Unmet service demand by district',
      data: rows.slice(0, 10).map((r) => ({ label: r.district, value: r.avgDemandIndex })),
    };
  }

  if (name === 'top_vacant_parcels' && Array.isArray(data)) {
    const rows = data as Array<{
      parcel_id: string;
      district: string;
      development_potential_score: number;
    }>;
    if (rows.length === 0) return null;
    return {
      type: 'bar',
      title: 'Top vacant parcels by development potential',
      data: rows.slice(0, 8).map((r) => ({
        label: r.parcel_id,
        value: r.development_potential_score,
      })),
    };
  }

  return null;
}

/** Append server-built charts from tool results when the model omits or garbles them. */
export function enrichReplyWithCharts(
  reply: string,
  toolResults: Array<{ name: string; data: unknown }>,
): string {
  let text = stripRawChartJsonBlocks(reply);

  if (text.includes('```chart')) return text;

  const charts = toolResults
    .map((t) => buildChartForTool(t.name, t.data))
    .filter((c): c is ChartSpec => c != null)
    .map(chartMarkdown);

  if (charts.length === 0) return text;
  return `${text}\n\n${charts.join('\n\n')}`;
}
