import { TYPE_LABELS, getColorByType } from './types'

const TYPES = ['VIDEO', 'ARTICLE', 'NOTE', 'IMAGE', 'WEB'] as const

export function GraphLegend() {
  return (
    <div className="absolute right-4 top-4 z-20 rounded-xl border border-white/10 bg-[#0f1422]/80 p-3 text-xs text-slate-200 shadow-xl backdrop-blur-sm">
      <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Legend</p>
      <div className="space-y-1.5">
        {TYPES.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getColorByType(t) }}
            />
            <span>{TYPE_LABELS[t]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
