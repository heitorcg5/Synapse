import { useQuery } from '@tanstack/react-query'
import type { InboxItemResponse } from '@/shared/types/inbox.types'
import { brainApi } from '../api/brain-api'

const REFETCH_INTERVAL_MS = 6_000

export function useInboxList() {
  return useQuery<InboxItemResponse[]>({
    queryKey: ['inbox-list'],
    queryFn: () => brainApi.inboxList().then((res) => res.data),
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}
