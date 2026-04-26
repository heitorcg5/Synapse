export function GraphStats({
  totalIdeas,
  totalConnections,
  totalTopics,
  updatedAt,
}: {
  totalIdeas: number
  totalConnections: number
  totalTopics: number
  updatedAt: string
}) {
  return (
    <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[#0f1422]/80 px-3 py-2 text-xs text-slate-300 shadow-xl backdrop-blur-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-4">
        <p className="m-0"><span className="text-slate-500">Ideas:</span> {totalIdeas}</p>
        <p className="m-0"><span className="text-slate-500">Connections:</span> {totalConnections}</p>
        <p className="m-0"><span className="text-slate-500">Topics:</span> {totalTopics}</p>
        <p className="m-0"><span className="text-slate-500">Updated:</span> {updatedAt}</p>
      </div>
    </div>
  )
}
