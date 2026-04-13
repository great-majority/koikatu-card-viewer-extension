import type {
	HoneycomeSeriesCounts,
	HoneycomeSeriesTarget,
} from "@/shared/honeycome-series";

// Service Worker <-> Content Script message types

export type CheckRequest = {
	action: "check";
	url: string;
};

export type CheckResponse = {
	isCard: boolean;
};

export type ParseRequest = {
	action: "parse";
	url: string;
};

export type ParseResponse = {
	product: string;
	name?: string;
	birthday?: { month?: number; day?: number };
	sex?: number;
	hasKKEx?: boolean;
	kkexKeys?: string[];
	userID?: string;
	dataID?: string;
	blocks: string[];
	faceImageDataUrl?: string;
};

export type ParseFullRequest = {
	action: "parse-full";
	url: string;
};

export type ParseFullResponse = {
	json: string;
};

export type ParseSceneRequest = {
	action: "parse-scene";
	url: string;
};

export type ParseSceneResponse = {
	title: string;
	version: string;
	characterCounts: HoneycomeSeriesCounts;
	characterTotal: number;
	hasDirtyHtmlTail: boolean;
	dirtyHtmlTailBytes: number;
};

export type ConvertSceneRequest = {
	action: "convert-scene";
	url: string;
	target: HoneycomeSeriesTarget;
	stripDirtyHtmlTail: boolean;
};

export type DownloadSceneOriginalRequest = {
	action: "download-scene-original";
	url: string;
	target: HoneycomeSeriesTarget;
};

export type ConvertSceneResponse = {
	ok: boolean;
	filename?: string;
	convertedCharacters?: number;
	strippedDirtyHtmlTail?: boolean;
	error?: string;
};

export type SceneConvertProgressMessage = {
	action: "scene-convert-progress";
	url: string;
	target: HoneycomeSeriesTarget;
	processedCharacters: number;
	totalCharacters: number;
	convertedCharacters: number;
};

export type MessageRequest =
	| CheckRequest
	| ParseRequest
	| ParseFullRequest
	| ParseSceneRequest
	| ConvertSceneRequest
	| DownloadSceneOriginalRequest;

export type MessageResponse =
	| CheckResponse
	| ParseResponse
	| ParseFullResponse
	| ParseSceneResponse
	| ConvertSceneResponse;
