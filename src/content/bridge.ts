import type {
	CheckRequest,
	CheckResponse,
	ParseFullRequest,
	ParseFullResponse,
	ParseRequest,
	ParseResponse,
} from "@/types/messages";

export function sendCheck(url: string): Promise<CheckResponse> {
	return chrome.runtime.sendMessage({
		action: "check",
		url,
	} satisfies CheckRequest);
}

export function sendParse(url: string): Promise<ParseResponse | null> {
	return chrome.runtime.sendMessage({
		action: "parse",
		url,
	} satisfies ParseRequest);
}

export function sendParseFull(url: string): Promise<ParseFullResponse | null> {
	return chrome.runtime.sendMessage({
		action: "parse-full",
		url,
	} satisfies ParseFullRequest);
}
