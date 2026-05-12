import { cn } from '@/lib/utils';

export default function ChartCard({ title, subtitle, children, className, actions }) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-5 animate-fade-in', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}