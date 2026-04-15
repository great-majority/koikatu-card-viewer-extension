# Koikatu Card Viewer

[日本語](README.ja.md)

A Chrome extension that detects Koikatu/Honeycome character cards from PNG images on web pages and displays card info as an overlay. On the Honeycome official scene uploader list, it also shows HC / SV / AC character counts inside each scene and can download converted scene files.

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
- On the Honeycome official uploader scene list, automatically shows `HC / SV / AC` character counts per scene
- Converts embedded scene characters to `HC / SV / AC` and downloads the rebuilt scene
- Includes a checkbox to strip the dirty trailing HTML appended to official scene downloads
- Options page to toggle enable/disable, hover delay, and tooltip visibility

---

## Userscript

A standalone Tampermonkey/Greasemonkey userscript is also available in the [`userscript/`](userscript/) directory.

**[Honeycome Scene Converter](userscript/honeycome-scene-converter.user.js)** — works on the [Honeycome official scene uploader](https://honeycome-uploader.illgames.jp/list/scene) list page. Clicking a scene download link opens an analysis panel instead of downloading directly, showing character counts per title (HC / SV / AC) and letting you convert and download the scene for any of the three titles.

[Full documentation](/userscript/README.md)

- Runs on [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/)
- [Install from OpenUserJS](https://openuserjs.org/scripts/tropical-362827/%E3%83%8F%E3%83%8B%E3%82%AB%E3%83%A0%E3%82%B7%E3%83%BC%E3%83%B3%E3%83%87%E3%83%BC%E3%82%BF%E3%82%B3%E3%83%B3%E3%83%90%E3%83%BC%E3%82%BF%E3%83%BC)
- Conversion runs entirely in the browser (no external server)

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
  scene list ─parse─>  parseHcScene() + transformCard()
            <─ counts ─
  Shadow DOM overlay
```

- **3 Vite builds**: content script (IIFE), service worker (ESM), options page (HTML)
- **Service Worker** handles cross-origin fetch + koikatu.js card parsing / scene conversion
- **Shadow DOM (closed)** isolates overlay UI from page CSS
