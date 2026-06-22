# ChatGPT Bookmarks ⭐

A Chrome extension to bookmark messages inside ChatGPT conversations.

## Features

- **⭐ Bookmark any message** — Click the star button that appears on hover next to any ChatGPT message
- **🔍 Search bookmarks** — Search by title, message text, notes, or tags
- **🚀 Jump to message** — Click any bookmark in the popup to scroll directly to that message with a yellow highlight animation
- **🌙 Dark/Light mode** — Automatically adapts to ChatGPT's theme
- **💾 Persistent storage** — Bookmarks are saved locally using Chrome Storage API
- **🔄 Live sync** — Popup updates in real-time when bookmarks are added/removed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Manifest V3 |
| Language | TypeScript |
| Bundler | Vite + CRXJS |
| UI | React |
| Styling | Tailwind CSS v4 |
| Storage | Chrome Storage API |
| Icons | Emoji (native) |

## Project Structure

```
extension/
├── src/
│   ├── background/
│   │   └── index.ts          ← Service worker
│   ├── content/
│   │   ├── index.tsx          ← Content script entry
│   │   ├── domAdapter.ts      ← ChatGPT DOM parser (isolated)
│   │   ├── pageDetector.ts    ← SPA navigation detection
│   │   ├── messageIdentifier.ts ← Stable message IDs
│   │   ├── bookmarkManager.ts ← Business logic
│   │   └── ui/
│   │       ├── BookmarkButton.tsx ← Injected ⭐ button
│   │       ├── Toast.tsx          ← Notifications
│   │       └── highlighter.ts     ← Jump + highlight
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx            ← Main popup UI
│   │   └── components/
│   │       ├── BookmarkCard.tsx
│   │       └── SearchBar.tsx
│   ├── storage/
│   │   └── bookmarkDB.ts      ← Chrome Storage wrapper
│   └── shared/
│       └── types.ts           ← Shared TypeScript types
├── public/
│   └── icons/                 ← Extension icons
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
6. Navigate to [chatgpt.com](https://chatgpt.com) and start bookmarking!

## Architecture Notes

### DOM Adapter Isolation
All ChatGPT DOM selectors are isolated in `domAdapter.ts`. If OpenAI changes their UI, only this single file needs updating.

### Shadow DOM
The bookmark button and toast notifications are rendered inside Shadow DOM containers to prevent CSS conflicts with ChatGPT's styles.

### Message ID Strategy
Message IDs are determined by priority:
1. Native `data-message-id` attribute (most stable)
2. UUID from `data-testid`
3. URL anchor hash
4. djb2 hash of message text + conversation ID + index

## Roadmap

- [ ] Tags with autocomplete
- [ ] Notes (Markdown supported)
- [ ] Collections/Folders
- [ ] Export (Markdown, JSON, CSV)
- [ ] Import/restore backups
- [ ] Chrome Side Panel
- [ ] Keyboard shortcuts (Alt+B)
- [ ] Search inside conversation
- [ ] Chrome Sync storage
