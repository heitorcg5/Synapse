import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = HTMLAttributes<HTMLDivElement>

export function SurfaceContainer({ className, ...props }: Props) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111118] p-8',
        'shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
        className,
      )}
      {...props}
    />
  )
}
