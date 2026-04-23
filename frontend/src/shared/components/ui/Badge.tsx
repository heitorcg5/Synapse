import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Tone = 'default' | 'success' | 'warning' | 'error'

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone
}

export function Badge({ tone = 'default', className, ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tone === 'default' && 'border-brand-purple/45 bg-brand-purple/15 text-brand-cyan',
        tone === 'success' && 'border-app-success/45 bg-app-success/12 text-app-success',
        tone === 'warning' && 'border-app-warning/45 bg-app-warning/12 text-app-warning',
        tone === 'error' && 'border-app-error/45 bg-app-error/12 text-app-error',
        className,
      )}
      {...props}
    />
  )
}
