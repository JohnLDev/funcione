import type { ComponentType, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils.js';

export function OptionChip({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ComponentType<{ 'aria-hidden'?: boolean; size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon aria-hidden size={18} /> : null}
        <span className="break-words">{label}</span>
      </span>
      {active ? <Check aria-hidden size={18} /> : null}
    </button>
  );
}

export function FieldGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
