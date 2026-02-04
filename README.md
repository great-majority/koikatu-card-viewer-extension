# Koikatu Card Viewer

[日本語](README.ja.md)

A Chrome extension (Manifest V3) that detects Koikatu/Honeycome character cards in PNG images on web pages and displays card info via overlay.

## Features

- Auto-scans `<img>` / `<a>` elements with `.png` URLs (supports dynamically added elements via MutationObserver)
- Hover to show tooltip (name + product + MOD badge)
- Click tooltip to open detail panel (face image, sex, birthday, blocks, used mods, JSON export)
- Non-card PNGs are quickly rejected via lightweight header check (with LRU cache)
- Options page to toggle enable/disable, hover delay, and tooltip visibility

## Requirements

- Node.js 18+
- [koikatu.js](../koikatu.js) must exist at `../koikatu.js`

## Build

```bash
npm install
npm run build
```

This generates the `dist/` directory.

## Install

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` directory

## Architecture

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
