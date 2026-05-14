import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { colIndexToLetter, getStatusColor, normalizePercentValue } from '@/lib/formulaEngine';
import { cn } from '@/lib/utils';

function genId() {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function CellInput({ value, formula, onCommit, type, isFormula }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(formula || (value !== null && value !== undefined ? String(value) : ''));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    onCommit(draft);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-7 w-full text-xs border-primary border-2 bg-accent/30 px-1 rounded-none"
      />
    );
  }

  const numericResult = type === 'result' ? normalizePercentValue(value) : null;
  const displayVal = type === 'result'
    ? (numericResult === null ? '' : `${Math.round(numericResult * 100) / 100}`)
    : (value !== null && value !== undefined && value !== '' ? String(value) : '');
  const statusCls = type === 'status' ? getStatusColor(displayVal) : '';
  const isError = displayVal === 'ERROR';

  return (
    <div
      className={cn(
        'w-full h-7 flex items-center px-2 text-xs cursor-pointer hover:bg-accent/40 transition-colors truncate rounded-sm',
        statusCls,
        isError && 'text-destructive',
        type === 'number' || type === 'formula' || type === 'result' ? 'justify-end font-mono' : ''
      )}
      onDoubleClick={startEdit}
      onClick={startEdit}
      title={displayVal}
    >
      {type === 'status' && displayVal ? (
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(displayVal))}>{displayVal}</span>
      ) : displayVal}
    </div>
  );
}

// ── Result cell: shows computed value OR allows manual entry if no formula ──
function ResultCell({ value, rowFormula, colFormula, onCommitFormula, onCommitValue }) {
  const [editingFormula, setEditingFormula] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingFormula || editingValue) inputRef.current?.focus();
  }, [editingFormula, editingValue]);

  const hasFormula = (rowFormula && rowFormula.startsWith('=')) || (colFormula && colFormula.startsWith('='));
  const normalized = normalizePercentValue(value);
  const displayVal = normalized === null ? '' : `${Math.round(normalized * 100) / 100}%`;
  const isError = value === 'ERROR';
  const hasRowOverride = rowFormula && rowFormula.startsWith('=') && rowFormula !== colFormula;

  const openFormulaEditor = (e) => {
    e.stopPropagation();
    setFormulaDraft(rowFormula && rowFormula.startsWith('=') ? rowFormula : (colFormula || ''));
    setEditingFormula(true);
  };

  const openValueEditor = () => {
    if (hasFormula) return; // don't allow manual edit when formula exists
    setValueDraft(normalized !== null ? String(Math.round(normalized * 100) / 100) : '');
    setEditingValue(true);
  };

  const commitFormula = () => {
    setEditingFormula(false);
    onCommitFormula(formulaDraft.trim());
  };

  const commitValue = () => {
    setEditingValue(false);
    onCommitValue(valueDraft.trim());
  };

  if (editingFormula) {
    return (
      <div className="flex items-center w-full h-7 gap-1 px-1">
        <Input
          ref={inputRef}
          value={formulaDraft}
          onChange={(e) => setFormulaDraft(e.target.value)}
          onBlur={commitFormula}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitFormula();
            if (e.key === 'Escape') setEditingFormula(false);
          }}
          placeholder={colFormula || '=B/A*100'}
          className="h-6 flex-1 text-xs border-primary border-2 bg-accent/30 px-1 rounded-none font-mono"
        />
      </div>
    );
  }

  if (editingValue) {
    return (
      <div className="flex items-center w-full h-7 gap-1 px-1">
        <Input
          ref={inputRef}
          value={valueDraft}
          onChange={(e) => setValueDraft(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitValue();
            if (e.key === 'Escape') setEditingValue(false);
          }}
          placeholder="Enter value"
          className="h-6 flex-1 text-xs border-primary border-2 bg-accent/30 px-1 rounded-none font-mono"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full h-7 flex items-center justify-end px-2 text-xs font-mono group relative',
        isError && 'text-destructive',
        !hasFormula && 'cursor-pointer hover:bg-accent/40'
      )}
      onClick={!hasFormula ? openValueEditor : undefined}
      title={hasFormula ? 'Formula-computed value' : 'Click to enter value manually'}
    >
      <span>{displayVal || (hasFormula ? '' : <span className="text-muted-foreground/40">click to enter</span>)}</span>
      {/* fx button for formula editing */}
      <button
        onClick={openFormulaEditor}
        className={cn(
          'ml-1 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity',
          hasRowOverride ? 'text-primary font-bold opacity-100' : 'text-muted-foreground'
        )}
        title={hasRowOverride ? `Row formula: ${rowFormula}` : 'Set formula for this row'}
      >
        fx
      </button>
    </div>
  );
}

