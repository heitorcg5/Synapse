import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = HTMLAttributes<HTMLDivElement>

export function SectionContainer({ className, ...props }: Props) {
  return <section className={cn('mx-auto w-full max-w-[1200px] px-6', className)} {...props} />
}
