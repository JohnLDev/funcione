import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils.js';

type AppLoadingProps = {
  className?: string;
  compact?: boolean;
  description?: string;
  label: string;
};

export function AppLoading({
  className,
  compact = false,
  description,
  label,
}: AppLoadingProps) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={cn(
        'grid w-full justify-items-center text-center',
        compact
          ? 'gap-2 py-3'
          : 'gap-4 rounded-2xl border border-border bg-card/88 p-5 shadow-sm sm:p-6',
        className,
      )}
      role="status"
    >
      <div
        className="relative flex h-16 w-16 items-center justify-center"
        data-testid="app-loading-sport-icon"
      >
        <span className="absolute h-full w-full rounded-full border border-primary/35 bg-primary/10 animate-[app-loading-ring_1.4s_ease-out_infinite]" />
        <span className="absolute h-11 w-11 rounded-full bg-accent/20 blur-md" />
        <Dumbbell
          aria-hidden="true"
          className="relative text-primary animate-[app-sport-loader_1.15s_ease-in-out_infinite]"
          size={30}
          strokeWidth={2.5}
        />
      </div>
      <div className="grid max-w-72 gap-1">
        <p className="text-sm font-black text-foreground">{label}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