// ── Status cell: per-row editable with formula support ──
function StatusCell({ value, rowFormula, colFormula, onCommitFormula, onCommitValue }) {
  const [editingFormula, setEditingFormula] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingFormula || editingValue) inputRef.current?.focus();
  }, [editingFormula, editingValue]);

  const hasFormula = (rowFormula && rowFormula.startsWith('=')) || (colFormula && colFormula.startsWith('='));
  const displayVal = value || '';
  const statusCls = getStatusColor(displayVal);

  const openFormulaEditor = (e) => {
    e.stopPropagation();
    setFormulaDraft(rowFormula && rowFormula.startsWith('=') ? rowFormula : (colFormula || ''));
    setEditingFormula(true);
  };

  const openValueEditor = () => {
    setValueDraft(displayVal);
    setEditingValue(true);
  };

  const commitFormula = () => {
    setEditingFormula(false);
    onCommitFormula(formulaDraft.trim());
  };

  const commitValue = () => {
    setEditingValue(false);
    onCommitValue(valueDraft.trim());
  };

  if (editingFormula) {
    return (
      <div className="flex items-center w-full h-7 gap-1 px-1">
        <Input
          ref={inputRef}
          value={formulaDraft}
          onChange={(e) => setFormulaDraft(e.target.value)}
          onBlur={commitFormula}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitFormula();
            if (e.key === 'Escape') setEditingFormula(false);
          }}
          placeholder="=IF(C>=B,'Met','Not Met')"
          className="h-6 flex-1 text-xs border-primary border-2 bg-accent/30 px-1 rounded-none font-mono"
        />
      </div>
    );
  }

  if (editingValue) {
    return (
      <div className="flex items-center w-full h-7 gap-1 px-1">
        <select
          ref={inputRef}
          value={valueDraft}
          onChange={(e) => setValueDraft(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitValue();
            if (e.key === 'Escape') setEditingValue(false);
          }}
          className="h-6 flex-1 text-xs border border-primary rounded px-1 bg-background"
          autoFocus
        >
          <option value="">— Select —</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Average">Average</option>
          <option value="Needs Improvement">Needs Improvement</option>
          <option value="Met">Met</option>
          <option value="Not Met">Not Met</option>
          <option value="Exceeded">Exceeded</option>
          <option value="On Track">On Track</option>
          <option value="At Risk">At Risk</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
    );
  }

  return (
    <div
      className="w-full h-7 flex items-center justify-center px-2 text-xs group relative cursor-pointer hover:bg-accent/20"
      onClick={openValueEditor}
      title="Click to set status manually"
    >
      {displayVal ? (
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', statusCls)}>{displayVal}</span>
      ) : (
        <span className="text-muted-foreground/40 text-xs">click to set</span>
      )}
      {/* fx button */}
      <button
        onClick={openFormulaEditor}
        className="ml-1 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
        title="Set formula for this row's status"
      >
        fx
      </button>
    </div>
  );
}

