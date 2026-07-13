'use client'

import { SWRConfig } from 'swr'

export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      fetcher: (url: string) => fetch(url).then(r => r.json()),
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }}>
      {children}
    </SWRConfig>
  )
}
