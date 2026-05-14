import { evaluate } from 'mathjs';

// Convert column index to letter (0 -> A, 1 -> B, ...)
export function colIndexToLetter(idx) {
  return String.fromCharCode(65 + idx);
}

// Build a context map: { A: val, B: val, ... } and { colKey: val } for a row
function buildContext(row, columns) {
  const ctx = {};
  columns.forEach((col, idx) => {
    const cell = row.cells?.[col.key];
    const val = parseFloat(cell?.computed ?? cell?.value);
    const num = isNaN(val) ? 0 : val;
    ctx[colIndexToLetter(idx)] = num;   // A, B, C...
    ctx[col.key] = num;                  // by key
    // sanitized label (no spaces)
    const safeLabel = col.label.replace(/\s+/g, '_');
    ctx[safeLabel] = num;
  });
  ctx.IF = (condition, truthyValue, falsyValue = '') => (condition ? truthyValue : falsyValue);
  ctx.AND = (...args) => args.every(Boolean);
  ctx.OR = (...args) => args.some(Boolean);
  ctx.NOT = (value) => !value;
  return ctx;
}

// Evaluate a formula string for a given row
export function computeFormula(formula, row, columns) {
  if (!formula || !formula.startsWith('=')) return null;
  const expr = formula.slice(1); // strip leading =
  const ctx = buildContext(row, columns);
  try {
    const result = evaluate(expr, ctx);
    if (typeof result === 'boolean') return result ? 'TRUE' : 'FALSE';
    if (typeof result === 'string') return result;
    if (typeof result === 'number') return Math.round(result * 10000) / 10000;
    return String(result);
  } catch (e) {
    return 'ERROR';
  }
}

export function normalizePercentValue(value) {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return null;
  if (parsed >= 0 && parsed <= 1) return parsed * 100;
  return parsed;
}

// Determine status from a numeric result
export function getStatus(value) {
  const v = normalizePercentValue(value);
  if (v === null) return '';
  if (v >= 100) return 'Excellent';
  if (v >= 85) return 'Good';
  if (v >= 75) return 'Average';
  return 'Needs Improvement';
}

export function getStatusColor(status) {
  switch (status) {
    case 'Excellent': return 'text-success bg-success/10';
    case 'Good': return 'text-emerald-600 bg-emerald-50';
    case 'Average': return 'text-warning bg-warning/10';
    case 'Needs Improvement': return 'text-destructive bg-destructive/10';
    default: return 'text-muted-foreground';
  }
}

function computeStatusFromResult(columns, updatedCells) {
  const resultCol = columns.find((column) => column.type === 'result');
  const resultVal = resultCol
    ? (updatedCells[resultCol.key]?.computed ?? updatedCells[resultCol.key]?.value)
    : null;

  return getStatus(resultVal);
}

// Recompute all formula/result/status cells in all rows
// Per-row cell.formula takes priority over column-level col.formula
export function recomputeTable(columns, rows) {
  return rows.map((row) => {
    const updatedCells = { ...(row.cells || {}) };

    // First pass: compute formula & result columns
    columns.forEach((col) => {
      if (col.type === 'formula' || col.type === 'result') {
        // ✅ Per-row formula takes priority over column-level formula
        const rowFormula = updatedCells[col.key]?.formula;
        const effectiveFormula = rowFormula && rowFormula.startsWith('=')
          ? rowFormula
          : col.formula;

        if (effectiveFormula) {
          const computed = computeFormula(
            effectiveFormula,
            { ...row, cells: updatedCells },
            columns
          );
          updatedCells[col.key] = {
            ...(updatedCells[col.key] || {}),
            formula: rowFormula || col.formula, // preserve per-row formula
            computed,
          };
        } else {
          // No formula at all — clear computed so it doesn't show stale value
          updatedCells[col.key] = {
            ...(updatedCells[col.key] || {}),
            computed: null,
          };
        }
      }
    });

    // Second pass: status columns (look at result column computed value)
    columns.forEach((col) => {
      if (col.type === 'status') {
        const currentCell = updatedCells[col.key] || {};
        const rowFormula = currentCell.formula;
        const effectiveFormula = rowFormula && rowFormula.startsWith('=')
          ? rowFormula
          : (col.formula || '');

        let computed = currentCell.value || '';
        if (effectiveFormula) {
          computed = computeFormula(
            effectiveFormula,
            { ...row, cells: updatedCells },
            columns
          );
        } else if (!computed) {
          computed = computeStatusFromResult(columns, updatedCells);
        }

        updatedCells[col.key] = {
          ...currentCell,
          formula: rowFormula || col.formula || '',
          computed,
        };
      }
    });

    return { ...row, cells: updatedCells };
  });
}