export default function KPIGrid({
  columns,
  rows,
  onChange,
  allowColumnEditing = true,
  allowColumnTypeEditing = true,
  allowFormulaEditing = true,
}) {
  const [editingColIdx, setEditingColIdx] = useState(null);
  const [colDraft, setColDraft] = useState('');
  const [formulaEditCol, setFormulaEditCol] = useState(null);
  const [formulaDraft, setFormulaDraft] = useState('');

  const addRow = () => {
    const newRow = { id: genId(), cells: {} };
    onChange({ columns, rows: [...rows, newRow] });
  };

  const deleteRow = (rowId) => {
    onChange({ columns, rows: rows.filter((r) => r.id !== rowId) });
  };

  const addColumn = () => {
    const idx = columns.length;
    const newCol = { key: genId(), label: `Column ${colIndexToLetter(idx)}`, type: 'text', formula: '' };
    onChange({ columns: [...columns, newCol], rows });
  };

  const deleteColumn = (colKey) => {
    const newCols = columns.filter((c) => c.key !== colKey);
    const newRows = rows.map((r) => {
      const cells = { ...r.cells };
      delete cells[colKey];
      return { ...r, cells };
    });
    onChange({ columns: newCols, rows: newRows });
  };

  const updateColumnLabel = (idx, label) => {
    const newCols = columns.map((c, i) => (i === idx ? { ...c, label } : c));
    onChange({ columns: newCols, rows });
  };

  const updateColumnType = (colKey, type) => {
    const newCols = columns.map((c) => (c.key === colKey ? { ...c, type } : c));
    onChange({ columns: newCols, rows });
  };

  const updateColumnFormula = (colKey, formula) => {
    const newCols = columns.map((c) => (c.key === colKey ? { ...c, formula } : c));
    onChange({ columns: newCols, rows });
  };

  const updateCell = (rowId, colKey, draft) => {
    const isFormula = draft.startsWith('=');
    const newRows = rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        cells: {
          ...r.cells,
          [colKey]: isFormula
            ? { formula: draft, value: draft, computed: null }
            : { value: draft, formula: '', computed: null },
        },
      };
    });
    onChange({ columns, rows: newRows });
  };

  // Update per-row formula for result/status columns
  const updateRowFormula = (rowId, colKey, formula) => {
    const newRows = rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        cells: {
          ...r.cells,
          [colKey]: {
            ...(r.cells?.[colKey] || {}),
            formula: formula && formula.startsWith('=') ? formula : '',
            computed: null,
          },
        },
      };
    });
    onChange({ columns, rows: newRows });
  };

  // Update manual value for result/status columns (when no formula)
  const updateRowValue = (rowId, colKey, value) => {
    const newRows = rows.map((r) => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        cells: {
          ...r.cells,
          [colKey]: {
            ...(r.cells?.[colKey] || {}),
            value,
            formula: '',
            computed: null,
          },
        },
      };
    });
    onChange({ columns, rows: newRows });
  };

  const getCellDisplay = (row, col) => {
    const cell = row.cells?.[col.key];

    if (col.type === 'result' || col.type === 'formula' || col.type === 'status') {
      const hasFormula = (cell?.formula && cell.formula.startsWith('=')) || (col.formula && col.formula.startsWith('='));
      return {
        value: hasFormula ? (cell?.computed ?? '') : (cell?.value ?? cell?.computed ?? ''),
        formula: cell?.formula && cell.formula.startsWith('=') ? cell.formula : (col.formula || ''),
        rowFormula: cell?.formula || '',
      };
    }

    const computed = cell?.formula?.startsWith('=') ? cell.computed : null;
    return {
      value: computed !== null && computed !== undefined ? computed : (cell?.value ?? ''),
      formula: cell?.formula || '',
      rowFormula: '',
    };
  };

  const openFormulaEditor = (col) => {
    setFormulaEditCol(col.key);
    setFormulaDraft(col.formula || '');
  };

  const colLetters = columns.map((_, i) => colIndexToLetter(i));

  return (
    <div className="overflow-x-auto">
      {/* Column-level formula bar */}
      {allowFormulaEditing && formulaEditCol && (() => {
        const col = columns.find((c) => c.key === formulaEditCol);
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs">
            <span className="font-semibold text-muted-foreground shrink-0">
              Default formula for "{col?.label}":
            </span>
            <Input
              autoFocus
              value={formulaDraft}
              onChange={(e) => setFormulaDraft(e.target.value)}
              onBlur={() => { updateColumnFormula(formulaEditCol, formulaDraft); setFormulaEditCol(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { updateColumnFormula(formulaEditCol, formulaDraft); setFormulaEditCol(null); }
                if (e.key === 'Escape') setFormulaEditCol(null);
              }}
              className="h-7 text-xs flex-1 font-mono"
              placeholder="e.g. =C/B*100 or =IF(C>=B,'Met','Not Met')"
            />
            <span className="text-muted-foreground shrink-0">Refs: {colLetters.join(', ')}</span>
          </div>
        );
      })()}

      <table className="w-full text-xs border-collapse">
        <thead>
          {allowColumnTypeEditing && (
            <tr className="bg-muted/30">
              <th className="w-8 border border-border/50 p-1" />
              <th className="w-8 border border-border/50 p-1 text-center text-muted-foreground">#</th>
              {columns.map((col) => (
                <th key={col.key} className="border border-border/50 p-1 min-w-32">
                  <div className="flex items-center justify-between gap-1">
                    <select
                      value={col.type}
                      onChange={(e) => updateColumnType(col.key, e.target.value)}
                      className="text-xs bg-transparent text-muted-foreground border-none outline-none flex-1"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="formula">Formula</option>
                      <option value="result">Result/Actual</option>
                      <option value="status">Status</option>
                    </select>
                    {allowColumnEditing && (
                      <button onClick={() => deleteColumn(col.key)} className="text-destructive/60 hover:text-destructive p-0.5" title="Delete column">x</button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 border border-border/50 p-1">
                {allowColumnEditing && (
                  <button onClick={addColumn} className="w-full flex items-center justify-center text-primary hover:text-primary/80">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </th>
            </tr>
          )}

          <tr className="bg-muted/50">
            <th className="w-8 border border-border/50 p-1" />
            <th className="w-8 border border-border/50 p-1 text-center text-muted-foreground font-bold">
              <span className="text-xs">#</span>
            </th>
            {columns.map((col, idx) => (
              <th key={col.key} className="border border-border/50 p-1 text-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground/60 font-normal text-xs">{colIndexToLetter(idx)}</span>
                  {allowColumnEditing && editingColIdx === idx ? (
                    <input
                      autoFocus
                      value={colDraft}
                      onChange={(e) => setColDraft(e.target.value)}
                      onBlur={() => { updateColumnLabel(idx, colDraft); setEditingColIdx(null); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { updateColumnLabel(idx, colDraft); setEditingColIdx(null); }
                        if (e.key === 'Escape') setEditingColIdx(null);
                      }}
                      placeholder="Column header"
                      className="h-6 text-xs border border-primary rounded px-1 w-full text-center bg-background"
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={cn('font-semibold', allowColumnEditing && 'cursor-pointer hover:text-primary', !col.label && allowColumnEditing && 'text-muted-foreground/40 text-xs')}
                        onDoubleClick={() => { if (!allowColumnEditing) return; setEditingColIdx(idx); setColDraft(col.label); }}
                        title={allowColumnEditing ? 'Double-click to rename' : col.label || '(No header)'}
                      >
                        {col.type === 'result' ? 'Actual' : (col.label || (allowColumnEditing ? '(empty)' : ''))}
                      </span>
                      {allowFormulaEditing && (col.type === 'formula' || col.type === 'result' || col.type === 'status') && (
                        <button onClick={() => openFormulaEditor(col)} className="text-primary/70 hover:text-primary text-xs font-mono" title="Edit default formula for all rows">fx</button>
                      )}
                    </div>
                  )}
                </div>
              </th>
            ))}
            <th className="w-10 border border-border/50">
              {!allowColumnTypeEditing && allowColumnEditing && (
                <button onClick={addColumn} className="w-full flex items-center justify-center text-primary hover:text-primary/80">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={row.id} className="hover:bg-accent/20 transition-colors group">
              <td className="border border-border/50 p-0.5 text-center">
                <button onClick={() => deleteRow(row.id)} className="opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </td>
              <td className="border border-border/50 p-1 text-center text-muted-foreground font-mono bg-muted/20">{rIdx + 1}</td>
              {columns.map((col) => {
                const { value, formula, rowFormula } = getCellDisplay(row, col);

                // Status column — editable per row, with formula or manual selection
                if (col.type === 'status') {
                  return (
                    <td key={col.key} className="border border-border/50 p-0 bg-muted/20">
                      <StatusCell
                        value={value}
                        rowFormula={rowFormula}
                        colFormula={col.formula}
                        onCommitFormula={(f) => updateRowFormula(row.id, col.key, f)}
                        onCommitValue={(v) => updateRowValue(row.id, col.key, v)}
                      />
                    </td>
                  );
                }

                // Result/Actual column — formula or manual entry
                if (col.type === 'result') {
                  return (
                    <td key={col.key} className="border border-border/50 p-0 bg-muted/20">
                      <ResultCell
                        value={value}
                        rowFormula={rowFormula}
                        colFormula={col.formula}
                        onCommitFormula={(f) => updateRowFormula(row.id, col.key, f)}
                        onCommitValue={(v) => updateRowValue(row.id, col.key, v)}
                      />
                    </td>
                  );
                }

                // All other columns — standard editable cell
                return (
                  <td key={col.key} className="border border-border/50 p-0">
                    <CellInput
                      value={value}
                      formula={formula}
                      type={col.type}
                      isFormula={col.type === 'formula'}
                      onCommit={(draft) => updateCell(row.id, col.key, draft)}
                    />
                  </td>
                );
              })}
              <td className="border border-border/50 w-10" />
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 3} className="py-8 text-center text-muted-foreground text-xs">
                No rows yet. Click "+ Add Row" to begin.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="p-2 border-t border-border/50 bg-muted/20">
        <Button variant="ghost" size="sm" onClick={addRow} className="gap-1 h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>
    </div>
  );
}
