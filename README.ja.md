# Koikatu Card Viewer

[English](README.md)

Webページ上のPNG画像からKoikatu/Honeycome系のキャラクターカードを検出し、カード情報をオーバーレイ表示するChrome拡張機能です。

## できること

ブラウザ上でKoikatu・Honeycomeのキャラカードを発見すると自動で読み込み、以下のようなツールチップを表示させます。

<img src="https://i.imgur.com/aljWIB0.png" width="50%">

ツールチップをクリックすると、更に詳しい画面が表示されます。

<img src="https://i.imgur.com/q0fWnYc.png" width="75%">

さらに、どのMODを使用しているのかもリスト表示することができます。

<img src="https://i.imgur.com/wv59pYm.png" width="75%">

## 機能

- `.png` の `<img>` / `<a>` 要素を自動スキャン (MutationObserver で動的追加にも対応)
- ホバーでツールチップ表示 (フェイス画像 + 名前 + プロダクト名)
- クリックで詳細パネル表示 (Sex, Birthday, Blocks, JSON エクスポート)
- 非カードPNGは軽量ヘッダーチェックで早期スキップ (LRU キャッシュ付き)
- Optionsページで有効/無効、ホバー遅延、ツールチップ表示の切り替え

## 必要なもの

- Node.js 18+
- [koikatu.js](https://github.com/great-majority/koikatu.js)

## ビルド

```bash
npm install
npm run build
```

`dist/` ディレクトリが生成されます。

## インストール

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」から `dist/` を選択

## アーキテクチャ

```
Content Script          Service Worker
  scan DOM  ──check──>  isCard() 軽量判定
            <─ bool ──
  hover/click ─parse─>  parseCardSummary()
            <─ data ──
  Shadow DOM で表示
```

- **3 つの Vite ビルド**: content script (IIFE), service worker (ESM), options page (HTML)
- **Service Worker** で cross-origin fetch + koikatu.js パースを実行
- **Shadow DOM (closed)** でページ CSS と干渉しない UI を描画
