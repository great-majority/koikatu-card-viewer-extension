import type {
	CheckResponse,
	MessageRequest,
	ParseFullResponse,
	ParseResponse,
} from "@/types/messages";
import {
	fetchAndCheck,
	fetchAndParse,
	fetchAndParseFull,
} from "./fetch-and-parse";

export function handleMessage(
	message: MessageRequest,
	_sender: chrome.runtime.MessageSender,
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

		default:
			return false;
	}
}
