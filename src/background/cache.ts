import { LRUCache } from "@/shared/lru-cache";
import type { ParseResponse } from "@/types/messages";

const NEGATIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 200;

type CacheEntry =
	| { kind: "negative" }
	| { kind: "summary"; data: ParseResponse };

const cache = new LRUCache<string, CacheEntry>(MAX_ENTRIES);

export function getCachedCheck(url: string): boolean | undefined {
	const entry = cache.get(url);
	if (!entry) return undefined;
	if (entry.kind === "negative") return false;
	return true;
}

export function getCachedSummary(url: string): ParseResponse | undefined {
	const entry = cache.get(url);
	if (!entry || entry.kind !== "summary") return undefined;
	return entry.data;
}

export function setNegative(url: string): void {
	cache.set(url, { kind: "negative" }, NEGATIVE_TTL_MS);
}

export function setSummary(url: string, data: ParseResponse): void {
	cache.set(url, { kind: "summary", data });
}
