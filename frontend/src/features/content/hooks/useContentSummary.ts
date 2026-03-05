import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'

export function useContentSummary(contentId: string | undefined) {
  return useQuery({
    queryKey: ['content-summary', contentId],
    queryFn: () => contentApi.getSummary(contentId!).then((res) => res.data),
    enabled: !!contentId,
    retry: false,
  })
}
