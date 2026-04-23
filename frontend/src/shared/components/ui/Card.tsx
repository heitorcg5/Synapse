import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-white/[0.06] bg-[#14141C] p-5',
        'shadow-[0_6px_18px_rgba(0,0,0,0.35)]',
        'transition-shadow duration-150 ease-in-out hover:shadow-[0_10px_24px_rgba(0,0,0,0.45)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: Props) {
  return <div className={cn('mb-4', className)} {...props} />
}

export function CardIcon({ className, ...props }: Props) {
  return (
    <div
      className={cn(
        'mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.02]',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: Props) {
  return <h3 className={cn('mb-2 text-base font-semibold text-app-text', className)} {...props} />
}

export function CardDescription({ className, ...props }: Props) {
  return <p className={cn('text-sm leading-relaxed text-app-muted', className)} {...props} />
}
