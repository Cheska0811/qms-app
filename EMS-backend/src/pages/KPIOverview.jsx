import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import serverApi from '@/api/serverClient';
import ChartCard from '@/components/dashboard/ChartCard';
import DepartmentSelector from '@/components/dashboard/DepartmentSelector';
import PeriodFilter from '@/components/dashboard/PeriodFilter';
import { MONTH_NAMES, CHART_COLORS, formatNumber, formatPercent } from '@/lib/computations';
import { buildHeaderFrequency, buildMonthlyScoreTrend, buildResultLabelSummary, buildStatusDistribution, flattenResultItems, summarizeTables } from '@/lib/kpiTableAnalytics';
import { getStatusColor, normalizePercentValue } from '@/lib/formulaEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ClipboardList, FilePenLine, FileStack, Percent, Rows3, Trash2, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function renderTableCell(row, column) {
  const cell = row.cells?.[column.key];
  const rawValue = cell?.computed ?? cell?.value ?? '';

  if (column.type === 'status') {
    return rawValue ? (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(rawValue)}`}>
        {rawValue}
      </span>
    ) : '';
  }

  if (column.type === 'result') {
    const normalized = normalizePercentValue(rawValue);
    return normalized !== null ? `${normalized}%` : '';
  }

  return rawValue;
}

function CommentBox({ tableId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    serverApi.comments.list(tableId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [tableId, open]);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      const created = await serverApi.comments.create({
        table_id: tableId,
        user_id: user.id,
        user_name: user.full_name || user.email,
        comment: text.trim(),
      });
      setComments((prev) => [...prev, created]);
      setText('');
    } catch {
      toast.error('Failed to send comment');
    }
  };

  const handleDelete = async (id) => {
    try {
      await serverApi.comments.delete(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        {open ? 'Hide comments' : `Comments ${comments.length > 0 ? `(${comments.length})` : ''}`}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{c.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5">{c.comment}</p>
                  </div>
                  {(user.role === 'admin' || user.id === c.user_id) && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={user.role === 'admin' ? 'Leave feedback for this table...' : 'Add a comment...'}
              className="flex-1 h-8 text-xs border border-border rounded-lg px-3 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" className="h-8 px-3" onClick={handleSend} disabled={!text.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KPIOverview() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [allTables, setAllTables] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedDept, setSelectedDept] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      serverApi.entities.KPITable.list(),
      serverApi.entities.Department.list(),
    ]).then(([tables, departmentList]) => {
      setAllTables(tables);
      setDepartments(departmentList.filter((d) => d.status === 'active'));
      setLoading(false);
    });
  }, []);

  const visibleDepartmentId = user?.role === 'admin'
    ? (selectedDept === 'all' ? null : selectedDept)
    : user?.department_id;
  const periodLabel = month !== null ? `${MONTH_NAMES[month - 1]} ${year}` : `All months in ${year}`;

  const summaries = useMemo(() => summarizeTables(allTables, {
    year,
    ...(month !== null ? { month } : {}),
    ...(visibleDepartmentId ? { department_id: visibleDepartmentId } : {}),
  }), [allTables, month, visibleDepartmentId, year]);

  const resultItems = useMemo(() => flattenResultItems(summaries), [summaries]);
  const resultLabelSummary = useMemo(
    () => buildResultLabelSummary(summaries).sort((a, b) => b.averageResult - a.averageResult),
    [summaries],
  );
  const headerFrequency = useMemo(
    () => buildHeaderFrequency(summaries).sort((a, b) => b.value - a.value).slice(0, 8),
    [summaries],
  );
  const trendData = useMemo(
    () => buildMonthlyScoreTrend(allTables, year, visibleDepartmentId).map((entry) => ({
      ...entry,
      monthLabel: MONTH_NAMES[entry.month - 1],
    })),
    [allTables, visibleDepartmentId, year],
  );
  const statusDistribution = useMemo(() => buildStatusDistribution(resultItems, CHART_COLORS), [resultItems]);

  const totalRows = summaries.reduce((sum, s) => sum + s.rowCount, 0);
  const averageValues = resultItems.map((item) => item.resultValue);
  const overallAverage = averageValues.length > 0
    ? Math.round((averageValues.reduce((sum, v) => sum + v, 0) / averageValues.length) * 10) / 10
    : null;
  const uniqueHeaders = new Set(summaries.flatMap((s) => s.headerLabels)).size;

  const handleEditTable = (summary) => {
    navigate('/data-entry', {
      state: {
        openTable: {
          tableId: summary.id,
          departmentId: summary.department_id,
          year: summary.year,
          month: summary.month,
        },
      },
    });
  };

  const handleDeleteTable = async (summary) => {
    if (!window.confirm(`Delete "${summary.title}"? This cannot be undone.`)) return;
    try {
      await serverApi.entities.KPITable.delete(summary.id);
      setAllTables((prev) => prev.filter((t) => t.id !== summary.id));
      toast.success('Table deleted');
    } catch {
      toast.error('Failed to delete table');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Result values and KPI content from every saved table for {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === 'admin' && (
            <DepartmentSelector departments={departments} value={selectedDept} onChange={setSelectedDept} />
          )}
          <PeriodFilter year={year} setYear={setYear} month={month} setMonth={setMonth} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Saved Tables', icon: FileStack, value: formatNumber(summaries.length) },
          { label: 'Result Items', icon: Rows3, value: formatNumber(totalRows) },
          { label: 'Average Result', icon: Percent, value: overallAverage !== null ? formatPercent(overallAverage) : 'N/A' },
          { label: 'Unique Headers', icon: ClipboardList, value: formatNumber(uniqueHeaders) },
        ].map(({ label, icon: Icon, value }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <div className="mt-3 flex items-center gap-3">
              <Icon className="w-5 h-5 text-primary" />
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Average Result by KPI Content" subtitle={periodLabel}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={resultLabelSummary.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="averageResult" radius={[4, 4, 0, 0]}>
                {resultLabelSummary.slice(0, 10).map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution" subtitle="Derived from result values">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} innerRadius={42}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Average Trend" subtitle={`Connected to KPI Data Entry - ${year}`}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => v !== null ? `${v}%` : 'N/A'} />
              <Line type="monotone" dataKey="averageScore" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most Used Headers" subtitle="Headers from user-created tables">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={headerFrequency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v} table(s)`} />
              <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-sm font-medium">No saved KPI tables for this period.</p>
          <p className="text-xs text-muted-foreground mt-1">Create and save tables in KPI Data Entry first.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {summaries.map((summary) => (
            <section key={summary.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">{summary.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.department_name} — {MONTH_NAMES[summary.month - 1]} {summary.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleEditTable(summary)}>
                    <FilePenLine className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleDeleteTable(summary)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="w-12 border border-border/50 px-3 py-2 text-center text-muted-foreground">#</th>
                      {summary.columns
                        .filter((col) => col.key !== 'actual')
                        .map((column) => (
                          <th
                            key={`${summary.id}_${column.key}`}
                            className="min-w-32 border border-border/50 px-3 py-2 text-left font-medium"
                          >
                            {column.type === 'result' ? 'Actual' : (column.label || '(empty)')}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rows.map((row, rowIndex) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="border border-border/50 px-3 py-2 text-center text-muted-foreground bg-muted/20">
                          {rowIndex + 1}
                        </td>
                        {summary.columns
                          .filter((col) => col.key !== 'actual')
                          .map((column) => (
                            <td
                              key={`${row.id}_${column.key}`}
                              className={`border border-border/50 px-3 py-2 ${
                                column.type === 'number' || column.type === 'formula' || column.type === 'result'
                                  ? 'text-right font-mono'
                                  : column.type === 'status'
                                    ? 'text-center'
                                    : 'text-left'
                              }`}
                            >
                              {renderTableCell(row, column)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <CommentBox tableId={summary.id} user={user} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}