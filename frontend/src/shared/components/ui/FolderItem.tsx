import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = {
  icon: ReactNode
  name: string
  count?: number
  active?: boolean
  onClick?: () => void
  className?: string
}

export function FolderItem({
  icon,
  name,
  count,
  active = false,
  onClick,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-[8px] px-3 text-left text-[0.84rem] font-medium transition-colors duration-150',
        active
          ? 'bg-[rgba(124,92,255,0.12)] text-[#E6E8EF]'
          : 'text-[#ADB3C0] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E6E8EF]',
        className,
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{name}</span>
      {count != null ? <span className="ml-auto text-[0.75rem] text-[#7E8495]">{count}</span> : null}
    </button>
  )
}
