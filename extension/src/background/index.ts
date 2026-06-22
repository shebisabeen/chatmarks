/**
 * background/index.ts
 * ─────────────────────────────────────────────────────────────
 * Background service worker (Manifest V3).
 * ─────────────────────────────────────────────────────────────
 */

import type { ChromeMessage, JumpToMessagePayload } from '../shared/types'

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[ChatGPT Bookmarks] Extension installed')
  } else if (details.reason === 'update') {
    console.log('[ChatGPT Bookmarks] Extension updated to', chrome.runtime.getManifest().version)
  }
})

// ─── Side Panel ───────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isChatGPT =
      tab.url.includes('chatgpt.com') || tab.url.includes('chat.openai.com')

    if (isChatGPT) {
      chrome.sidePanel
        .setOptions({ tabId, path: 'src/popup/index.html', enabled: true })
        .catch(() => {})
    }
  }
})

// ─── Message Routing ──────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, sender, sendResponse) => {
    if (message.type === 'JUMP_TO_MESSAGE') {
      const payload = message.payload as JumpToMessagePayload

      // If the message came from the popup, route it to the active ChatGPT tab
      // If it came from a content script, it's already handled there
      if (!sender.tab) {
        // Came from popup — find the right tab
        chrome.tabs.query(
          { url: ['https://chatgpt.com/*', 'https://chat.openai.com/*'] },
          (tabs) => {
            if (tabs.length === 0) {
              // No ChatGPT tab — open one
              chrome.tabs.create({ url: payload.conversationUrl })
              sendResponse({ success: true, navigated: true })
              return
            }

            // Find the tab that matches the conversation
            const targetTab =
              tabs.find((t) => t.url?.includes(payload.conversationId)) ?? tabs[0]

            if (!targetTab.id) {
              sendResponse({ success: false, error: 'No tab ID' })
              return
            }

            const tabUrl = targetTab.url ?? ''
            const isOnConversation = tabUrl.includes(payload.conversationId)

            // Focus the tab first
            chrome.tabs.update(targetTab.id, { active: true })
            if (targetTab.windowId) {
              chrome.windows.update(targetTab.windowId, { focused: true })
            }

            if (!isOnConversation) {
              // Store the pending jump in chrome.storage.local with a short TTL
              // The content script will pick it up when the conversation loads
              const pendingJump = {
                messageId: payload.messageId,
                messageIndex: payload.messageIndex ?? 0,
                conversationId: payload.conversationId,
                expiresAt: Date.now() + 30000, // 30 second TTL
              }
              chrome.storage.local.set({ cbm_pending_jump: pendingJump }, () => {
                chrome.tabs.update(targetTab.id!, { url: payload.conversationUrl }, () => {
                  sendResponse({ success: true, navigated: true })
                })
              })
            } else {
              // Already on the right conversation — send to content script
              chrome.tabs.sendMessage(
                targetTab.id,
                { type: 'JUMP_TO_MESSAGE', payload },
                (response) => {
                  if (chrome.runtime.lastError) {
                    // Content script not ready — navigate to trigger reload
                    chrome.tabs.update(targetTab.id!, { url: payload.conversationUrl })
                    sendResponse({ success: true, navigated: true })
                  } else {
                    sendResponse(response ?? { success: false })
                  }
                },
              )
            }
          },
        )

        return true // async
      }
    }
  },
)
