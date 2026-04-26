import { Search } from 'lucide-react'

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
  return (
    <div className="relative z-20">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#0f1422]/80 px-3 text-slate-300 backdrop-blur-sm">
        <Search size={15} />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search ideas by title..."
          className="h-full w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>
      {value.trim() && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-11 max-h-56 overflow-auto rounded-lg border border-white/10 bg-[#0f1422] p-1 shadow-xl">
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
