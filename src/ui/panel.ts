import type { ParseResponse } from "@/types/messages";
import { getShadowRoot } from "./overlay";
import {
	escapeHtml,
	formatBirthday,
	productLabel,
	sexLabel,
} from "./render-helpers";

let currentPanel: HTMLElement | null = null;

function removePanel(): void {
	if (currentPanel) {
		currentPanel.remove();
		currentPanel = null;
	}
}

export function showPanel(
	data: ParseResponse,
	getFullJson: () => Promise<string | null>,
): void {
	removePanel();

	const root = getShadowRoot();
	const backdrop = document.createElement("div");
	backdrop.className = "koikatu-panel-backdrop";

	const panel = document.createElement("div");
	panel.className = "koikatu-panel";

	// Header section
	let headerHtml = `<div class="panel-header">`;
	if (data.faceImageDataUrl) {
		headerHtml += `<img class="face-img-large" src="${data.faceImageDataUrl}" alt="face">`;
	}
	headerHtml += `<div class="header-info">`;
	headerHtml += `<span class="name">${escapeHtml(data.name ?? "Unknown")}</span>`;
	headerHtml += `<span class="badges"><span class="product-badge">${escapeHtml(productLabel(data.product))}</span>`;
	if (data.hasKKEx) headerHtml += `<span class="kkex-badge">MOD</span>`;
	headerHtml += `</span>`;
	headerHtml += `</div></div>`;

	// Details
	let detailsHtml = "";
	detailsHtml += `<div class="detail-row"><span class="detail-label">Sex</span><span class="detail-value">${escapeHtml(sexLabel(data.sex))}</span></div>`;
	detailsHtml += `<div class="detail-row"><span class="detail-label">Birthday</span><span class="detail-value">${escapeHtml(formatBirthday(data.birthday))}</span></div>`;
	// Blocks
	let blocksHtml = "";
	if (data.blocks.length > 0) {
		blocksHtml += `<div class="blocks-section">`;
		blocksHtml += `<button class="blocks-toggle">Blocks (${data.blocks.length}) &#9660;</button>`;
		blocksHtml += `<div class="blocks-list">${data.blocks.map((b) => escapeHtml(b)).join("<br>")}</div>`;
		blocksHtml += `</div>`;
	}

	// Used Mods (KKEx keys)
	let modsHtml = "";
	if (data.kkexKeys && data.kkexKeys.length > 0) {
		modsHtml += `<div class="blocks-section">`;
		modsHtml += `<button class="blocks-toggle mods-toggle">Used Mods (${data.kkexKeys.length}) &#9660;</button>`;
		modsHtml += `<div class="blocks-list mods-list">${data.kkexKeys.map((k) => escapeHtml(k)).join("<br>")}</div>`;
		modsHtml += `</div>`;
	}

	// Actions
	const actionsHtml = `
    <div class="panel-actions">
      <button class="btn btn-json">Open JSON</button>
      <button class="btn btn-close">Close</button>
    </div>
  `;

	panel.innerHTML =
		headerHtml + detailsHtml + blocksHtml + modsHtml + actionsHtml;
	backdrop.appendChild(panel);
	root.appendChild(backdrop);
	currentPanel = backdrop;

	// Event handlers
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) removePanel();
	});

	const closeBtn = panel.querySelector(".btn-close");
	closeBtn?.addEventListener("click", removePanel);

	const blocksToggle = panel.querySelector(".blocks-toggle:not(.mods-toggle)");
	const blocksList = panel.querySelector(".blocks-list:not(.mods-list)");
	blocksToggle?.addEventListener("click", () => {
		blocksList?.classList.toggle("open");
	});

	const modsToggle = panel.querySelector(".mods-toggle");
	const modsList = panel.querySelector(".mods-list");
	modsToggle?.addEventListener("click", () => {
		modsList?.classList.toggle("open");
	});

	const jsonBtn = panel.querySelector(".btn-json");
	jsonBtn?.addEventListener("click", async () => {
		const btn = jsonBtn as HTMLButtonElement;
		btn.textContent = "Loading...";
		btn.disabled = true;
		const json = await getFullJson();
		if (json) {
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			window.open(url, "_blank");
		}
		btn.textContent = "Open JSON";
		btn.disabled = false;
	});

	// Esc key handler
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			removePanel();
			document.removeEventListener("keydown", onKeyDown);
		}
	};
	document.addEventListener("keydown", onKeyDown);
}
