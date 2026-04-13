// ==UserScript==
// @name         Honeycome Scene Converter
// @namespace    https://github.com/great-majority/koikatu-chrome-extension
// @version      0.1.1
// @description  HC/SV/AC character counts and scene conversion on Honeycome official uploader
// @author       tropical-362827
// @match        https://honeycome-uploader.illgames.jp/list/scene*
// @require      https://cdn.jsdelivr.net/npm/koikatu.js@0.1.5/dist/index.global.min.js
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js
// @grant        GM_xmlhttpRequest
// @connect      honeycome-uploader.illgames.jp
// @downloadURL  https://raw.githubusercontent.com/great-majority/koikatu-chrome-extension/main/userscript/honeycome-scene-converter.user.js
// @updateURL    https://raw.githubusercontent.com/great-majority/koikatu-chrome-extension/main/userscript/honeycome-scene-converter.user.js
// ==/UserScript==

/* global KoikatuJS, fflate */

(function () {
  'use strict';

  const { parseHcScene, serializeHcScene, transformCard, walkSceneObjects } = KoikatuJS;
  const { gunzipSync, unzipSync } = fflate;

  // ---------------------------------------------------------------------------
  // honeycome-series (src/shared/honeycome-series.ts より移植)
  // ---------------------------------------------------------------------------

  const HONEYCOME_SERIES_TARGETS = ['HC', 'SV', 'AC'];

  const HEADER_TO_TARGET = {
    '【HCChara】': 'HC',
    '【HCPChara】': 'HC',
    '【DCChara】': 'HC',
    '【SVChara】': 'SV',
    '【ACChara】': 'AC',
  };

  const TARGET_LABELS = {
    HC: 'Honeycome',
    SV: 'SummerVacationScramble',
    AC: 'Aicomi',
  };

  function createEmptyHoneycomeSeriesCounts() {
    return { HC: 0, SV: 0, AC: 0 };
  }

  /** @param {string|undefined} header */
  function honeycomeSeriesFromHeader(header) {
    if (!header) return null;
    return HEADER_TO_TARGET[header] ?? null;
  }

  function honeycomeSeriesLabel(target) {
    return TARGET_LABELS[target] ?? target;
  }

  // ---------------------------------------------------------------------------
  // Page styles (src/content/scene-links.ts の PAGE_STYLES より移植)
  // ---------------------------------------------------------------------------

  const PAGE_STYLE_ID = 'koikatu-scene-tools-style';
  const PAGE_STYLES = `
  .koikatu-scene-tools {
    position: absolute;
    z-index: 2147483000;
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    max-width: calc(100vw - 32px);
    border: 1px solid rgba(71, 94, 122, 0.25);
    border-radius: 10px;
    background: rgba(248, 250, 252, 0.96);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
    color: #0f172a;
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .koikatu-scene-tools[hidden] {
    display: none !important;
  }
  .koikatu-scene-tools__title {
    font-weight: 700;
    color: #111827;
  }
  .koikatu-scene-tools__status {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 18px;
  }
  .koikatu-scene-tools__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(148, 163, 184, 0.45);
    border-top-color: #2563eb;
    border-radius: 999px;
    flex: 0 0 auto;
    animation: koikatu-scene-spin 0.8s linear infinite;
  }
  .koikatu-scene-tools__spinner[hidden] {
    display: none !important;
  }
  .koikatu-scene-tools__meta {
    color: #475569;
    font-size: 12px;
  }
  .koikatu-scene-tools__counts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .koikatu-scene-tools__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background: #e2e8f0;
    color: #0f172a;
    font-weight: 600;
    font-size: 12px;
  }
  .koikatu-scene-tools__options {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #334155;
  }
  .koikatu-scene-tools__options input {
    margin: 0;
  }
  .koikatu-scene-tools__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .koikatu-scene-tools__button {
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #fff;
    color: #0f172a;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
  }
  .koikatu-scene-tools__button:hover:not(:disabled) {
    background: #f8fafc;
  }
  .koikatu-scene-tools__button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .koikatu-scene-tools__error {
    color: #b91c1c;
  }
  @keyframes koikatu-scene-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  `;

  function ensurePageStyles() {
    if (document.getElementById(PAGE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = PAGE_STYLE_ID;
    style.textContent = PAGE_STYLES;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Fetch + normalizeSceneBytes (src/background/fetch-and-parse-scene.ts より移植)
  // ---------------------------------------------------------------------------

  const GZIP_MAGIC = [0x1f, 0x8b];
  const ZIP_MAGIC  = [0x50, 0x4b, 0x03, 0x04];

  function hasMagic(bytes, magic) {
    if (bytes.length < magic.length) return false;
    return magic.every((v, i) => bytes[i] === v);
  }

  function extractSceneBytesFromZip(bytes) {
    const entries = unzipSync(bytes);
    for (const [name, data] of Object.entries(entries)) {
      if (!name.endsWith('/')) return data;
    }
    throw new Error('ZIP 内にシーンファイルが見つかりません');
  }

  function normalizeSceneBytes(bytes) {
    if (hasMagic(bytes, GZIP_MAGIC)) return gunzipSync(bytes);
    if (hasMagic(bytes, ZIP_MAGIC))  return extractSceneBytesFromZip(bytes);
    return bytes;
  }

  /** @returns {Promise<Uint8Array>} */
  function fetchBytes(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        onload(res) {
          if (res.status >= 200 && res.status < 300) {
            resolve(normalizeSceneBytes(new Uint8Array(res.response)));
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror(err) { reject(new Error(String(err))); },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Scene analysis (src/background/fetch-and-parse-scene.ts の summarizeCharacters より移植)
  // ---------------------------------------------------------------------------

  const HTML_TAIL_PREFIXES = ['<?xml', '<!DOCTYPE html', '<html', '<body'];

  function looksLikeDirtyHtmlTail(data) {
    if (!data || data.length === 0) return false;
    const sample = new TextDecoder().decode(data.subarray(0, 256)).trimStart();
    return HTML_TAIL_PREFIXES.some((prefix) => sample.startsWith(prefix));
  }

  function summarizeCharacters(sceneBytes) {
    const scene = parseHcScene(sceneBytes, {
      containsPng: true,
      decodeEmbeddedCards: true,
    });
    const characterCounts = createEmptyHoneycomeSeriesCounts();
    let characterTotal = 0;

    for (const entry of walkSceneObjects(scene, { objectType: 0 })) {
      const header = entry.object.data.character?.header?.header;
      const target = honeycomeSeriesFromHeader(header);
      if (!target) continue;
      characterCounts[target] += 1;
      characterTotal += 1;
    }

    const hasDirtyHtmlTail = looksLikeDirtyHtmlTail(scene.unknownTailExtra);

    return {
      title: scene.title,
      version: scene.version,
      characterCounts,
      characterTotal,
      hasDirtyHtmlTail,
      dirtyHtmlTailBytes: hasDirtyHtmlTail ? (scene.unknownTailExtra?.length ?? 0) : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Conversion (src/background/fetch-and-parse-scene.ts の convertAndDownloadScene より移植)
  // ---------------------------------------------------------------------------

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  function getDownloadFilename(url, target) {
    try {
      const u = new URL(url);
      const pathImage = u.searchParams.get('path_image');
      const candidate = pathImage?.split('/').pop() || u.pathname.split('/').pop();
      const baseName = (candidate && candidate.length > 0) ? candidate : 'scene.png';
      const stem = /\.(png|zip)$/i.test(baseName)
        ? baseName.replace(/\.(png|zip)$/i, '')
        : baseName;
      return `${stem}-${target.toLowerCase()}.png`;
    } catch {
      return `scene-${target.toLowerCase()}.png`;
    }
  }

  function downloadBytes(bytes, filename) {
    const blob = new Blob([bytes]);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }

  // ---------------------------------------------------------------------------
  // URL detection (src/content/scene-links.ts の isOfficialSceneDownloadUrl より移植)
  // ---------------------------------------------------------------------------

  function isOfficialSceneDownloadUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      const pathImage = parsed.searchParams.get('path_image') ?? '';
      return (
        parsed.hostname === 'honeycome-uploader.illgames.jp' &&
        parsed.pathname === '/list/scene' &&
        parsed.searchParams.get('mode') === 'download' &&
        pathImage.includes('/upload/scene/image/')
      );
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Panel (src/content/scene-links.ts の createScenePanel / positionScenePanel より移植)
  // ---------------------------------------------------------------------------

  const boundLinks = new WeakSet();
  const scenePanels = new Map();
  let analysisQueue = Promise.resolve();

  function enqueueAnalysis(task) {
    analysisQueue = analysisQueue.then(task).catch(() => undefined);
  }

  function setButtonsDisabled(buttons, disabled) {
    for (const b of buttons) b.disabled = disabled;
  }

  function getPanelReferenceRect(link) {
    const anchor = link.closest('.uploader__card-scene') ?? link.closest('.card-scene') ?? link;
    const frame = anchor.querySelector('.card-scene__frame');
    const frameRect = frame?.getBoundingClientRect();
    if (frameRect && frameRect.width > 0 && frameRect.height > 0) return frameRect;
    return anchor.getBoundingClientRect();
  }

  function positionScenePanel(link, state) {
    const rect = getPanelReferenceRect(link);
    const targetWidth = Math.min(rect.width, window.innerWidth - 32);
    state.container.style.width = `${Math.max(targetWidth, 240)}px`;
    const panelWidth = state.container.offsetWidth;
    const panelHeight = state.container.offsetHeight;
    const minLeft = window.scrollX + 16;
    const maxLeft = window.scrollX + window.innerWidth - panelWidth - 16;
    const minTop  = window.scrollY + 16;
    const maxTop  = window.scrollY + window.innerHeight - panelHeight - 16;
    const desiredLeft = window.scrollX + rect.left + (rect.width - panelWidth) / 2;
    const desiredTop  = window.scrollY + rect.top + 16;
    state.container.style.left = `${Math.min(Math.max(desiredLeft, minLeft), Math.max(minLeft, maxLeft))}px`;
    state.container.style.top  = `${Math.min(Math.max(desiredTop,  minTop),  Math.max(minTop,  maxTop))}px`;
  }

  function closeAllScenePanels() {
    for (const state of scenePanels.values()) {
      state.container.hidden = true;
    }
  }

  function isManagedSceneUiTarget(target) {
    if (!(target instanceof Node)) return false;
    for (const state of scenePanels.values()) {
      if (state.container.contains(target)) return true;
    }
    return false;
  }

  function createScenePanel(link) {
    const container = document.createElement('div');
    container.className = 'koikatu-scene-tools';
    container.hidden = true;

    const title = document.createElement('div');
    title.className = 'koikatu-scene-tools__title';
    title.textContent = 'シーン解析中...';

    const status = document.createElement('div');
    status.className = 'koikatu-scene-tools__status';

    const spinner = document.createElement('span');
    spinner.className = 'koikatu-scene-tools__spinner';
    spinner.ariaHidden = 'true';

    const meta = document.createElement('div');
    meta.className = 'koikatu-scene-tools__meta';
    meta.textContent = 'シーンを解析しています…';

    status.appendChild(spinner);
    status.appendChild(meta);

    const counts = document.createElement('div');
    counts.className = 'koikatu-scene-tools__counts';

    const optionsLabel = document.createElement('label');
    optionsLabel.className = 'koikatu-scene-tools__options';

    const dirtyTailCheckbox = document.createElement('input');
    dirtyTailCheckbox.type = 'checkbox';
    dirtyTailCheckbox.disabled = true;

    const dirtyTailLabel = document.createElement('span');
    dirtyTailLabel.textContent = '末尾HTMLを確認中';

    optionsLabel.appendChild(dirtyTailCheckbox);
    optionsLabel.appendChild(dirtyTailLabel);

    const actions = document.createElement('div');
    actions.className = 'koikatu-scene-tools__actions';

    const buttons = HONEYCOME_SERIES_TARGETS.map((target) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'koikatu-scene-tools__button';
      btn.textContent = `${target}へ保存`;
      btn.title = honeycomeSeriesLabel(target);
      btn.disabled = true;
      actions.appendChild(btn);
      return btn;
    });

    container.appendChild(title);
    container.appendChild(status);
    container.appendChild(counts);
    container.appendChild(optionsLabel);
    container.appendChild(actions);
    container.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(container);

    const state = {
      container, title, spinner, meta, counts,
      dirtyTailCheckbox, dirtyTailLabel, buttons,
      hasLoaded: false, isLoading: false, parseResult: null,
      cachedBytes: null,
    };

    for (const [i, btn] of buttons.entries()) {
      const target = HONEYCOME_SERIES_TARGETS[i];
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        spinner.hidden = false;
        setButtonsDisabled(buttons, true);
        meta.classList.remove('koikatu-scene-tools__error');
        positionScenePanel(link, state);

        const pr = state.parseResult;
        const isDirect =
          pr !== null &&
          pr.characterCounts[target] === pr.characterTotal &&
          (!dirtyTailCheckbox.checked || !pr.hasDirtyHtmlTail);

        try {
          const bytes = state.cachedBytes ?? await fetchBytes(link.href);
          state.cachedBytes = bytes;

          let outputBytes;
          let convertedCharacters = 0;

          if (isDirect) {
            meta.textContent = 'ダウンロード中…';
            outputBytes = bytes;
          } else {
            meta.textContent = `${target} へ変換しています…`;
            const scene = parseHcScene(bytes, {
              containsPng: true,
              decodeEmbeddedCards: true,
            });
            const entries = Array.from(walkSceneObjects(scene, { objectType: 0 }));
            for (const entry of entries) {
              const card = entry.object.data.character;
              const source = honeycomeSeriesFromHeader(card?.header?.header);
              if (!card || !source) throw new Error('Honeycome 系以外のキャラが含まれています');
              if (source !== target) {
                entry.object.data.character = transformCard(card, target, {
                  pngBytes: entry.object.data.characterPng,
                });
                convertedCharacters += 1;
              }
            }
            const shouldStrip = dirtyTailCheckbox.checked && pr?.hasDirtyHtmlTail;
            if (shouldStrip) delete scene.unknownTailExtra;
            outputBytes = (convertedCharacters === 0 && !shouldStrip)
              ? bytes
              : serializeHcScene(scene);
          }

          const filename = getDownloadFilename(link.href, target);
          downloadBytes(outputBytes, filename);
          meta.textContent = `ファイル名: ${filename}`;
        } catch (err) {
          meta.classList.add('koikatu-scene-tools__error');
          meta.textContent = `変換失敗: ${err.message}`;
          console.error('[HCConverter] 変換エラー:', err);
        }

        spinner.hidden = true;
        setButtonsDisabled(buttons, false);
        positionScenePanel(link, state);
      });
    }

    return state;
  }

  function ensureScenePanel(link) {
    const existing = scenePanels.get(link);
    if (existing) return existing;
    const state = createScenePanel(link);
    scenePanels.set(link, state);
    return state;
  }

  function loadScenePanel(link, state) {
    if (state.hasLoaded || state.isLoading) return;
    state.isLoading = true;

    enqueueAnalysis(async () => {
      try {
        const bytes = await fetchBytes(link.href);
        state.cachedBytes = bytes;
        const result = summarizeCharacters(bytes);

        state.title.textContent = result.title;
        state.meta.textContent = `Scene v${result.version} / キャラ合計 ${result.characterTotal}人`;

        state.counts.replaceChildren(
          ...HONEYCOME_SERIES_TARGETS.map((t) => {
            const badge = document.createElement('span');
            badge.className = 'koikatu-scene-tools__badge';
            badge.textContent = `${t} ${result.characterCounts[t]}人`;
            return badge;
          })
        );

        state.dirtyTailCheckbox.disabled = false;
        state.dirtyTailCheckbox.checked = result.hasDirtyHtmlTail;
        state.dirtyTailLabel.textContent = result.hasDirtyHtmlTail
          ? `末尾HTMLを除外 (${formatBytes(result.dirtyHtmlTailBytes)})`
          : '末尾HTMLは検出されませんでした';

        state.parseResult = result;
        setButtonsDisabled(state.buttons, false);
        state.hasLoaded = true;
      } catch (err) {
        state.title.textContent = 'シーン解析失敗';
        state.meta.classList.add('koikatu-scene-tools__error');
        state.meta.textContent = 'このリンクのシーンを読み取れませんでした';
        state.dirtyTailLabel.textContent = '末尾HTMLの確認に失敗';
        console.error('[HCConverter] 解析エラー:', err);
      }

      state.isLoading = false;
      state.spinner.hidden = true;
      positionScenePanel(link, state);
    });
  }

  // ---------------------------------------------------------------------------
  // Link binding (src/content/scene-links.ts の bindSceneLink より移植)
  // ---------------------------------------------------------------------------

  function bindSceneLink(link) {
    if (boundLinks.has(link)) return;
    boundLinks.add(link);

    link.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      e.stopPropagation();

      const state = ensureScenePanel(link);
      const wasOpen = !state.container.hidden;
      closeAllScenePanels();
      const shouldOpen = !wasOpen;
      state.container.hidden = !shouldOpen;
      if (shouldOpen) {
        positionScenePanel(link, state);
        loadScenePanel(link, state);
      }
    });
  }

  function bindSceneLinksInRoot(root) {
    const links = root.querySelectorAll('a[href]');
    for (const link of links) {
      if (isOfficialSceneDownloadUrl(link.href)) bindSceneLink(link);
    }
  }

  // ---------------------------------------------------------------------------
  // Init (src/content/scene-links.ts の initSceneDownloadTools より移植)
  // ---------------------------------------------------------------------------

  ensurePageStyles();
  bindSceneLinksInRoot(document);

  document.addEventListener('pointerdown', (e) => {
    if (isManagedSceneUiTarget(e.target)) return;
    closeAllScenePanels();
  }, true);

  window.addEventListener('resize', () => {
    for (const [link, state] of scenePanels.entries()) {
      if (!state.container.hidden) positionScenePanel(link, state);
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node instanceof HTMLAnchorElement && isOfficialSceneDownloadUrl(node.href)) {
          bindSceneLink(node);
        }
        bindSceneLinksInRoot(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
