import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fieldClassName } from '@/shared/components/ui/form-styles'

export function GraphSearch({
  value,
  onChange,
  suggestions,
  onSelect,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: Array<{ id: string; title: string }>
  onSelect: (id: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="relative z-0">
      <div className={`flex h-11 items-center gap-2 px-3 ${fieldClassName}`}>
        <Search size={15} className="shrink-0 text-app-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('graph.searchPlaceholder')}
          className="h-full w-full border-0 bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
        />
      </div>
      {value.trim() && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-11 z-10 max-h-56 overflow-auto rounded-lg border border-white/10 bg-[#0f1422] p-1 shadow-xl">
          {suggestions.slice(0, 10).map((node) => (
            <button
              key={node.id}
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-200 transition-colors hover:bg-white/10"
              onClick={() => onSelect(node.id)}
            >
              {node.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
