import type { HoneycomeSeriesTarget } from "@/shared/honeycome-series";
import type {
	CheckRequest,
	CheckResponse,
	ConvertSceneRequest,
	ConvertSceneResponse,
	DownloadSceneOriginalRequest,
	ParseFullRequest,
	ParseFullResponse,
	ParseRequest,
	ParseResponse,
	ParseSceneRequest,
	ParseSceneResponse,
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

export function sendParseScene(
	url: string,
): Promise<ParseSceneResponse | null> {
	return chrome.runtime.sendMessage({
		action: "parse-scene",
		url,
	} satisfies ParseSceneRequest);
}

export function sendConvertScene(
	url: string,
	target: HoneycomeSeriesTarget,
	stripDirtyHtmlTail: boolean,
): Promise<ConvertSceneResponse> {
	return chrome.runtime.sendMessage({
		action: "convert-scene",
		url,
		target,
		stripDirtyHtmlTail,
	} satisfies ConvertSceneRequest);
}

export function sendDownloadSceneOriginal(
	url: string,
	target: HoneycomeSeriesTarget,
): Promise<ConvertSceneResponse> {
	return chrome.runtime.sendMessage({
		action: "download-scene-original",
		url,
		target,
	} satisfies DownloadSceneOriginalRequest);
}
