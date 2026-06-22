// ============================================================
// Shared Types
// ============================================================

export type MessageRole = 'user' | 'assistant' | 'system'

export type Platform = 'chatgpt' | 'claude' | 'gemini' | 'unknown'

export interface ParsedMessage {
  id: string
  role: MessageRole
  text: string
  element: HTMLElement
  timestamp?: number
  index: number
}

export interface ParsedConversation {
  id: string
  messages: ParsedMessage[]
  url: string
}

// ============================================================
// Bookmark Model
// ============================================================

export interface Bookmark {
  id: string
  conversationId: string
  messageId: string
  conversationUrl: string
  title: string
  note: string
  tags: string[]
  createdAt: number
  updatedAt: number
  visitedAt?: number
  /** Snippet of the message text for display */
  snippet: string
  role: MessageRole
  /** Index of the message in the conversation (for virtual scroll fallback) */
  messageIndex?: number
  /** Which AI platform this bookmark is from */
  platform?: Platform
}

// ============================================================
// Chrome Message Passing
// ============================================================

export type MessageType =
  | 'BOOKMARK_ADDED'
  | 'BOOKMARK_REMOVED'
  | 'BOOKMARK_UPDATED'
  | 'GET_BOOKMARKS'
  | 'JUMP_TO_MESSAGE'
  | 'GET_CURRENT_CONVERSATION'

export interface ChromeMessage<T = unknown> {
  type: MessageType
  payload?: T
}

export interface JumpToMessagePayload {
  conversationId: string
  messageId: string
  conversationUrl: string
  messageIndex?: number
}

// ============================================================
// Events
// ============================================================

export type PageEvent =
  | { type: 'PageLoaded'; conversationId: string | null }
  | { type: 'ConversationChanged'; conversationId: string }
  | { type: 'MessageAdded'; message: ParsedMessage }
