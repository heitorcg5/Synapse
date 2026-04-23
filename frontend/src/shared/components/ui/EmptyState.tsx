import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'

type Props = {
  icon: ReactNode
  title: string
  description: string
  actionLabel: string
  actionTo?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, actionTo, onAction }: Props) {
  return (
    <div className="mx-auto my-20 max-w-[420px] text-center">
      <div className="space-y-4">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-app-muted">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-app-text">{title}</h2>
        <p className="text-sm leading-relaxed text-app-muted">{description}</p>
        {actionTo ? (
          <Link to={actionTo} className="inline-flex no-underline">
            <Button>{actionLabel}</Button>
          </Link>
        ) : (
          <div className="inline-flex">
            <Button onClick={onAction}>{actionLabel}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
