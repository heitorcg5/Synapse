import { useQuery } from '@tanstack/react-query'
import type { ContentResponse } from '@/shared/types/api'
import { brainApi } from '../api/brain-api'

const REFETCH_INTERVAL_MS = 6_000

export function useInboxList() {
  return useQuery<ContentResponse[]>({
    queryKey: ['inbox-list'],
    queryFn: () => brainApi.inboxList().then((res) => res.data),
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}
