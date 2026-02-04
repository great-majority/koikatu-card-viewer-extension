# Koikatu Card Viewer

[日本語](README.ja.md)

A Chrome extension that detects Koikatu/Honeycome character cards from PNG images on web pages and displays card info as an overlay.

## What it does

When a Koikatu/Honeycome character card is found, it automatically loads the data and displays a tooltip like this:

<img src="https://i.imgur.com/aljWIB0.png" width="50%">

Click the tooltip to open a detailed view:

<img src="https://i.imgur.com/q0fWnYc.png" width="75%">

It can also list which mods are used by the character:

<img src="https://i.imgur.com/wv59pYm.png" width="75%">

## Install

1. Download the latest `koikatu-extension-vX.X.X.zip` from [Releases](https://github.com/great-majority/koikatu-card-viewer-extension/releases)
2. Extract the ZIP file
3. Open `chrome://extensions` in Chrome
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

## Features

- Auto-scans `<img>` / `<a>` elements with `.png` URLs (supports dynamically added elements via MutationObserver)
- Hover to show tooltip (name + product + MOD badge)
- Click tooltip to open detail panel (face image, sex, birthday, blocks, used mods, JSON export)
- Non-card PNGs are quickly rejected via lightweight header check (with LRU cache)
- Options page to toggle enable/disable, hover delay, and tooltip visibility

---

## Development

### Requirements

- Node.js 18+
- [koikatu.js](https://github.com/great-majority/koikatu.js)

### Build

```bash
npm install
npm run build
```

This generates the `dist/` directory.

### Install from Source

1. Build the project (see above)
2. Open `chrome://extensions` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` directory

### Release

To create a new release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will automatically build and publish the release with the extension ZIP attached.

### Architecture

```
Content Script          Service Worker
  scan DOM  ──check──>  isCard() lightweight check
            <─ bool ──
  hover     ──parse──>  parseCardSummary()
            <─ data ──
  Shadow DOM overlay
```

- **3 Vite builds**: content script (IIFE), service worker (ESM), options page (HTML)
- **Service Worker** handles cross-origin fetch + koikatu.js parsing
- **Shadow DOM (closed)** isolates overlay UI from page CSS
