import { useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/shared/utils/api-client'
import { contentApi } from '@/features/content/api/content-api'
import { brainApi } from '../api/brain-api'
import { GraphFilters, type GraphFilterValue } from './graph/GraphFilters'
import { GraphLegend } from './graph/GraphLegend'
import { GraphSearch } from './graph/GraphSearch'
import { GraphStats } from './graph/GraphStats'
import { NodeDetailsPanel } from './graph/NodeDetailsPanel'
import { NodeTooltip } from './graph/NodeTooltip'
import {
  getColorByType,
  getNodeIcon,
  normalizeNodeType,
  type GraphEdge,
  type GraphNode,
} from './graph/types'

export const KnowledgeGraph = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<GraphFilterValue>({
    type: '',
    tag: '',
    folder: '',
    dateFrom: '',
  })

  const graphQuery = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: () => brainApi.knowledgeGraph().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const listQuery = useQuery({
    queryKey: ['knowledge-list-graph'],
    queryFn: () => brainApi.knowledgeList().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (inboxItemId: string) => contentApi.delete(inboxItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-graph'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-list-graph'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] })
      setSelectedNodeId(null)
    },
  })

  const loading = graphQuery.isPending || listQuery.isPending
  const error = graphQuery.error ?? listQuery.error

  const baseNodes = useMemo<GraphNode[]>(() => {
    const graph = graphQuery.data
    const list = listQuery.data ?? []
    if (!graph) return []
    const detailsById = new Map(list.map((item) => [item.id, item]))
    const now = Date.now()
    return graph.nodes.map((node) => {
      const detail = detailsById.get(node.id)
      const createdAt = detail?.inboxCapturedAt || detail?.createdAt || new Date().toISOString()
      const createdAtMs = Number(new Date(createdAt))
      const isRecent = Number.isFinite(createdAtMs) && now - createdAtMs < 1000 * 60 * 60 * 24 * 7
      return {
        id: node.id,
        title: detail?.title || node.title || 'Untitled',
        type: normalizeNodeType(detail?.sourceContentType),
        tags: detail?.tags ?? [],
        createdAt,
        summary: detail?.summary || detail?.body || '',
        folder: detail?.folderName || 'Uncategorized',
        connectionCount: 0,
        isRecent,
      }
    })
  }, [graphQuery.data, listQuery.data])

  const filteredNodes = useMemo(() => {
    const fromDate = filters.dateFrom ? Number(new Date(filters.dateFrom)) : 0
    return baseNodes.filter((node) => {
      if (filters.type && node.type !== filters.type) return false
      if (filters.tag && !node.tags.includes(filters.tag)) return false
      if (filters.folder && node.folder !== filters.folder) return false
      if (fromDate && Number(new Date(node.createdAt)) < fromDate) return false
      return true
    })
  }, [baseNodes, filters])

  const filteredIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes])

  const graphEdges = useMemo<GraphEdge[]>(() => {
    const graph = graphQuery.data
    if (!graph) return []
    const byTag = new Map<string, string[]>()
    for (const node of filteredNodes) {
      for (const tag of node.tags) {
        const arr = byTag.get(tag) ?? []
        arr.push(node.id)
        byTag.set(tag, arr)
      }
    }
    const autoMap = new Map<string, GraphEdge>()
    for (const ids of byTag.values()) {
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const a = ids[i]
          const b = ids[j]
          const key = a < b ? `${a}|${b}` : `${b}|${a}`
          const prev = autoMap.get(key)
          autoMap.set(key, {
            source: a,
            target: b,
            sharedTagCount: (prev?.sharedTagCount ?? 0) + 1,
          })
        }
      }
    }
    const serverEdges = graph.edges
      .filter((e) => filteredIds.has(e.sourceItemId) && filteredIds.has(e.targetItemId))
      .map((e) => ({
        source: e.sourceItemId,
        target: e.targetItemId,
        sharedTagCount: 0,
      }))
    const all = new Map<string, GraphEdge>()
    for (const edge of serverEdges) {
      const key = edge.source < edge.target ? `${edge.source}|${edge.target}` : `${edge.target}|${edge.source}`
      all.set(key, edge)
    }
    for (const [key, edge] of autoMap.entries()) {
      const prev = all.get(key)
      all.set(key, { ...edge, sharedTagCount: (prev?.sharedTagCount ?? 0) + (edge.sharedTagCount ?? 0) })
    }
    return Array.from(all.values())
  }, [graphQuery.data, filteredIds, filteredNodes])

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const edge of graphEdges) {
      const s = String(edge.source)
      const t = String(edge.target)
      ;(map.get(s) ?? map.set(s, new Set()).get(s)!).add(t)
      ;(map.get(t) ?? map.set(t, new Set()).get(t)!).add(s)
    }
    return map
  }, [graphEdges])

  const nodes = useMemo(() => {
    return filteredNodes.map((node) => ({
      ...node,
      connectionCount: neighborMap.get(node.id)?.size ?? 0,
    }))
  }, [filteredNodes, neighborMap])

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )
  const hoveredNode = useMemo(
    () => nodes.find((n) => n.id === hoveredNodeId) ?? null,
    [nodes, hoveredNodeId],
  )

  const highlightedIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const set = new Set<string>([selectedNodeId])
    for (const n of neighborMap.get(selectedNodeId) ?? []) set.add(n)
    return set
  }, [selectedNodeId, neighborMap])

  const graphData = useMemo(() => ({ nodes, links: graphEdges }), [nodes, graphEdges])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return nodes
      .filter((n) => n.title.toLowerCase().includes(q))
      .map((n) => ({ id: n.id, title: n.title }))
  }, [nodes, search])

  const typeOptions = useMemo(
    () =>
      Array.from(new Set(baseNodes.map((n) => n.type)))
        .sort()
        .map((v) => ({ value: v, label: v })),
    [baseNodes],
  )
  const tagOptions = useMemo(
    () =>
      Array.from(new Set(baseNodes.flatMap((n) => n.tags)))
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [baseNodes],
  )
  const folderOptions = useMemo(
    () =>
      Array.from(new Set(baseNodes.map((n) => n.folder)))
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [baseNodes],
  )

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-900 text-gray-400">Loading neural pathways...</div>
  }

  if (error) {
    return <div className="flex h-full w-full items-center justify-center text-red-500">{getErrorMessage(error)}</div>
  }

  if (!nodes.length) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-900 text-gray-400">No knowledge synapses formed yet.</div>
  }

  return (
    <div className="flex h-full min-h-[640px] flex-col gap-3 bg-[linear-gradient(180deg,#0b1020,#0a0e18)] p-3">
      <GraphSearch
        value={search}
        onChange={setSearch}
        suggestions={searchResults}
        onSelect={(id) => {
          const node = nodes.find((n) => n.id === id)
          if (!node) return
          setSelectedNodeId(id)
          setSearch(node.title)
          graphRef.current?.centerAt((node as any).x ?? 0, (node as any).y ?? 0, 600)
          graphRef.current?.zoom(2.2, 700)
        }}
      />
      <GraphFilters
        value={filters}
        onChange={setFilters}
        typeOptions={typeOptions}
        tagOptions={tagOptions}
        folderOptions={folderOptions}
      />
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden rounded-xl border border-gray-800 bg-[#050915]"
        onMouseMove={(e) => {
          const box = containerRef.current?.getBoundingClientRect()
          if (!box) return
          setTooltipPos({ x: e.clientX - box.left, y: e.clientY - box.top })
        }}
      >
        <GraphLegend />
        <GraphStats
          totalIdeas={nodes.length}
          totalConnections={graphEdges.length}
          totalTopics={tagOptions.length}
          updatedAt={new Date().toLocaleTimeString()}
        />
        <NodeTooltip node={hoveredNode} position={tooltipPos} />
        <NodeDetailsPanel
          node={selectedNode}
          open={!!selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onDelete={(node) => {
            const full = (listQuery.data ?? []).find((k) => k.id === node.id)
            if (full?.inboxItemId) deleteMutation.mutate(full.inboxItemId)
          }}
        />
      <ForceGraph2D
        ref={graphRef}
        width={containerRef.current?.clientWidth ?? 1200}
        height={containerRef.current?.clientHeight ?? 680}
        graphData={graphData as any}
        cooldownTicks={140}
        warmupTicks={100}
        d3VelocityDecay={0.22}
        d3AlphaDecay={0.03}
        linkDirectionalParticles={(link) => {
          const s = String((link as any).source?.id ?? (link as any).source)
          const t = String((link as any).target?.id ?? (link as any).target)
          return selectedNodeId && (s === selectedNodeId || t === selectedNodeId) ? 2 : 0
        }}
        linkDirectionalParticleSpeed={0.008}
        onNodeHover={(node) => setHoveredNodeId((node as { id?: string } | null)?.id ?? null)}
        onNodeClick={(node) => {
          const id = (node as { id?: string }).id
          if (!id) return
          setSelectedNodeId(id)
          graphRef.current?.centerAt((node as any).x ?? 0, (node as any).y ?? 0, 500)
          graphRef.current?.zoom(2.1, 650)
        }}
        nodeCanvasObject={(nodeObj, ctx, globalScale) => {
          const node = nodeObj as GraphNode & { x: number; y: number }
          const radius = 6 + Math.min(node.connectionCount, 12) * 1.5
          const selected = selectedNodeId === node.id
          const related = highlightedIds.has(node.id)
          const faded = selectedNodeId ? !related : false
          const hovered = hoveredNodeId === node.id
          const searched = !!search.trim() && node.title.toLowerCase().includes(search.trim().toLowerCase())
          const alpha = faded ? 0.16 : 1
          ctx.save()
          ctx.globalAlpha = alpha
          if (node.isRecent || selected || searched) {
            ctx.shadowBlur = selected ? 26 : 16
            ctx.shadowColor = getColorByType(node.type)
          }
          const scale = hovered ? 1.2 : selected ? 1.12 : 1
          const finalRadius = radius * scale
          ctx.beginPath()
          ctx.fillStyle = getColorByType(node.type)
          ctx.arc(node.x, node.y, finalRadius, 0, 2 * Math.PI)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.fillStyle = '#f8fafc'
          ctx.font = `${Math.max(9, 10 / globalScale)}px Inter, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(getNodeIcon(node.type), node.x, node.y + 0.3)
          if (selected || hovered || searched) {
            ctx.fillStyle = '#cbd5e1'
            ctx.font = `${Math.max(8, 9 / globalScale)}px Inter, sans-serif`
            ctx.fillText(node.title.slice(0, 22), node.x, node.y + finalRadius + 8)
          }
          ctx.restore()
        }}
        linkColor={(link) => {
          const s = String((link as any).source?.id ?? (link as any).source)
          const t = String((link as any).target?.id ?? (link as any).target)
          if (!selectedNodeId) return 'rgba(148,163,184,0.28)'
          if (s === selectedNodeId || t === selectedNodeId) return 'rgba(99,102,241,0.88)'
          if (highlightedIds.has(s) && highlightedIds.has(t)) return 'rgba(99,102,241,0.45)'
          return 'rgba(100,116,139,0.09)'
        }}
        linkWidth={(link) => {
          const shared = Number((link as GraphEdge).sharedTagCount ?? 0)
          const s = String((link as any).source?.id ?? (link as any).source)
          const t = String((link as any).target?.id ?? (link as any).target)
          if (selectedNodeId && (s === selectedNodeId || t === selectedNodeId)) return 2.2
          return Math.min(1.8, 0.7 + shared * 0.35)
        }}
        onEngineStop={() => {
          graphRef.current?.d3Force('link')?.distance((link: any) =>
            120 - Math.min(6, Number(link.sharedTagCount ?? 0)) * 10,
          )
        }}
      />
      </div>
    </div>
  )
}
