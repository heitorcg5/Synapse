import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'

const REFETCH_INTERVAL_MS = 5_000

export function useContent(id: string | undefined) {
  return useQuery({
    queryKey: ['content', id],
    queryFn: () => contentApi.getById(id!).then((res) => res.data),
    enabled: !!id,
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}
