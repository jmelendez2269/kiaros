'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type StelloquySharedChatValue = {
  messages: UIMessage[]
  sendMessage: ReturnType<typeof useChat>['sendMessage']
  status: ReturnType<typeof useChat>['status']
  error: ReturnType<typeof useChat>['error']
}

const StelloquySharedChatContext = createContext<StelloquySharedChatValue | null>(null)

export function StelloquySharedChatProvider({ children }: { children: ReactNode }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/oracle/chat',
        fetch: async (input, init) => fetch(input, init),
      }),
    [],
  )
  const { messages, sendMessage, status, error } = useChat({ transport })

  const value = useMemo(
    () => ({ messages, sendMessage, status, error }),
    [messages, sendMessage, status, error],
  )

  return (
    <StelloquySharedChatContext.Provider value={value}>{children}</StelloquySharedChatContext.Provider>
  )
}

export function useStelloquySharedChat(): StelloquySharedChatValue | null {
  return useContext(StelloquySharedChatContext)
}
