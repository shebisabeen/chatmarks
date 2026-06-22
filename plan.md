Project Structure
chatmarks/
│
├── extension/
│   ├── content/
│   ├── background/
│   ├── popup/
│   ├── sidepanel/
│   ├── options/
│   ├── assets/
│   └── utils/
│
├── shared/
│
├── docs/
│
└── README.md
Phase 1: Foundation
Module 1: Chrome Extension Setup
Goal

A working Manifest V3 extension.

Features
Manifest
Permissions
Content Script
Background Worker
Popup
Local Storage wrapper
Deliverables
manifest.json

background.js

content.js

popup.html

popup.js

storage.js
Module 2: ChatGPT Page Detection
Goal

Detect whether the current page is ChatGPT.

Supported:

chatgpt.com
chat.openai.com

Responsibilities

Detect URL
Detect when conversation changes
Detect SPA navigation
Emit events

Example

ConversationChanged

MessageAdded

PageLoaded
Module 3: DOM Parser

This is probably the most important module.

Goal:

Parse the current conversation.

Need:

Conversation

Messages[]

Each message:

id

role

text

element

timestamp (optional)

Example

[
  {
    id: "...",
    role: "assistant",
    text: "...",
    element: HTMLElement
  }
]

No UI yet.

Just parsing.

Phase 2: Bookmark Engine
Module 4: Message Identifier

Need a stable identifier.

Possible priority

Internal ChatGPT identifier
data-testid
URL anchor
Hash of message
Conversation + Index

The module decides.

API

getMessageId(message)
Module 5: Bookmark Database

Storage layer.

Bookmark model

{
    id,
    conversationId,
    messageId,
    title,
    note,
    tags,
    createdAt
}

Functions

save()

delete()

search()

list()

update()

Chrome storage first.

Later:

Sync.

Module 6: Bookmark Manager

Business logic.

Responsibilities

Create bookmark

Delete bookmark

Check bookmarked

Update

Toggle

No UI.

Phase 3: UI Injection
Module 7: Bookmark Button

Inject

⭐

into every message.

Requirements

Looks native
Doesn't interfere with ChatGPT
Dark mode
Light mode
Hover only

Click

↓

Bookmark.

Module 8: Toasts

Small notifications.

Bookmarked

Removed

Updated

Very lightweight.

Module 9: Jump to Bookmark

Given

Conversation

Message ID

↓

Scroll smoothly

↓

Highlight message

Animation

yellow fade
Phase 4: Popup
Module 10: Popup UI

Shows

Bookmarks

Search

Recent

Statistics

Click

↓

Jump.

Module 11: Search

Search by

title
tags
notes
message text

Fast local search.

Module 12: Recent Bookmarks

Sort

Newest

Oldest

Recently visited

Phase 5: Sidebar

Much nicer UX.

Module 13: Side Panel

Native Chrome Side Panel.

Contains

Folders

Bookmarks

Search

Tags
Module 14: Live Sync

When bookmark added

↓

Sidebar updates

Popup updates

No refresh.

Phase 6: Power Features
Module 15: Tags
#swift

#career

#security

Autocomplete.

Module 16: Notes

Each bookmark

↓

Optional note

Markdown supported.

Module 17: Collections
Interview

Research

Swift

Work

Ideas
Module 18: Export

Markdown

JSON

CSV

Module 19: Import

Restore backups.

Phase 7: Polish
Module 20: Settings
Theme
Sync
Backup
Highlight color
Auto-scroll
Keyboard shortcuts
Module 21: Keyboard Shortcuts

Example

Alt + B

Bookmark current message
Module 22: Search Inside Conversation

Instead of bookmarks only

Search entire conversation

↓

Bookmark directly

Module 23: Performance

Virtual scrolling

Lazy rendering

Cache

Debounce observers

Mutation optimization

Module 24: Testing

Test

Long chats
Deleted chats
Regenerated responses
Multiple tabs
Incognito
Different zoom levels
ChatGPT UI updates
Suggested Tech Stack
Layer	Technology
Extension	Manifest V3
Language	TypeScript
Bundler	Vite
UI	React
Styling	Tailwind CSS
Storage	Chrome Storage API
State	Zustand
Icons	Lucide React
Build	CRXJS + Vite
Testing	Vitest + Playwright
MVP Roadmap (2 to 3 Days)

If the goal is to validate the idea quickly, I'd build only these modules first:

✅ Extension Setup
✅ ChatGPT Detection
✅ DOM Parser
✅ Message Identifier
✅ Bookmark Storage
✅ Bookmark Button
✅ Popup with Bookmarks
✅ Jump to Message

That's enough to ship an initial version and gather user feedback. Features like tags, notes, folders, export, and AI summaries can come later based on what users actually ask for.

One suggestion before writing any code: spend a little time making the architecture resilient to ChatGPT UI changes. Create a dedicated DOM adapter module that is the only place responsible for finding conversations and messages in the page. If OpenAI changes the DOM in the future, you'll usually only need to update that single module instead of touching the entire codebase.