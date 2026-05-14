import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, className }) {
  const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className={cn('bg-card rounded-xl border border-border p-5 animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-accent-foreground" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium', trendColor)}>
          <TrendIcon className="w-3 h-3" />
          <span>{Math.abs(trend).toFixed(1)}% vs last period</span>
        </div>
      )}
    </div>
  );
}