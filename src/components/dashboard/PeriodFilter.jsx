import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTH_NAMES } from '@/lib/computations';

export default function PeriodFilter({ year, setYear, month, setMonth }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2">
      <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month === null ? 'all' : String(month)} onValueChange={(v) => setMonth(v === 'all' ? null : Number(v))}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}