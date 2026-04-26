import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'

export function useContentSummary(inboxItemId: string | undefined) {
  return useQuery({
    queryKey: ['content-summary', inboxItemId],
    queryFn: () => contentApi.getSummary(inboxItemId!).then((res) => res.data),
    enabled: !!inboxItemId,
    retry: false,
  })
}
