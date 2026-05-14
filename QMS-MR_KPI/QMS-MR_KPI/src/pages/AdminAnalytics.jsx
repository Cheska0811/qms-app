import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import serverApi from '@/api/serverClient';
const localApi = serverApi;
import ChartCard from '../components/dashboard/ChartCard';
import PeriodFilter from '../components/dashboard/PeriodFilter';
import DepartmentSelector from '../components/dashboard/DepartmentSelector';
import { MONTH_NAMES, CHART_COLORS, formatNumber, formatPercent } from '@/lib/computations';
import { exportDashboardToPDF } from '@/utils/pdfExport';
import { buildHeaderFrequency, buildMonthlyScoreTrend, buildResultLabelSummary, buildStatusDistribution, flattenResultItems, isNeedsAttentionStatus, summarizeTables } from '@/lib/kpiTableAnalytics';
import { Button } from '@/components/ui/button';
import { FileDown, FileStack, Percent, Rows3, TriangleAlert } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminAnalytics() {
  const { user } = useOutletContext();
  const [tables, setTables] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(null);
  const [selectedDept, setSelectedDept] = useState('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      localApi.entities.KPITable.list(),
      localApi.entities.Department.list(),
    ]).then(([tableRecords, departmentList]) => {
      setTables(tableRecords);
      setDepartments(departmentList.filter((department) => department.status === 'active'));
      setLoading(false);
    });
  }, []);

  const selectedDepartmentId = selectedDept === 'all' ? null : selectedDept;
  const periodLabel = month ? `${MONTH_NAMES[month - 1]} ${year}` : `Full Year ${year}`;

  const summaries = useMemo(() => summarizeTables(tables, {
    year,
    ...(month !== null ? { month } : {}),
    ...(selectedDepartmentId ? { department_id: selectedDepartmentId } : {}),
  }), [month, selectedDepartmentId, tables, year]);

  const resultItems = useMemo(() => flattenResultItems(summaries), [summaries]);
  const resultLabelSummary = useMemo(
    () => buildResultLabelSummary(summaries).sort((a, b) => b.averageResult - a.averageResult),
    [summaries],
  );
  const statusDistribution = useMemo(() => buildStatusDistribution(resultItems, CHART_COLORS), [resultItems]);
  const headerFrequency = useMemo(
    () => buildHeaderFrequency(summaries).sort((a, b) => b.value - a.value).slice(0, 10),
    [summaries],
  );
  const monthlyTrend = useMemo(
    () => buildMonthlyScoreTrend(tables, year, selectedDepartmentId).map((entry) => ({
      ...entry,
      monthLabel: MONTH_NAMES[entry.month - 1],
    })),
    [selectedDepartmentId, tables, year],
  );

  const totalRows = resultItems.length;
  const overallAverage = totalRows > 0
    ? Math.round((resultItems.reduce((sum, item) => sum + item.resultValue, 0) / totalRows) * 10) / 10
    : null;
  const needsImprovementCount = resultItems.filter((item) => isNeedsAttentionStatus(item.status)).length;
  const topKpi = resultLabelSummary[0] || null;

  const departmentComparison = summaries.map((summary) => ({
    name: summary.department_name,
    table: summary.title,
    score: summary.averageScore ?? 0,
  }));

  const handleExport = async () => {
    setExporting(true);
    await exportDashboardToPDF({
      title: 'QMS Management Review Analytics',
      subtitle: `Saved KPI result analytics - ${periodLabel}`,
      stats: [
        { label: 'Tables', value: String(summaries.length) },
        { label: 'Result Items', value: String(totalRows) },
        { label: 'Average Result', value: overallAverage !== null ? formatPercent(overallAverage) : 'N/A' },
        { label: 'Needs Improvement', value: String(needsImprovementCount) },
      ],
      containerId: 'admin-charts-container',
    });
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Units Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Unified analytics and dashboard view using table result content</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DepartmentSelector departments={departments} value={selectedDept} onChange={setSelectedDept} />
          <PeriodFilter year={year} setYear={setYear} month={month} setMonth={setMonth} />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-2">
            <FileDown className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="Saved Tables">
          <div className="flex items-center gap-3">
            <FileStack className="w-5 h-5 text-primary" />
            <p className="text-2xl font-bold">{formatNumber(summaries.length)}</p>
          </div>
        </ChartCard>
        <ChartCard title="Result Items">
          <div className="flex items-center gap-3">
            <Rows3 className="w-5 h-5 text-primary" />
            <p className="text-2xl font-bold">{formatNumber(totalRows)}</p>
          </div>
        </ChartCard>
        <ChartCard title="Average Result">
          <div className="flex items-center gap-3">
            <Percent className="w-5 h-5 text-primary" />
            <p className="text-2xl font-bold">{overallAverage !== null ? formatPercent(overallAverage) : 'N/A'}</p>
          </div>
        </ChartCard>
        <ChartCard title="Needs Improvement">
          <div className="flex items-center gap-3">
            <TriangleAlert className="w-5 h-5 text-primary" />
            <p className="text-2xl font-bold">{formatNumber(needsImprovementCount)}</p>
          </div>
        </ChartCard>
      </div>

      {topKpi && (
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Best Performing KPI Content</p>
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xl font-semibold">{topKpi.name}</p>
              <p className="text-sm text-muted-foreground">{topKpi.count} result item(s) across saved tables</p>
            </div>
            <p className="text-3xl font-bold text-primary">{formatPercent(topKpi.averageResult)}</p>
          </div>
        </div>
      )}

      <div id="admin-charts-container" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Average Result by KPI Content" subtitle={periodLabel}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={resultLabelSummary.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="averageResult" radius={[4, 4, 0, 0]}>
                  {resultLabelSummary.slice(0, 10).map((entry, index) => (
                    <Cell key={`${entry.name}_${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Status Distribution from Results">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={92}
                  innerRadius={42}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
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
          <ChartCard title="Monthly Average Result Trend" subtitle={`Computed from saved tables - ${year}`}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => value !== null ? `${value}%` : 'N/A'} />
                <Line type="monotone" dataKey="averageScore" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tableCount" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Header Usage Across Tables">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={headerFrequency} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${value} table(s)`} />
                <Bar dataKey="value" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Result Average by Business Unit Table">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={departmentComparison}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, _name, payload) => [`${value}%`, payload?.payload?.table]} />
              <Bar dataKey="score" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
