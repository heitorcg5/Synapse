import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'

export function useContentList() {
  return useQuery({
    queryKey: ['content-list'],
    queryFn: () => contentApi.list().then((res) => res.data),
  })
}
