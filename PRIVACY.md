# Privacy Policy — ChatMarks

**Last Updated:** June 24, 2026

ChatMarks ("the Extension") is a Chrome browser extension that allows users to bookmark messages in AI chat platforms including ChatGPT, Claude, and Gemini.

---

## 1. Data Collection

**ChatMarks does not collect any personal data.**

We do not collect, transmit, store on external servers, or share any information about you or your usage of the Extension. There are no analytics, telemetry, crash reports, or tracking of any kind.

---

## 2. Data Stored Locally

The Extension stores the following data **locally on your device only**, using Chrome's built-in `chrome.storage.local` API:

- Bookmarked message text snippets
- Conversation page URLs (so the extension can navigate back to the message)
- Timestamps of when bookmarks were created
- Optional user-added notes and tags
- The AI platform the bookmark was created on (ChatGPT, Claude, or Gemini)

This data **never leaves your device**. It is not synced to any cloud service, not sent to any server, and not accessible by the extension developer or any third party.

---

## 3. Permissions Explained

The Extension requests the following Chrome permissions. Each is strictly necessary for the Extension to function:

### `storage`

Used to save and retrieve your bookmarks locally on your device via `chrome.storage.local`. This is the only place your bookmark data is stored — no external database or server is involved.

### `tabs`

Used to navigate to the specific browser tab containing a bookmarked conversation and to scroll to the exact bookmarked message when you click "Jump to message" from the popup or side panel. The Extension reads tab URLs only to match them against saved bookmark URLs — it does not log, store, or transmit tab information.

### `sidePanel`

Enables the bookmark list to be displayed in Chrome's native side panel, giving you a persistent view of your bookmarks alongside the AI chat without needing to open a separate popup window.

### Host Permissions: `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`

Content scripts must be injected into these specific AI chat domains to:

- Detect and identify individual chat messages
- Render the bookmark button next to messages
- Enable the "jump to message" scroll and highlight functionality

Access is **strictly limited** to these four domains. The Extension does not request or have access to any other websites you visit.

---

## 4. Third-Party Services

ChatMarks does **not** use any third-party services, APIs, analytics platforms, advertising networks, or external libraries that transmit data off your device.

---

## 5. Data Sharing

We do not sell, trade, rent, or share your data with anyone — because we never have access to it in the first place. All data remains on your local device under your full control.

---

## 6. Data Deletion

You can delete all bookmarks at any time from within the Extension. You can also remove all stored data by uninstalling the Extension, which will clear all `chrome.storage.local` data associated with ChatMarks.

---

## 7. Children's Privacy

ChatMarks does not knowingly collect any information from children under the age of 13. The Extension does not collect any personal information from any user.

---

## 8. Changes to This Policy

If this privacy policy is updated, the "Last Updated" date at the top of this document will be revised. Continued use of the Extension after any changes constitutes acceptance of the updated policy.

---

## 9. Contact

If you have any questions about this privacy policy, please open an issue on the GitHub repository:

👉 [https://github.com/shebisabeen/chatmarks/issues](https://github.com/shebisabeen/chatmarks/issues)

---

*ChatMarks is an open-source project. You can review the full source code at [https://github.com/shebisabeen/chatmarks](https://github.com/shebisabeen/chatmarks).*
