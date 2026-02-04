import type { ParseResponse } from "@/types/messages";
import { getShadowRoot } from "./overlay";
import { escapeHtml, productLabel } from "./render-helpers";

let currentTooltip: HTMLElement | null = null;

export function showTooltip(
	data: ParseResponse,
	anchorRect: DOMRect,
	onClick: () => void,
): void {
	hideTooltip();

	const root = getShadowRoot();
	const tooltip = document.createElement("div");
	tooltip.className = "koikatu-tooltip";

	let html = `<div class="info">`;
	html += `<span class="name">${escapeHtml(data.name ?? "Unknown")}</span>`;
	html += `<span class="product">${escapeHtml(productLabel(data.product))}`;
	if (data.hasKKEx) html += ` <span class="kkex-badge">MOD</span>`;
	html += `</span>`;
	html += `</div>`;

	tooltip.innerHTML = html;

	tooltip.addEventListener("click", onClick);
	tooltip.addEventListener("mouseleave", () => hideTooltip());

	// Position below the element
	const top = anchorRect.bottom + 8;
	const left = anchorRect.left;

	tooltip.style.top = `${top}px`;
	tooltip.style.left = `${left}px`;

	// Adjust if overflowing right edge
	root.appendChild(tooltip);
	const tooltipRect = tooltip.getBoundingClientRect();
	if (tooltipRect.right > window.innerWidth - 8) {
		tooltip.style.left = `${window.innerWidth - tooltipRect.width - 8}px`;
	}
	// Adjust if overflowing bottom
	if (tooltipRect.bottom > window.innerHeight - 8) {
		tooltip.style.top = `${anchorRect.top - tooltipRect.height - 8}px`;
	}

	currentTooltip = tooltip;
}

export function hideTooltip(): void {
	if (currentTooltip) {
		currentTooltip.remove();
		currentTooltip = null;
	}
}

export function isTooltipHovered(): boolean {
	if (!currentTooltip) return false;
	return currentTooltip.matches(":hover");
}
