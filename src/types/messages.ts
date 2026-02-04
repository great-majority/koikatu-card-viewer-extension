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

export type MessageRequest = CheckRequest | ParseRequest | ParseFullRequest;
export type MessageResponse = CheckResponse | ParseResponse | ParseFullResponse;
