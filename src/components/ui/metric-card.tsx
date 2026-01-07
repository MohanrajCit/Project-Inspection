import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
  success: 'bg-gradient-to-br from-success/10 to-success/5 border-success/20',
  warning: 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20',
  danger: 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/20 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-destructive/20 text-destructive',
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'metric-card border',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label">{title}</p>
          <p className="metric-value mt-2">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-sm mt-2 font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            iconVariantStyles[variant]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
