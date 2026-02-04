export type Settings = {
	enabled: boolean;
	hoverDelay: number;
	showTooltipOnHover: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
	enabled: true,
	hoverDelay: 300,
	showTooltipOnHover: true,
};

export async function loadSettings(): Promise<Settings> {
	const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
	return stored as Settings;
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
	await chrome.storage.sync.set(settings);
}
