import { useEffect, useMemo, useState } from 'react';
import serverApi from '@/api/serverClient';
const localApi = serverApi;
import StatCard from './StatCard';
import ChartCard from './ChartCard';
import PeriodFilter from './PeriodFilter';
import { MONTH_NAMES, CHART_COLORS, formatNumber, formatPercent } from '@/lib/computations';
import { buildHeaderFrequency, buildMonthlyScoreTrend, buildStatusDistribution, summarizeTables } from '@/lib/kpiTableAnalytics';
import { FileStack, LayoutPanelTop, Percent, Rows3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DepartmentDashboard({ user }) {
  const [tables, setTables] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.department_id) {
      setLoading(false);
      return;
    }

    localApi.entities.KPITable.filter({ department_id: user.department_id }).then((records) => {
      setTables(records);
      setLoading(false);
    });
  }, [user?.department_id]);

  const summaries = useMemo(() => summarizeTables(tables, {
    year,
    ...(month !== null ? { month } : {}),
    department_id: user?.department_id,
  }), [month, tables, user?.department_id, year]);

  const headerFrequency = useMemo(
    () => buildHeaderFrequency(summaries).sort((a, b) => b.value - a.value).slice(0, 6),
    [summaries],
  );
  const statusDistribution = useMemo(
    () => buildStatusDistribution(
      summaries.flatMap((summary) => summary.resultItems),
      CHART_COLORS,
    ),
    [summaries],
  );
  const trendData = useMemo(
    () => buildMonthlyScoreTrend(tables, year, user?.department_id).map((entry) => ({
      ...entry,
      monthLabel: MONTH_NAMES[entry.month - 1],
    })),
    [tables, user?.department_id, year],
  );

  const totalRows = summaries.reduce((sum, summary) => sum + summary.rowCount, 0);
  const averageValues = summaries.map((summary) => summary.averageScore).filter((value) => value !== null);
  const overallAverage = averageValues.length > 0
    ? Math.round((averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length) * 10) / 10
    : null;
  const uniqueHeaders = new Set(summaries.flatMap((summary) => summary.headerLabels)).size;
  const tableData = summaries.map((summary) => ({
    name: summary.title,
    score: summary.averageScore ?? 0,
  }));

  if (!user?.department_id) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">You are not assigned to any department yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Please contact your admin.</p>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.department_name || 'Department'} Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your saved KPI tables drive this management review dashboard</p>
        </div>
        <PeriodFilter year={year} setYear={setYear} month={month} setMonth={setMonth} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saved Tables" value={formatNumber(summaries.length)} icon={FileStack} />
        <StatCard title="KPI Rows" value={formatNumber(totalRows)} icon={Rows3} />
        <StatCard title="Average Result" value={overallAverage !== null ? formatPercent(overallAverage) : 'N/A'} icon={Percent} />
        <StatCard title="Tracked Headers" value={formatNumber(uniqueHeaders)} icon={LayoutPanelTop} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Result Trend" subtitle={`Connected KPI tables - ${year}`}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => value !== null ? `${value}%` : 'N/A'} />
              <Line type="monotone" dataKey="averageScore" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Result by Table">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tableData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="score" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Header Usage">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={headerFrequency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `${value} table(s)`} />
              <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={88}
                innerRadius={38}
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
    </div>
  );
}
