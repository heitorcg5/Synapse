import { useEffect, useState, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { brainApi } from '../api/brain-api'

export const KnowledgeGraph = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await brainApi.knowledgeGraph()
        // Map nodes to the format expected by ForceGraph2D
        const graphData = {
          nodes: response.data.nodes.map(n => ({ id: n.id, title: n.title })),
          links: response.data.edges.map(e => ({ source: e.sourceItemId, target: e.targetItemId, relation: e.relationType }))
        }
        setData(graphData as any)
      } catch (err: any) {
        setError(err.message || 'Failed to load graph data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }
    window.addEventListener('resize', updateDimensions)
    updateDimensions()
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-900 text-gray-400">Loading neural pathways...</div>
  }

  if (error) {
    return <div className="flex h-full w-full items-center justify-center text-red-500">{error}</div>
  }

  if (!data || data.nodes.length === 0) {
    return <div className="flex h-full w-full items-center justify-center bg-gray-900 text-gray-400">No knowledge synapses formed yet.</div>
  }

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-950 overflow-hidden relative border border-gray-800 rounded-xl">
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={data as any}
        nodeLabel="title"
        nodeColor={() => '#60A5FA'} // tailwind blue-400
        nodeRelSize={6}
        linkColor={() => 'rgba(75, 85, 99, 0.4)'} // gray-600 with opacity
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.01}
        d3VelocityDecay={0.3}
      />
      <div className="absolute top-4 left-4 text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded">
        {data.nodes.length} nodes, {data.links ? (data.links as any).length : 0} connections
      </div>
    </div>
  )
}
