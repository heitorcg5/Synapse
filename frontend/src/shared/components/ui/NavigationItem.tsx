import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

type Props = {
  to: string
  label: string
}

export function NavigationItem({ to, label }: Props) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link
      to={to}
      className={cn(
        'rounded-[10px] px-[14px] py-[6px] text-sm font-medium transition-all duration-150 ease-in-out',
        active
          ? 'bg-[rgba(124,92,255,0.12)] text-app-text'
          : 'text-app-muted hover:bg-[rgba(255,255,255,0.05)] hover:text-app-text',
      )}
    >
      {label}
    </Link>
  )
}
