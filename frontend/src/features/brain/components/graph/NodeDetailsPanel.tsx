import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GraphNode } from './types'

export function NodeDetailsPanel({
  node,
  open,
  onClose,
  onDelete,
}: {
  node: GraphNode | null
  open: boolean
  onClose: () => void
  onDelete: (node: GraphNode) => void
}) {
  return (
    <>
      <div
        className={`absolute inset-0 z-30 bg-black/45 transition-opacity duration-200 ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 z-40 flex h-full w-full max-w-[380px] flex-col border-l border-white/10 bg-[#0d111b]/95 p-5 shadow-2xl backdrop-blur-md transition-transform duration-250 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="m-0 text-base font-semibold text-white">{node?.title ?? 'Node details'}</h3>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-300 transition-colors hover:bg-white/10"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
        {node ? (
          <>
            <div className="space-y-2 text-sm text-slate-300">
              <p className="m-0"><span className="text-slate-400">Type:</span> {node.type}</p>
              <p className="m-0"><span className="text-slate-400">Created:</span> {new Date(node.createdAt).toLocaleString()}</p>
              <p className="m-0"><span className="text-slate-400">Folder:</span> {node.folder || '—'}</p>
              <p className="m-0"><span className="text-slate-400">Tags:</span> {node.tags.length ? node.tags.join(', ') : '—'}</p>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-slate-200">
              {node.summary || 'No summary available yet.'}
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
              <Link
                to={`/knowledge/${node.id}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white no-underline transition-colors hover:bg-white/10"
              >
                Open
              </Link>
              <Link
                to={`/knowledge/${node.id}?edit=1`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white no-underline transition-colors hover:bg-white/10"
              >
                Edit
              </Link>
              <button
                type="button"
                className="h-10 rounded-lg border border-red-400/30 bg-red-500/10 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20"
                onClick={() => onDelete(node)}
              >
                Delete
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}
