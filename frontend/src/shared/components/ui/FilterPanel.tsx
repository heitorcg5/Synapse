import type { ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'
import { Button } from '@/shared/components/ui/Button'

export type ActiveFilterChip = {
  id: string
  label: string
  onRemove: () => void
}

type Props = {
  open: boolean
  onToggle: () => void
  chips: ActiveFilterChip[]
  onClearAll?: () => void
  resultCount?: number
  children: ReactNode
}

export function FilterPanel({ open, onToggle, chips, onClearAll, resultCount, children }: Props) {
  const { t } = useTranslation()
  const hasActive = chips.length > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {typeof resultCount === 'number' ? (
            <span className="text-[0.82rem] text-app-muted">
              {t('ui.resultCount', { count: resultCount })}
            </span>
          ) : null}
          {hasActive && !open ? (
            <span className="text-[0.82rem] text-brand-cyan">{t('flashcards.filtersActive')}</span>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onToggle} className="inline-flex items-center gap-2">
          <SlidersHorizontal size={15} />
          {t('knowledge.filtersButton')}
        </Button>
      </div>

      {hasActive ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/35 bg-brand-purple/10 px-3 py-1 text-xs font-medium text-app-text transition-colors hover:bg-brand-purple/20"
            >
              {chip.label}
              <X size={12} className="text-app-muted" />
            </button>
          ))}
          {onClearAll ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-app-muted underline-offset-2 hover:text-app-text hover:underline"
            >
              {t('knowledge.clearFilters')}
            </button>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <SurfaceContainer className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] items-end gap-x-4 gap-y-3 p-4">
          {children}
        </SurfaceContainer>
      ) : null}
    </div>
  )
}
