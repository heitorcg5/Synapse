type Option = { value: string; label: string }

export type GraphFilterValue = {
  type: string
  tag: string
  folder: string
  dateFrom: string
}

export function GraphFilters({
  value,
  onChange,
  typeOptions,
  tagOptions,
  folderOptions,
}: {
  value: GraphFilterValue
  onChange: (next: GraphFilterValue) => void
  typeOptions: Option[]
  tagOptions: Option[]
  folderOptions: Option[]
}) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
      <select
        value={value.type}
        onChange={(e) => onChange({ ...value, type: e.target.value })}
        className="h-10 rounded-lg border border-white/10 bg-[#0f1422]/80 px-3 text-sm text-slate-200"
      >
        <option value="">All types</option>
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={value.tag}
        onChange={(e) => onChange({ ...value, tag: e.target.value })}
        className="h-10 rounded-lg border border-white/10 bg-[#0f1422]/80 px-3 text-sm text-slate-200"
      >
        <option value="">All tags</option>
        {tagOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={value.folder}
        onChange={(e) => onChange({ ...value, folder: e.target.value })}
        className="h-10 rounded-lg border border-white/10 bg-[#0f1422]/80 px-3 text-sm text-slate-200"
      >
        <option value="">All folders</option>
        {folderOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        type="date"
        value={value.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        className="h-10 rounded-lg border border-white/10 bg-[#0f1422]/80 px-3 text-sm text-slate-200"
      />
    </div>
  )
}
