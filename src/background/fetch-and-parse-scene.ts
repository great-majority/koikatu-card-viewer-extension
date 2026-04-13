import { gunzipSync, unzipSync } from "fflate";
import {
	parseHcScene,
	serializeHcScene,
	transformCard,
	walkSceneObjects,
} from "koikatu.js";
import {
	createEmptyHoneycomeSeriesCounts,
	type HoneycomeSeriesTarget,
	honeycomeSeriesFromHeader,
} from "@/shared/honeycome-series";
import { LRUCache } from "@/shared/lru-cache";
import type {
	ConvertSceneResponse,
	ParseSceneResponse,
	SceneConvertProgressMessage,
} from "@/types/messages";

const FETCH_TIMEOUT_MS = 5000;
const HTML_TAIL_PREFIXES = ["<?xml", "<!DOCTYPE html", "<html", "<body"];
const SCENE_CACHE_TTL_MS = 5 * 60 * 1000;
const SCENE_CACHE_MAX_ENTRIES = 50;
const GZIP_MAGIC = [0x1f, 0x8b];
const ZIP_LOCAL_FILE_HEADER_MAGIC = [0x50, 0x4b, 0x03, 0x04];

const sceneBytesCache = new LRUCache<string, Uint8Array>(
	SCENE_CACHE_MAX_ENTRIES,
);

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
	if (bytes.length < magic.length) return false;
	return magic.every((value, index) => bytes[index] === value);
}

function extractSceneBytesFromZip(bytes: Uint8Array): Uint8Array {
	const entries = unzipSync(bytes);
	for (const [fileName, data] of Object.entries(entries)) {
		if (!fileName.endsWith("/")) {
			return data;
		}
	}

	throw new Error("ZIP 内にシーンファイルが見つかりません");
}

function normalizeSceneBytes(bytes: Uint8Array): Uint8Array {
	if (hasMagic(bytes, GZIP_MAGIC)) {
		return gunzipSync(bytes);
	}
	if (hasMagic(bytes, ZIP_LOCAL_FILE_HEADER_MAGIC)) {
		return extractSceneBytesFromZip(bytes);
	}
	return bytes;
}

async function fetchSceneBytes(url: string): Promise<Uint8Array> {
	const cached = sceneBytesCache.get(url);
	if (cached) return cached;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const buf = await res.arrayBuffer();
		const bytes = normalizeSceneBytes(new Uint8Array(buf));
		sceneBytesCache.set(url, bytes, SCENE_CACHE_TTL_MS);
		return bytes;
	} finally {
		clearTimeout(timer);
	}
}

function looksLikeDirtyHtmlTail(data: Uint8Array | undefined): boolean {
	if (!data || data.length === 0) return false;
	const sample = new TextDecoder().decode(data.subarray(0, 256)).trimStart();
	return HTML_TAIL_PREFIXES.some((prefix) => sample.startsWith(prefix));
}

function summarizeCharacters(sceneBytes: Uint8Array): ParseSceneResponse {
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
		dirtyHtmlTailBytes: hasDirtyHtmlTail
			? (scene.unknownTailExtra?.length ?? 0)
			: 0,
	};
}

function getDownloadFilename(
	url: string,
	target: HoneycomeSeriesTarget,
): string {
	const parsed = new URL(url);
	const pathImage = parsed.searchParams.get("path_image");
	const candidate =
		pathImage?.split("/").pop() || parsed.pathname.split("/").pop();
	const baseName = candidate && candidate.length > 0 ? candidate : "scene.png";
	const normalizedBaseName = /\.(png|zip)$/i.test(baseName)
		? baseName.replace(/\.(png|zip)$/i, "")
		: baseName;

	return `${normalizedBaseName}-${target.toLowerCase()}.png`;
}

function bytesToDataUrl(data: Uint8Array): string {
	let binary = "";
	for (let index = 0; index < data.length; index += 1) {
		binary += String.fromCharCode(data[index]);
	}
	return `data:application/octet-stream;base64,${btoa(binary)}`;
}

async function notifySceneConvertProgress(
	tabId: number | undefined,
	message: SceneConvertProgressMessage,
): Promise<void> {
	if (tabId === undefined) return;

	try {
		await chrome.tabs.sendMessage(tabId, message);
	} catch {
		// Ignore closed tabs or missing content scripts.
	}
}

export async function fetchAndParseScene(
	url: string,
): Promise<ParseSceneResponse | null> {
	try {
		const bytes = await fetchSceneBytes(url);
		return summarizeCharacters(bytes);
	} catch {
		return null;
	}
}

export async function downloadSceneOriginal(
	url: string,
	target: HoneycomeSeriesTarget,
): Promise<ConvertSceneResponse> {
	try {
		const bytes = await fetchSceneBytes(url);
		const filename = getDownloadFilename(url, target);
		await chrome.downloads.download({
			url: bytesToDataUrl(bytes),
			filename,
			saveAs: false,
		});
		return { ok: true, filename, convertedCharacters: 0, strippedDirtyHtmlTail: false };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function convertAndDownloadScene(
	url: string,
	target: HoneycomeSeriesTarget,
	stripDirtyHtmlTail: boolean,
	progressTabId?: number,
): Promise<ConvertSceneResponse> {
	try {
		const originalBytes = await fetchSceneBytes(url);
		const scene = parseHcScene(originalBytes, {
			containsPng: true,
			decodeEmbeddedCards: true,
		});
		const hasDirtyHtmlTail = looksLikeDirtyHtmlTail(scene.unknownTailExtra);
		const entries = Array.from(walkSceneObjects(scene, { objectType: 0 }));
		const totalCharacters = entries.length;
		let convertedCharacters = 0;
		let processedCharacters = 0;

		await notifySceneConvertProgress(progressTabId, {
			action: "scene-convert-progress",
			url,
			target,
			processedCharacters,
			totalCharacters,
			convertedCharacters,
		});

		for (const entry of entries) {
			const card = entry.object.data.character;
			const source = honeycomeSeriesFromHeader(card?.header?.header);
			if (!card || !source) {
				throw new Error(
					"シーン内に Honeycome 系以外の埋め込みキャラがあります",
				);
			}
			if (source !== target) {
				entry.object.data.character = transformCard(card, target, {
					pngBytes: entry.object.data.characterPng,
				});
				convertedCharacters += 1;
			}
			processedCharacters += 1;
			await notifySceneConvertProgress(progressTabId, {
				action: "scene-convert-progress",
				url,
				target,
				processedCharacters,
				totalCharacters,
				convertedCharacters,
			});
		}

		const strippedDirtyHtmlTail = stripDirtyHtmlTail && hasDirtyHtmlTail;
		if (strippedDirtyHtmlTail) {
			delete scene.unknownTailExtra;
		}

		const outputBytes =
			convertedCharacters === 0 && !strippedDirtyHtmlTail
				? originalBytes
				: serializeHcScene(scene);
		const filename = getDownloadFilename(url, target);

		await chrome.downloads.download({
			url: bytesToDataUrl(outputBytes),
			filename,
			saveAs: false,
		});

		return {
			ok: true,
			filename,
			convertedCharacters,
			strippedDirtyHtmlTail,
		};
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
