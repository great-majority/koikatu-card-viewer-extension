import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/types/settings";

const enabledEl = document.getElementById("enabled") as HTMLInputElement;
const showTooltipEl = document.getElementById(
	"showTooltipOnHover",
) as HTMLInputElement;
const hoverDelayEl = document.getElementById("hoverDelay") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLElement;

async function restore(): Promise<void> {
	const settings = await loadSettings();
	enabledEl.checked = settings.enabled;
	showTooltipEl.checked = settings.showTooltipOnHover;
	hoverDelayEl.value = String(settings.hoverDelay);
}

function showStatus(msg: string): void {
	statusEl.textContent = msg;
	setTimeout(() => {
		statusEl.textContent = "";
	}, 1500);
}

async function save(): Promise<void> {
	await saveSettings({
		enabled: enabledEl.checked,
		showTooltipOnHover: showTooltipEl.checked,
		hoverDelay: Number(hoverDelayEl.value) || DEFAULT_SETTINGS.hoverDelay,
	});
	showStatus("Saved");
}

enabledEl.addEventListener("change", save);
showTooltipEl.addEventListener("change", save);
hoverDelayEl.addEventListener("change", save);

restore();
