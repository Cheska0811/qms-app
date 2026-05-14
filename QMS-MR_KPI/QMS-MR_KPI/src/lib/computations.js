export function computeDepartmentMetrics(entry) {
  const revenue = Number(entry.revenue) || 0;
  const expenses = Number(entry.expenses) || 0;
  const headcount = Number(entry.headcount) || 1;

  const net_profit = revenue - expenses;
  const profit_margin = revenue > 0 ? ((net_profit / revenue) * 100) : 0;
  const revenue_per_employee = headcount > 0 ? (revenue / headcount) : 0;
  const expense_ratio = revenue > 0 ? ((expenses / revenue) * 100) : 0;

  return {
    net_profit: Math.round(net_profit * 100) / 100,
    profit_margin: Math.round(profit_margin * 100) / 100,
    revenue_per_employee: Math.round(revenue_per_employee * 100) / 100,
    expense_ratio: Math.round(expense_ratio * 100) / 100,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatPercent(value) {
  return `${(value || 0).toFixed(1)}%`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-PH').format(value || 0);
}

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const CHART_COLORS = [
  'hsl(234, 89%, 57%)',
  'hsl(162, 72%, 45%)',
  'hsl(43, 96%, 56%)',
  'hsl(0, 84%, 60%)',
  'hsl(280, 67%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(330, 70%, 55%)',
  'hsl(120, 50%, 45%)',
];