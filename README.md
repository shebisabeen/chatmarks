# ChatMarks ⭐

Bookmark chat messages across **ChatGPT, Claude & Gemini** — all in one extension.

## Features

- **📌 Bookmark any message** — Click the bookmark button that appears in the action bar of any message on ChatGPT, Claude, or Gemini
- **🔍 Search bookmarks** — Search by title, message text, notes, or tags
- **🚀 Jump to message** — Click any bookmark in the popup to scroll directly to that message with a yellow highlight animation
- **🌐 Multi-platform** — Works across ChatGPT, Claude AI, and Google Gemini
- **🗂️ Platform filter tabs** — Filter bookmarks by platform (All / ChatGPT / Claude / Gemini)
- **✏️ Rename bookmarks** — Inline rename any bookmark title directly in the popup
- **🗑️ Delete with confirmation** — Two-click delete to prevent accidental removal
- **📋 In-chat bookmark panel** — A floating panel inside the chat shows all bookmarks for the current conversation
- **🌙 Dark/Light mode** — Automatically adapts to your system theme
- **💾 Persistent storage** — Bookmarks are saved locally using Chrome Storage API
- **🔄 Live sync** — Popup and in-chat panel update in real-time when bookmarks are added/removed
- **⚙️ Settings panel** — Version info, GitHub link, and developer profile
- **🪟 Side Panel support** — Available as a Chrome Side Panel on ChatGPT

## Supported Platforms

| Platform | URL |
|----------|-----|
| ChatGPT | `chatgpt.com`, `chat.openai.com` |
| Claude | `claude.ai` |
| Gemini | `gemini.google.com` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Manifest V3 |
| Language | TypeScript |
| Bundler | Vite + CRXJS |
| UI | React |
| Styling | Tailwind CSS v4 |
| Storage | Chrome Storage API |
| Icons | Platform icons + SVG |

## Project Structure

```
extension/
├── src/
│   ├── background/
│   │   └── index.ts              ← Service worker (message routing, side panel)
│   ├── content/
│   │   ├── index.tsx             ← Content script entry
│   │   ├── domAdapter.ts         ← Multi-platform DOM parser (ChatGPT, Claude, Gemini)
│   │   ├── pageDetector.ts       ← SPA navigation detection
│   │   ├── messageIdentifier.ts  ← Stable message IDs
│   │   ├── bookmarkManager.ts    ← Business logic
│   │   └── ui/
│   │       ├── BookmarkButton.tsx ← Injected bookmark button (per message)
│   │       ├── BookmarkPanel.tsx  ← Floating in-chat bookmark panel
│   │       ├── Toast.tsx          ← Notifications
│   │       └── highlighter.ts     ← Jump + highlight (virtual scroll aware)
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx               ← Main popup UI (platform tabs, search, settings)
│   │   └── components/
│   │       ├── BookmarkCard.tsx   ← Bookmark item with rename/delete
│   │       └── SearchBar.tsx
│   ├── storage/
│   │   └── bookmarkDB.ts         ← Chrome Storage wrapper
│   └── shared/
│       └── types.ts              ← Shared TypeScript types
├── public/
│   └── icons/                    ← Extension icons + platform icons
├── manifest.json
└── vite.config.ts
```

## Development

```bash
cd extension
npm install
npm run dev    # Development build with hot reload
npm run build  # Production build
```

## Loading the Extension

1. Run `npm run build` in the `extension/` directory
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `extension/dist` folder
6. Navigate to [chatgpt.com](https://chatgpt.com), [claude.ai](https://claude.ai), or [gemini.google.com](https://gemini.google.com) and start bookmarking!

## Architecture Notes

### Multi-Platform DOM Adapter
All platform-specific DOM selectors are isolated in `domAdapter.ts`. It supports ChatGPT, Claude, and Gemini with dedicated parsing configs per platform. If any platform changes their UI, only this single file needs updating.

### Shadow DOM
The bookmark button, in-chat panel, and toast notifications are all rendered inside Shadow DOM containers to prevent CSS conflicts with the host page's styles.

### In-Chat Bookmark Panel
A floating panel is injected into the page showing all bookmarks for the current conversation. It collapses to a small button and expands on click, allowing quick in-page navigation without opening the popup.

### Message ID Strategy
Message IDs are determined by priority:
1. Native `data-message-id` attribute (ChatGPT — most stable)
2. UUID from `data-testid`
3. Index-based ID with role (Claude, Gemini)
4. djb2 hash of message text + conversation ID + index (fallback)

### Virtual Scroll Handling
ChatGPT uses virtual scrolling — messages not near the viewport are removed from the DOM. The highlighter progressively scans the scroll container to force rendering of the target message before jumping to it.

### Cross-Conversation Jump
When jumping to a bookmark in a different conversation, the background service worker stores a pending jump in `chrome.storage.local` with a 30-second TTL, navigates the tab, and the content script picks it up on load.

### Platform Detection
The extension auto-detects the current platform from the URL and applies the correct DOM parsing strategy and conversation ID extraction logic.

<!-- ## Roadmap

- [ ] Tags with autocomplete
- [ ] Notes (Markdown supported)
- [ ] Collections/Folders
- [ ] Export (Markdown, JSON, CSV)
- [ ] Import/restore backups
- [ ] Keyboard shortcuts (Alt+B)
- [ ] Search inside conversation
- [ ] Chrome Sync storage -->
