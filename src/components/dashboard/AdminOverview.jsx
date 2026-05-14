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

export default function AdminOverview() {
  const [tables, setTables] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localApi.entities.KPITable.list().then((records) => {
      setTables(records);
      setLoading(false);
    });
  }, []);

  const summaries = useMemo(() => summarizeTables(tables, {
    year,
    ...(month !== null ? { month } : {}),
  }), [month, tables, year]);

  const headerFrequency = useMemo(
    () => buildHeaderFrequency(summaries).sort((a, b) => b.value - a.value).slice(0, 8),
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
    () => buildMonthlyScoreTrend(tables, year).map((entry) => ({
      ...entry,
      monthLabel: MONTH_NAMES[entry.month - 1],
    })),
    [tables, year],
  );

  const totalRows = summaries.reduce((sum, summary) => sum + summary.rowCount, 0);
  const averageValues = summaries.map((summary) => summary.averageScore).filter((value) => value !== null);
  const overallAverage = averageValues.length > 0
    ? Math.round((averageValues.reduce((sum, value) => sum + value, 0) / averageValues.length) * 10) / 10
    : null;
  const uniqueHeaders = new Set(summaries.flatMap((summary) => summary.headerLabels)).size;
  const tableScoreData = summaries.map((summary) => ({
    name: summary.department_name,
    title: summary.title,
    score: summary.averageScore ?? 0,
  }));

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
          <h1 className="text-2xl font-bold tracking-tight">QMS Management Review Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Combined dashboard from all saved KPI tables, headers, and encoded result values
          </p>
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
        <ChartCard title="Monthly Result Trend" subtitle={`All saved KPI tables - ${year}`}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => value !== null ? `${value}%` : 'N/A'} />
              <Line type="monotone" dataKey="averageScore" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Result by Table" subtitle={month !== null ? `${MONTH_NAMES[month - 1]} ${year}` : `All months in ${year}`}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tableScoreData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, _name, payload) => [`${value}%`, payload?.payload?.title]} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {tableScoreData.map((entry, index) => (
                  <Cell key={`${entry.title}_${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Header Usage Across Tables">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={headerFrequency} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => `${value} table(s)`} />
              <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Share from KPI Results">
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

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold">Management Review Table Headers</h3>
            <p className="text-xs text-muted-foreground">Every saved table appears here together with its headers</p>
          </div>
          <p className="text-xs text-muted-foreground">{month !== null ? `${MONTH_NAMES[month - 1]} ${year}` : `All months in ${year}`}</p>
        </div>

        {summaries.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No saved KPI tables for this filter.</div>
        ) : (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <div key={summary.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{summary.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.department_name} • {MONTH_NAMES[summary.month - 1]} {summary.year}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {summary.rowCount} rows • {summary.averageScore !== null ? `${summary.averageScore}% average result` : 'No result yet'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {summary.headerLabels.map((label) => (
                    <span key={`${summary.id}_${label}`} className="px-2.5 py-1 rounded-full bg-muted/40 border border-border text-xs">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
