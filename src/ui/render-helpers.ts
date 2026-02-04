export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function productLabel(product: string): string {
	const map: Record<string, string> = {
		Koikatu: "Koikatu (コイカツ)",
		"Koikatsu Party": "Koikatsu Party",
		"Koikatsu Sunshine": "Koikatsu Sunshine",
		EmotionCreators: "Emotion Creators",
		AIS: "AI Shoujo",
		HoneyCome: "HoneyCome (ハニカム)",
	};
	return map[product] ?? product;
}

export function sexLabel(sex: number | undefined): string {
	if (sex === undefined) return "Unknown";
	return sex === 0 ? "Male" : "Female";
}

export function formatBirthday(
	birthday: { month?: number; day?: number } | undefined,
): string {
	if (!birthday) return "Unknown";
	const m = birthday.month ?? "?";
	const d = birthday.day ?? "?";
	return `${m}/${d}`;
}
