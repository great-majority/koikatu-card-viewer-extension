import { isCard, parseCard, parseCardSummary } from "koikatu.js";
import type { ParseFullResponse, ParseResponse } from "@/types/messages";
import {
	getCachedCheck,
	getCachedSummary,
	setNegative,
	setSummary,
} from "./cache";

const FETCH_TIMEOUT_MS = 5000;

async function fetchImageBytes(url: string): Promise<Uint8Array> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const buf = await res.arrayBuffer();
		return new Uint8Array(buf);
	} finally {
		clearTimeout(timer);
	}
}

function extractBlockImageData(
	product: string,
	// biome-ignore lint/suspicious/noExplicitAny: matches koikatu.js Card.blocks type
	blocks: Record<string, any>,
): Uint8Array | null {
	if (product === "【SVChara】") {
		return blocks.GameParameter_SV?.imageData instanceof Uint8Array
			? blocks.GameParameter_SV.imageData
			: null;
	}
	if (product === "【ACChara】") {
		return blocks.GameParameter_AC?.imageData instanceof Uint8Array
			? blocks.GameParameter_AC.imageData
			: null;
	}
	return null;
}

function uint8ToBase64DataUrl(data: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < data.length; i++) {
		binary += String.fromCharCode(data[i]);
	}
	return `data:image/png;base64,${btoa(binary)}`;
}

function serializeForTransfer(
	summary: ReturnType<typeof parseCardSummary>,
): ParseResponse {
	const result: ParseResponse = {
		product: summary.product,
		name: summary.name,
		birthday: summary.birthday,
		sex: summary.sex,
		hasKKEx: summary.hasKKEx,
		blocks: summary.blocks,
	};
	if (summary.header.faceImage) {
		result.faceImageDataUrl = uint8ToBase64DataUrl(summary.header.faceImage);
	}
	return result;
}

export async function fetchAndCheck(url: string): Promise<boolean> {
	const cached = getCachedCheck(url);
	if (cached !== undefined) return cached;

	try {
		const bytes = await fetchImageBytes(url);
		const result = isCard(bytes);
		if (!result) {
			setNegative(url);
		}
		return result;
	} catch {
		setNegative(url);
		return false;
	}
}

export async function fetchAndParse(
	url: string,
): Promise<ParseResponse | null> {
	const cached = getCachedSummary(url);
	if (cached) return cached;

	try {
		const bytes = await fetchImageBytes(url);
		if (!isCard(bytes)) {
			setNegative(url);
			return null;
		}
		const summary = parseCardSummary(bytes, { containsPng: true });
		const data = serializeForTransfer(summary);
		const needsBlockParse =
			summary.hasKKEx ||
			summary.product === "【SVChara】" ||
			summary.product === "【ACChara】";
		if (needsBlockParse) {
			try {
				const card = parseCard(bytes, {
					containsPng: true,
					decodeBlocks: true,
				});
				if (summary.hasKKEx) {
					const kkex = card.blocks.KKEx;
					if (kkex && typeof kkex === "object") {
						data.kkexKeys = Object.keys(kkex).sort();
					}
				}
				const blockImageData = extractBlockImageData(
					summary.product,
					card.blocks,
				);
				if (blockImageData) {
					data.faceImageDataUrl = uint8ToBase64DataUrl(blockImageData);
				}
			} catch {
				// Block extraction failed, continue without it
			}
		}
		setSummary(url, data);
		return data;
	} catch {
		setNegative(url);
		return null;
	}
}

export async function fetchAndParseFull(
	url: string,
): Promise<ParseFullResponse | null> {
	try {
		const bytes = await fetchImageBytes(url);
		const card = parseCard(bytes, {
			containsPng: true,
			decodeBlocks: true,
		});
		// Convert Uint8Array fields to arrays for JSON serialization
		const json = JSON.stringify(
			card,
			(_key, value) => {
				if (value instanceof Uint8Array) {
					return Array.from(value);
				}
				return value;
			},
			2,
		);
		return { json };
	} catch {
		return null;
	}
}
