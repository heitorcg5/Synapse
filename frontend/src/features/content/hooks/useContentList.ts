import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'

const REFETCH_INTERVAL_MS = 6_000

export function useContentList() {
  return useQuery({
    queryKey: ['content-list'],
    queryFn: () => contentApi.list().then((res) => res.data),
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}
