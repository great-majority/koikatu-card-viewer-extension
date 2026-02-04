import { loadSettings } from "@/types/settings";
import { initOverlay } from "@/ui/overlay";
import { bindElements, setSettings } from "./interaction";
import { observeDOM } from "./observer";
import { scanForPngElements } from "./scanner";

async function init(): Promise<void> {
	const settings = await loadSettings();
	setSettings(settings);

	if (!settings.enabled) return;

	initOverlay();

	// Scan existing elements
	const existing = scanForPngElements();
	bindElements(existing);

	// Watch for dynamically added elements
	observeDOM((newElements) => {
		bindElements(newElements);
	});

	// Listen for settings changes
	chrome.storage.onChanged.addListener((changes) => {
		const updated = { ...settings };
		for (const [key, change] of Object.entries(changes)) {
			if (key in updated) {
				(updated as Record<string, unknown>)[key] = change.newValue;
			}
		}
		setSettings(updated);
	});
}

init();
