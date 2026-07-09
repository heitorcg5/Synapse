import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
          {title}
        </h1>
        {subtitle ? <p className="mb-0 mt-2 text-[15px] text-app-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
