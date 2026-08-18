const markerPrefix = "<!-- formatly-on-demand";

export const commentMarker = `${markerPrefix} -->`;

export const offerMarker = `${markerPrefix}: offer -->`;

export function isFormatlyComment(body: string | undefined) {
	return !!body?.includes(markerPrefix);
}

export function isOfferComment(body: string | undefined) {
	return !!body?.includes(offerMarker);
}
