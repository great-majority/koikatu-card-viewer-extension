export class LRUCache<K, V> {
	private map = new Map<K, { value: V; expireAt?: number }>();

	constructor(private maxSize: number) {}

	get(key: K): V | undefined {
		const entry = this.map.get(key);
		if (!entry) return undefined;
		if (entry.expireAt && Date.now() > entry.expireAt) {
			this.map.delete(key);
			return undefined;
		}
		// Move to end (most recently used)
		this.map.delete(key);
		this.map.set(key, entry);
		return entry.value;
	}

	set(key: K, value: V, ttlMs?: number): void {
		this.map.delete(key);
		if (this.map.size >= this.maxSize) {
			// Evict oldest (first) entry
			// biome-ignore lint/style/noNonNullAssertion: guaranteed by size check above
			const firstKey = this.map.keys().next().value!;
			this.map.delete(firstKey);
		}
		this.map.set(key, {
			value,
			expireAt: ttlMs ? Date.now() + ttlMs : undefined,
		});
	}

	has(key: K): boolean {
		return this.get(key) !== undefined;
	}

	delete(key: K): void {
		this.map.delete(key);
	}

	clear(): void {
		this.map.clear();
	}

	get size(): number {
		return this.map.size;
	}
}
