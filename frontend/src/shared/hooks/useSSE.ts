import { useEffect, useState } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export function useSSE(token: string | null) {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!token) return

    // SSE connection with token in query param or header (EventSource does not support custom headers natively in browser without polyfill, so usually token is passed in query string or cookie. We will assume the backend supports a query param or auth cookie.
    // If backend uses Authorization header, we might need @microsoft/fetch-event-source
    // For simplicity, let's use standard EventSource assuming it works with current setup,
    // or we'll pass token via URL if needed.
    const url = `${BASE_URL}/notifications/stream?token=${token}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setEvents((prev) => [...prev, { type: event.type, data }])
      } catch (err) {
        console.error('SSE parsing error:', err)
      }
    }
    
    eventSource.addEventListener('JOB_UPDATE', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        setEvents((prev) => [...prev, { type: 'JOB_UPDATE', data }])
      } catch (e) {}
    })
    
    eventSource.addEventListener('JOB_COMPLETED', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        setEvents((prev) => [...prev, { type: 'JOB_COMPLETED', data }])
      } catch (e) {}
    })
    
    eventSource.addEventListener('JOB_FAILED', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        setEvents((prev) => [...prev, { type: 'JOB_FAILED', data }])
      } catch (e) {}
    })
    
    eventSource.addEventListener('JOB_STARTED', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        setEvents((prev) => [...prev, { type: 'JOB_STARTED', data }])
      } catch (e) {}
    })

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err)
      eventSource.close()
      // Note: EventSource auto-reconnects by default
    }

    return () => {
      eventSource.close()
    }
  }, [token])

  return events
}
