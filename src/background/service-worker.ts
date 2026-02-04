import { handleMessage } from "./message-handler";

chrome.runtime.onMessage.addListener(handleMessage);
