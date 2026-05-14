import { getStatus, normalizePercentValue } from '@/lib/formulaEngine';

export function isNeedsAttentionStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'needs improvement'
    || normalized.includes('below')
    || normalized.includes('miss')
    || normalized.includes('delay')
    || normalized.includes('overdue')
    || normalized.includes('failed')
    || normalized.includes('not met')
    || normalized.includes('at risk');
}

export function buildStatusDistribution(items, colors = []) {
  const counts = new Map();

  items.forEach((item) => {
    const status = String(item.status || '').trim();
    if (!status) return;
    counts.set(status, (counts.get(status) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, value], index) => ({ name, value, fill: colors[index % colors.length] }))
    .sort((a, b) => b.value - a.value);
}

function getPrimaryLabel(table, row) {
  const labelColumn = (table.columns || []).find((column) => column.type === 'text');
  if (!labelColumn) return 'Untitled KPI';
  return row.cells?.[labelColumn.key]?.value || row.cells?.[labelColumn.key]?.computed || 'Untitled KPI';
}

export function summarizeTable(table) {
  const resultCol = table.columns?.find((column) => column.type === 'result');
  const statusCol = table.columns?.find((column) => column.type === 'status');
  const rows = table.rows || [];
  const resultValues = resultCol
    ? rows
        .map((row) => normalizePercentValue(row.cells?.[resultCol.key]?.computed ?? row.cells?.[resultCol.key]?.value))
        .filter((value) => value !== null)
    : [];

  const averageScore = resultValues.length > 0
    ? Math.round((resultValues.reduce((sum, value) => sum + value, 0) / resultValues.length) * 10) / 10
    : null;

  const statusCounts = {};
  const resultItems = rows.map((row) => {
    const label = getPrimaryLabel(table, row);
    const resultValue = resultCol
      ? normalizePercentValue(row.cells?.[resultCol.key]?.computed ?? row.cells?.[resultCol.key]?.value)
      : null;
    const status = statusCol
      ? row.cells?.[statusCol.key]?.computed || row.cells?.[statusCol.key]?.value || ''
      : getStatus(resultValue);

    if (status) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }

    return {
      id: `${table.id}_${row.id}`,
      tableId: table.id,
      tableTitle: table.title,
      departmentId: table.department_id,
      departmentName: table.department_name,
      period: table.period,
      year: table.year,
      month: table.month,
      label,
      resultValue,
      status,
    };
  });

  const headerLabels = (table.columns || [])
    .filter((column) => column.type !== 'status')
    .map((column) => column.label);

  return {
    ...table,
    rows,
    headerLabels,
    averageScore,
    resultValues,
    resultItems,
    statusCounts,
    rowCount: rows.length,
  };
}

export function summarizeTables(tables, filters = {}) {
  return tables
    .filter((table) => {
      if (filters.period && table.period !== filters.period) return false;
      if (filters.department_id && table.department_id !== filters.department_id) return false;
      if (filters.year && table.year !== filters.year) return false;
      if (filters.month && table.month !== filters.month) return false;
      return true;
    })
    .map(summarizeTable);
}

export function flattenResultItems(summaries) {
  return summaries.flatMap((summary) => summary.resultItems).filter((item) => item.resultValue !== null);
}

export function buildHeaderFrequency(summaries) {
  const map = new Map();
  summaries.forEach((summary) => {
    summary.headerLabels.forEach((label) => {
      map.set(label, (map.get(label) || 0) + 1);
    });
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function buildResultLabelSummary(summaries) {
  const map = new Map();
  flattenResultItems(summaries).forEach((item) => {
    const current = map.get(item.label) || { total: 0, count: 0, needsImprovement: 0 };
    current.total += item.resultValue;
    current.count += 1;
    if (isNeedsAttentionStatus(item.status)) current.needsImprovement += 1;
    map.set(item.label, current);
  });

  return Array.from(map.entries()).map(([name, value]) => ({
    name,
    averageResult: Math.round((value.total / value.count) * 10) / 10,
    count: value.count,
    needsImprovement: value.needsImprovement,
  }));
}

export function buildMonthlyScoreTrend(tables, year, departmentId = null) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthlySummaries = summarizeTables(tables, {
      year,
      month,
      ...(departmentId ? { department_id: departmentId } : {}),
    });
    const scoreValues = monthlySummaries
      .map((summary) => summary.averageScore)
      .filter((value) => value !== null);
    const averageScore = scoreValues.length > 0
      ? Math.round((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) * 10) / 10
      : null;
    return { month, averageScore, tableCount: monthlySummaries.length };
  });
}
