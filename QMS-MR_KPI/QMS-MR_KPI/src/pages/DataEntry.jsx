import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import serverApi from '@/api/serverClient';
const localApi = serverApi;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/lib/computations';
import { recomputeTable } from '@/lib/formulaEngine';
import { summarizeTable } from '@/lib/kpiTableAnalytics';
import KPIGrid from '@/components/kpi/KPIGrid';
import { Save, Plus, Trash2, Table2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_COLUMNS = [
  { key: 'kpi', label: 'KPI Indicator', type: 'text', formula: '' },
  { key: 'target', label: 'Target', type: 'number', formula: '' },
  { key: 'actual', label: 'Actual', type: 'number', formula: '' },
  { key: 'result', label: 'Result (%)', type: 'result', formula: '=C/B*100' },
  { key: 'status', label: 'Status', type: 'status', formula: '' },
  { key: 'remarks', label: 'Remarks', type: 'text', formula: '' },
];

const DEFAULT_ROWS = [
  { id: 'row_1', cells: { kpi: { value: 'Audit Findings', formula: '', computed: null } } },
  { id: 'row_2', cells: { kpi: { value: 'Customer Complaints', formula: '', computed: null } } },
  { id: 'row_3', cells: { kpi: { value: 'CAPA Closure', formula: '', computed: null } } },
  { id: 'row_4', cells: { kpi: { value: 'Training Completion', formula: '', computed: null } } },
];

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildDefaultColumns() {
  return cloneValue(DEFAULT_COLUMNS);
}

function buildDefaultRows() {
  return recomputeTable(buildDefaultColumns(), cloneValue(DEFAULT_ROWS));
}

function buildDraft({ departmentId, departmentName, period, year, month, index, record = null }) {
  const columns = record?.columns?.length ? cloneValue(record.columns) : buildDefaultColumns();
  const rows = recomputeTable(columns, record?.rows?.length ? cloneValue(record.rows) : buildDefaultRows());

  return {
    localId: record?.id || genId('draft'),
    id: record?.id || null,
    department_id: departmentId,
    department_name: departmentName,
    period,
    year,
    month,
    title: record?.title || `${departmentName} KPI Table ${index + 1}`,
    columns,
    rows,
  };
}

export default function DataEntry() {
  const { user } = useOutletContext();
  const location = useLocation();
  const [drafts, setDrafts] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const highlightTimeoutRef = useRef(null);
  const initialViewState = useMemo(() => location.state?.openTable || null, [location.state]);
  const [pendingOpenTableId, setPendingOpenTableId] = useState(initialViewState?.tableId || '');

  const isAdmin = user?.role === 'admin';
  const deptId = isAdmin ? selectedDeptId : user?.department_id;
  const deptName = isAdmin
    ? departments.find((department) => department.id === selectedDeptId)?.name || ''
    : (user?.department_name || user?.full_name || '');
  const period = `${year}-${String(month).padStart(2, '0')}`;

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    if (!initialViewState) return;

    if (typeof initialViewState.year === 'number') {
      setYear(initialViewState.year);
    }
    if (typeof initialViewState.month === 'number') {
      setMonth(initialViewState.month);
    }
    if (isAdmin && initialViewState.departmentId) {
      setSelectedDeptId(initialViewState.departmentId);
    }
  }, [initialViewState, isAdmin]);

  const loadTables = useCallback(async () => {
    if (!deptId) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const records = await localApi.entities.KPITable.filter({ department_id: deptId, period });
    const nextDrafts = records.length > 0
      ? records.map((record, index) => buildDraft({
          departmentId: deptId,
          departmentName: deptName,
          period,
          year,
          month,
          index,
          record,
        }))
      : [
          buildDraft({
            departmentId: deptId,
            departmentName: deptName,
            period,
            year,
            month,
            index: 0,
          }),
        ];

    setDrafts(nextDrafts);
    setLoading(false);
  }, [deptId, deptName, month, period, year]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let active = true;
    localApi.entities.Department.filter({ status: 'active' }).then((departmentList) => {
      if (!active) return;
      setDepartments(departmentList);
      if (departmentList.length > 0 && !selectedDeptId) {
        setSelectedDeptId(departmentList[0].id);
      }
    });

    return () => {
      active = false;
    };
  }, [isAdmin, selectedDeptId]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (!pendingOpenTableId || drafts.length === 0) return;

    const match = drafts.find((draft) => draft.id === pendingOpenTableId);
    if (!match) return;

    highlightTimeoutRef.current = setTimeout(() => {
      const element = document.getElementById(`table-${match.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setPendingOpenTableId('');
    }, 150);

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [drafts, pendingOpenTableId]);

  const updateDraft = useCallback((localId, updater) => {
    setDrafts((current) => current.map((draft) => {
      if (draft.localId !== localId) return draft;
      const nextDraft = typeof updater === 'function' ? updater(draft) : { ...draft, ...updater };
      return {
        ...nextDraft,
        columns: cloneValue(nextDraft.columns),
        rows: recomputeTable(nextDraft.columns, cloneValue(nextDraft.rows)),
      };
    }));
  }, []);

  const handleGridChange = useCallback((localId, nextGrid) => {
    updateDraft(localId, {
      columns: nextGrid.columns,
      rows: nextGrid.rows,
    });
  }, [updateDraft]);

  const handleAddTable = useCallback(() => {
    if (!deptId) return;

    setDrafts((current) => [
      ...current,
      buildDraft({
        departmentId: deptId,
        departmentName: deptName,
        period,
        year,
        month,
        index: current.length,
      }),
    ]);
  }, [deptId, deptName, month, period, year]);

  const handleSave = async (localId) => {
    const draft = drafts.find((entry) => entry.localId === localId);
    if (!draft || !deptId) return;

    setSavingId(localId);

    const payload = {
      department_id: deptId,
      department_name: deptName,
      period,
      year,
      month,
      title: draft.title.trim() || `${deptName} KPI Table`,
      columns: draft.columns,
      rows: recomputeTable(draft.columns, draft.rows),
    };

    let savedRecord;
    if (draft.id) {
      savedRecord = await localApi.entities.KPITable.update(draft.id, payload);
      toast.success('Table updated');
    } else {
      savedRecord = await localApi.entities.KPITable.create({ id: genId('table'), ...payload });
      toast.success('Table created');
    }

    setDrafts((current) => current.map((entry, index) => (
      entry.localId === localId
        ? buildDraft({
            departmentId: deptId,
            departmentName: deptName,
            period,
            year,
            month,
            index,
            record: savedRecord,
          })
        : entry
    )));
    setSavingId('');
  };

  const handleDelete = async (localId) => {
    const draft = drafts.find((entry) => entry.localId === localId);
    if (!draft) return;

    if (draft.id) {
      await localApi.entities.KPITable.delete(draft.id);
      toast.success('Table deleted');
    } else {
      toast.success('Draft removed');
    }

    setDrafts((current) => {
      const nextDrafts = current.filter((entry) => entry.localId !== localId);
      if (nextDrafts.length > 0) return nextDrafts;

      return [
        buildDraft({
          departmentId: deptId,
          departmentName: deptName,
          period,
          year,
          month,
          index: 0,
        }),
      ];
    });
  };

  if (!deptId && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">You are not assigned to any department.</p>
        <p className="text-xs text-muted-foreground mt-1">Please contact your admin.</p>
      </div>
    );
  }

  if (isAdmin && departments.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">No active departments found.</p>
        <p className="text-xs text-muted-foreground mt-1">Add departments first under the Departments menu.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Data Entry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deptName} - create one or more KPI tables for {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
            <SelectTrigger className="w-24 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((entry) => (
                <SelectItem key={entry} value={String(entry)}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((entry, index) => (
                <SelectItem key={entry} value={String(index + 1)}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddTable} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Table
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-3">
        <strong>Tips:</strong> You can now encode status per KPI based on each department's own target.
        {' '}Put a manual status like <code>Met Target</code>, or use a formula such as{' '}
        <code>=IF(C&gt;=B,"Met Target","Below Target")</code>.
        Every saved table here automatically feeds KPI Overview, Analytics, and the QMS Management Review Dashboard.
      </div>

      <div className="space-y-6">
        {drafts.map((draft, index) => {
          const summary = summarizeTable(draft);

          return (
            <section
              key={draft.localId}
              id={draft.id ? `table-${draft.id}` : undefined}
              className={`bg-card rounded-2xl border overflow-hidden ${
                draft.id && draft.id === pendingOpenTableId ? 'border-primary shadow-md shadow-primary/10' : 'border-border'
              }`}
            >
              <div className="px-5 py-4 border-b border-border flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Table2 className="w-4 h-4" />
                    <span>Table {index + 1}</span>
                    <span>•</span>
                    <span>{draft.id ? 'Saved' : 'Draft'}</span>
                  </div>
                  <Input
                    value={draft.title}
                    onChange={(event) => updateDraft(draft.localId, { title: event.target.value })}
                    className="h-10 max-w-xl text-sm font-semibold"
                    placeholder="Table title"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs">
                    <span className="text-muted-foreground">Rows:</span> <strong>{summary.rowCount}</strong>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs">
                    <span className="text-muted-foreground">Average Result:</span>{' '}
                    <strong>{summary.averageScore !== null ? `${summary.averageScore}%` : 'N/A'}</strong>
                  </div>
                  <Button size="sm" onClick={() => handleSave(draft.localId)} disabled={savingId === draft.localId} className="gap-2">
                    <Save className="w-4 h-4" />
                    {savingId === draft.localId ? 'Saving...' : 'Save Table'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(draft.localId)} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-border bg-muted/10">
                <div className="flex flex-wrap gap-2">
                  {summary.headerLabels.map((label) => (
                    <span key={`${draft.localId}_${label}`} className="px-2.5 py-1 rounded-full bg-background border border-border text-xs">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <KPIGrid
                columns={draft.columns}
                rows={draft.rows}
                onChange={(nextGrid) => handleGridChange(draft.localId, nextGrid)}
                allowColumnEditing
                allowColumnTypeEditing
                allowFormulaEditing
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
