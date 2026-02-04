import type { Settings } from "@/types/settings";
import { showPanel } from "@/ui/panel";
import { hideTooltip, isTooltipHovered, showTooltip } from "@/ui/tooltip";
import { sendCheck, sendParse, sendParseFull } from "./bridge";
import { getPngUrl } from "./scanner";

const boundElements = new WeakSet<HTMLElement>();
let settings: Settings;

export function setSettings(s: Settings): void {
	settings = s;
}

export function bindElement(el: HTMLElement): void {
	if (boundElements.has(el)) return;
	boundElements.add(el);

	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	el.addEventListener("mouseenter", () => {
		if (!settings.enabled || !settings.showTooltipOnHover) return;
		const url = getPngUrl(el);
		if (!url) return;

		hoverTimer = setTimeout(async () => {
			const check = await sendCheck(url);
			if (!check.isCard) return;

			const data = await sendParse(url);
			if (!data) return;

			const rect = el.getBoundingClientRect();
			showTooltip(data, rect, () => {
				hideTooltip();
				showPanel(data, async () => {
					const full = await sendParseFull(url);
					return full?.json ?? null;
				});
			});
		}, settings.hoverDelay);
	});

	el.addEventListener("mouseleave", () => {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		// Delay to allow mouse to reach the tooltip
		setTimeout(() => {
			if (!isTooltipHovered()) hideTooltip();
		}, 100);
	});
}

export function bindElements(elements: HTMLElement[]): void {
	for (const el of elements) {
		bindElement(el);
	}
}
