import { KnowledgeGraph } from '../components/KnowledgeGraph'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function KnowledgeGraphPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/knowledge" className="rounded-full p-2 hover:bg-gray-800 text-gray-400 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Neural Graph</h1>
        </div>
        <p className="text-sm text-gray-400">Interactive visualization of your digital brain</p>
      </div>
      
      <div className="flex-1 min-h-[600px] w-full rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <KnowledgeGraph />
      </div>
    </div>
  )
}
