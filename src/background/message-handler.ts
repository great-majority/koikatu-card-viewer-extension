import type {
	CheckResponse,
	ConvertSceneResponse,
	MessageRequest,
	ParseFullResponse,
	ParseResponse,
	ParseSceneResponse,
} from "@/types/messages";
import {
	fetchAndCheck,
	fetchAndParse,
	fetchAndParseFull,
} from "./fetch-and-parse";
import {
	convertAndDownloadScene,
	downloadSceneOriginal,
	fetchAndParseScene,
} from "./fetch-and-parse-scene";

export function handleMessage(
	message: MessageRequest,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void,
): boolean {
	switch (message.action) {
		case "check":
			fetchAndCheck(message.url).then((result) => {
				sendResponse({ isCard: result } satisfies CheckResponse);
			});
			return true; // async response

		case "parse":
			fetchAndParse(message.url).then((result) => {
				sendResponse(result satisfies ParseResponse | null);
			});
			return true;

		case "parse-full":
			fetchAndParseFull(message.url).then((result) => {
				sendResponse(result satisfies ParseFullResponse | null);
			});
			return true;

		case "parse-scene":
			fetchAndParseScene(message.url).then((result) => {
				sendResponse(result satisfies ParseSceneResponse | null);
			});
			return true;

		case "convert-scene":
			convertAndDownloadScene(
				message.url,
				message.target,
				message.stripDirtyHtmlTail,
				sender.tab?.id,
			).then((result) => {
				sendResponse(result satisfies ConvertSceneResponse);
			});
			return true;

		case "download-scene-original":
			downloadSceneOriginal(message.url, message.target).then((result) => {
				sendResponse(result satisfies ConvertSceneResponse);
			});
			return true;

		default:
			return false;
	}
}
