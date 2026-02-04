const PNG_RE = /\.png(\?.*)?$/i;

export function isPngUrl(url: string): boolean {
	try {
		const pathname = new URL(url, location.href).pathname;
		return PNG_RE.test(pathname);
	} catch {
		return false;
	}
}

export function scanForPngElements(): HTMLElement[] {
	const results: HTMLElement[] = [];

	// <img> elements with .png src
	const imgs = document.querySelectorAll<HTMLImageElement>("img[src]");
	for (const img of imgs) {
		if (isPngUrl(img.src)) {
			results.push(img);
		}
	}

	// <a> elements with .png href
	const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
	for (const link of links) {
		if (isPngUrl(link.href)) {
			results.push(link);
		}
	}

	return results;
}

export function getPngUrl(el: HTMLElement): string | null {
	if (el instanceof HTMLImageElement && el.src && isPngUrl(el.src)) {
		return el.src;
	}
	if (el instanceof HTMLAnchorElement && el.href && isPngUrl(el.href)) {
		return el.href;
	}
	return null;
}
