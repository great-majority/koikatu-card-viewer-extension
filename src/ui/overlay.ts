import { OVERLAY_STYLES } from "./styles";

let shadowRoot: ShadowRoot | null = null;

export function initOverlay(): void {
	if (shadowRoot) return;

	const host = document.createElement("koikatu-card-viewer");
	const shadow = host.attachShadow({ mode: "closed" });

	const style = document.createElement("style");
	style.textContent = OVERLAY_STYLES;
	shadow.appendChild(style);

	document.documentElement.appendChild(host);
	shadowRoot = shadow;
}

export function getShadowRoot(): ShadowRoot {
	if (!shadowRoot) {
		throw new Error("Overlay not initialized");
	}
	return shadowRoot;
}
