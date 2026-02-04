import { isPngUrl } from "./scanner";

export function observeDOM(
	callback: (elements: HTMLElement[]) => void,
): MutationObserver {
	const observer = new MutationObserver((mutations) => {
		const newElements: HTMLElement[] = [];

		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement)) continue;

				// Check the node itself
				if (
					node instanceof HTMLImageElement &&
					node.src &&
					isPngUrl(node.src)
				) {
					newElements.push(node);
				} else if (
					node instanceof HTMLAnchorElement &&
					node.href &&
					isPngUrl(node.href)
				) {
					newElements.push(node);
				}

				// Check descendants
				const imgs = node.querySelectorAll<HTMLImageElement>("img[src]");
				for (const img of imgs) {
					if (isPngUrl(img.src)) newElements.push(img);
				}
				const links = node.querySelectorAll<HTMLAnchorElement>("a[href]");
				for (const link of links) {
					if (isPngUrl(link.href)) newElements.push(link);
				}
			}
		}

		if (newElements.length > 0) {
			callback(newElements);
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
	return observer;
}
