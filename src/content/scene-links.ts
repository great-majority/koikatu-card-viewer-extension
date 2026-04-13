import {
	HONEYCOME_SERIES_TARGETS,
	type HoneycomeSeriesCounts,
	type HoneycomeSeriesTarget,
	honeycomeSeriesLabel,
} from "@/shared/honeycome-series";
import type { ParseSceneResponse, SceneConvertProgressMessage } from "@/types/messages";
import { sendConvertScene, sendDownloadSceneOriginal, sendParseScene } from "./bridge";

const PAGE_STYLE_ID = "koikatu-scene-tools-style";
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
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`;

const boundSceneLinks = new WeakSet<HTMLAnchorElement>();
const scenePanels = new Map<HTMLAnchorElement, ScenePanelState>();
let initialized = false;
let analysisQueue = Promise.resolve();

type ScenePanelState = {
	container: HTMLDivElement;
	title: HTMLDivElement;
	spinner: HTMLSpanElement;
	meta: HTMLDivElement;
	counts: HTMLDivElement;
	dirtyTailCheckbox: HTMLInputElement;
	dirtyTailLabel: HTMLSpanElement;
	buttons: HTMLButtonElement[];
	hasLoaded: boolean;
	isLoading: boolean;
	parseResult: ParseSceneResponse | null;
};

function isOfficialSceneListPage(): boolean {
	return (
		location.hostname === "honeycome-uploader.illgames.jp" &&
		location.pathname === "/list/scene"
	);
}

function isOfficialSceneDownloadUrl(url: string): boolean {
	try {
		const parsed = new URL(url, location.href);
		const pathImage = parsed.searchParams.get("path_image") ?? "";
		return (
			parsed.hostname === "honeycome-uploader.illgames.jp" &&
			parsed.pathname === "/list/scene" &&
			parsed.searchParams.get("mode") === "download" &&
			pathImage.includes("/upload/scene/image/")
		);
	} catch {
		return false;
	}
}

function ensurePageStyles(): void {
	if (document.getElementById(PAGE_STYLE_ID)) return;
	const style = document.createElement("style");
	style.id = PAGE_STYLE_ID;
	style.textContent = PAGE_STYLES;
	document.head.appendChild(style);
}

function formatCounts(counts: HoneycomeSeriesCounts): string[] {
	return HONEYCOME_SERIES_TARGETS.map(
		(target) => `${target} ${counts[target]}人`,
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	return `${(bytes / 1024).toFixed(1)}KB`;
}

function enqueueAnalysis(task: () => Promise<void>): void {
	analysisQueue = analysisQueue.then(task).catch(() => undefined);
}

function setButtonsDisabled(
	buttons: HTMLButtonElement[],
	disabled: boolean,
): void {
	for (const button of buttons) {
		button.disabled = disabled;
	}
}

function setScenePanelBusy(state: ScenePanelState, busy: boolean): void {
	state.spinner.hidden = !busy;
}

function isSceneConvertProgressMessage(
	message: unknown,
): message is SceneConvertProgressMessage {
	return (
		typeof message === "object" &&
		message !== null &&
		"action" in message &&
		message.action === "scene-convert-progress"
	);
}

function createActionButton(target: HoneycomeSeriesTarget): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "koikatu-scene-tools__button";
	button.textContent = `${target}へ保存`;
	button.title = honeycomeSeriesLabel(target);
	return button;
}

function getPanelInsertionAnchor(link: HTMLAnchorElement): Element {
	return (
		link.closest(".uploader__card-scene") ?? link.closest(".card-scene") ?? link
	);
}

function getPanelReferenceRect(link: HTMLAnchorElement): DOMRect {
	const anchor = getPanelInsertionAnchor(link);
	const frame = anchor.querySelector<HTMLElement>(".card-scene__frame");
	const frameRect = frame?.getBoundingClientRect();

	if (frameRect && frameRect.width > 0 && frameRect.height > 0) {
		return frameRect;
	}

	return anchor.getBoundingClientRect();
}

function positionScenePanel(
	link: HTMLAnchorElement,
	state: ScenePanelState,
): void {
	const rect = getPanelReferenceRect(link);
	const targetWidth = Math.min(rect.width, window.innerWidth - 32);
	state.container.style.width = `${Math.max(targetWidth, 240)}px`;
	const panelWidth = state.container.offsetWidth;
	const panelHeight = state.container.offsetHeight;
	const minLeft = window.scrollX + 16;
	const maxLeft = window.scrollX + window.innerWidth - panelWidth - 16;
	const minTop = window.scrollY + 16;
	const maxTop = window.scrollY + window.innerHeight - panelHeight - 16;
	const desiredLeft =
		window.scrollX + rect.left + (rect.width - panelWidth) / 2;
	const desiredTop = window.scrollY + rect.top + 16;
	const left = Math.min(
		Math.max(desiredLeft, minLeft),
		Math.max(minLeft, maxLeft),
	);
	const top = Math.min(Math.max(desiredTop, minTop), Math.max(minTop, maxTop));

	state.container.style.left = `${left}px`;
	state.container.style.top = `${top}px`;
}

function closeAllScenePanels(): void {
	for (const state of scenePanels.values()) {
		state.container.hidden = true;
	}
}

function isManagedSceneUiTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Node)) return false;

	for (const state of scenePanels.values()) {
		if (state.container.contains(target)) {
			return true;
		}
	}

	return false;
}

function createScenePanel(link: HTMLAnchorElement): ScenePanelState {
	const container = document.createElement("div");
	container.className = "koikatu-scene-tools";
	container.hidden = true;

	const title = document.createElement("div");
	title.className = "koikatu-scene-tools__title";
	title.textContent = "シーン解析中...";

	const status = document.createElement("div");
	status.className = "koikatu-scene-tools__status";

	const spinner = document.createElement("span");
	spinner.className = "koikatu-scene-tools__spinner";
	spinner.ariaHidden = "true";

	const meta = document.createElement("div");
	meta.className = "koikatu-scene-tools__meta";
	meta.textContent = "シーンを解析しています…";
	status.appendChild(spinner);
	status.appendChild(meta);

	const counts = document.createElement("div");
	counts.className = "koikatu-scene-tools__counts";

	const options = document.createElement("label");
	options.className = "koikatu-scene-tools__options";

	const dirtyTailCheckbox = document.createElement("input");
	dirtyTailCheckbox.type = "checkbox";
	dirtyTailCheckbox.disabled = true;

	const dirtyTailLabel = document.createElement("span");
	dirtyTailLabel.textContent = "末尾HTMLを確認中";

	options.appendChild(dirtyTailCheckbox);
	options.appendChild(dirtyTailLabel);

	const actions = document.createElement("div");
	actions.className = "koikatu-scene-tools__actions";

	const buttons = HONEYCOME_SERIES_TARGETS.map((target) =>
		createActionButton(target),
	);
	setButtonsDisabled(buttons, true);
	for (const button of buttons) {
		actions.appendChild(button);
	}

	container.appendChild(title);
	container.appendChild(status);
	container.appendChild(counts);
	container.appendChild(options);
	container.appendChild(actions);
	container.addEventListener("click", (event) => {
		event.stopPropagation();
	});
	document.body.appendChild(container);

	const state: ScenePanelState = {
		container,
		title,
		spinner,
		meta,
		counts,
		dirtyTailCheckbox,
		dirtyTailLabel,
		buttons,
		hasLoaded: false,
		isLoading: false,
		parseResult: null,
	};

	for (const [index, button] of buttons.entries()) {
		const target = HONEYCOME_SERIES_TARGETS[index];
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();

			setScenePanelBusy(state, true);
			setButtonsDisabled(buttons, true);
			meta.classList.remove("koikatu-scene-tools__error");
			positionScenePanel(link, state);

			const pr = state.parseResult;
			const isDirect =
				pr !== null &&
				pr.characterCounts[target] === pr.characterTotal &&
				(!dirtyTailCheckbox.checked || !pr.hasDirtyHtmlTail);

			let result;
			if (isDirect) {
				meta.textContent = "ダウンロード中…";
				result = await sendDownloadSceneOriginal(link.href, target);
			} else {
				meta.textContent = `${target} へ変換しています…`;
				result = await sendConvertScene(
					link.href,
					target,
					dirtyTailCheckbox.checked,
				);
			}

			if (result.ok) {
				meta.textContent = `ファイル名: ${result.filename}`;
			} else {
				meta.classList.add("koikatu-scene-tools__error");
				meta.textContent = `変換失敗: ${result.error ?? "Unknown error"}`;
			}

			setScenePanelBusy(state, false);
			setButtonsDisabled(buttons, false);
			positionScenePanel(link, state);
		});
	}

	return state;
}

function ensureScenePanel(link: HTMLAnchorElement): ScenePanelState {
	const existing = scenePanels.get(link);
	if (existing) return existing;

	const state = createScenePanel(link);
	scenePanels.set(link, state);
	return state;
}

function handleSceneConvertProgress(
	message: SceneConvertProgressMessage,
): void {
	for (const [link, state] of scenePanels.entries()) {
		if (link.href !== message.url) continue;

		setScenePanelBusy(state, true);
		setButtonsDisabled(state.buttons, true);
		state.meta.classList.remove("koikatu-scene-tools__error");
		state.meta.textContent = `${message.target} へ変換中 (${message.processedCharacters}/${message.totalCharacters}人処理 / ${message.convertedCharacters}人変換)`;
		positionScenePanel(link, state);
	}
}

function loadScenePanel(link: HTMLAnchorElement, state: ScenePanelState): void {
	if (state.hasLoaded || state.isLoading) return;
	state.isLoading = true;

	enqueueAnalysis(async () => {
		const result = await sendParseScene(link.href);
		if (!result) {
			state.title.textContent = "シーン解析失敗";
			state.meta.classList.add("koikatu-scene-tools__error");
			state.meta.textContent = "このリンクのシーンを読み取れませんでした";
			state.dirtyTailLabel.textContent = "末尾HTMLの確認に失敗";
			state.isLoading = false;
			setScenePanelBusy(state, false);
			return;
		}

		state.title.textContent = result.title;
		state.meta.textContent = `Scene v${result.version} / キャラ合計 ${result.characterTotal}人`;
		state.counts.replaceChildren(
			...formatCounts(result.characterCounts).map((text) => {
				const badge = document.createElement("span");
				badge.className = "koikatu-scene-tools__badge";
				badge.textContent = text;
				return badge;
			}),
		);

		state.dirtyTailCheckbox.disabled = false;
		state.dirtyTailCheckbox.checked = result.hasDirtyHtmlTail;
		state.dirtyTailLabel.textContent = result.hasDirtyHtmlTail
			? `末尾HTMLを除外 (${formatBytes(result.dirtyHtmlTailBytes)})`
			: "末尾HTMLは検出されませんでした";
		state.parseResult = result;
		setButtonsDisabled(state.buttons, false);
		state.hasLoaded = true;
		state.isLoading = false;
		setScenePanelBusy(state, false);
		positionScenePanel(link, state);
	});
}

function bindSceneLink(link: HTMLAnchorElement): void {
	if (boundSceneLinks.has(link)) return;
	boundSceneLinks.add(link);

	link.addEventListener("click", (event) => {
		if (
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

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

function bindSceneLinksInRoot(root: ParentNode): void {
	const links = root.querySelectorAll<HTMLAnchorElement>("a[href]");
	for (const link of links) {
		if (isOfficialSceneDownloadUrl(link.href)) {
			bindSceneLink(link);
		}
	}
}

export function initSceneDownloadTools(): void {
	if (initialized || !isOfficialSceneListPage()) return;
	initialized = true;

	ensurePageStyles();
	bindSceneLinksInRoot(document);

	document.addEventListener(
		"pointerdown",
		(event) => {
			if (isManagedSceneUiTarget(event.target)) return;
			closeAllScenePanels();
		},
		true,
	);

	chrome.runtime.onMessage.addListener((message) => {
		if (!isSceneConvertProgressMessage(message)) return;
		handleSceneConvertProgress(message);
	});

	window.addEventListener("resize", () => {
		for (const [link, state] of scenePanels.entries()) {
			if (!state.container.hidden) {
				positionScenePanel(link, state);
			}
		}
	});

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement)) continue;

				if (
					node instanceof HTMLAnchorElement &&
					isOfficialSceneDownloadUrl(node.href)
				) {
					bindSceneLink(node);
				}
				bindSceneLinksInRoot(node);
			}
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
}
