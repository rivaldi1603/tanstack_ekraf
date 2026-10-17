/**
 * Dependency-free image validation helpers.
 *
 * These are isomorphic on purpose: the product modal runs them on the client
 * for instant feedback, and the product server functions run the exact same
 * rules again on the server, because the client is untrusted.
 */

/** Maximum decoded payload we are willing to hold in memory (~500KB). */
export const MAX_IMAGE_BYTES = 500 * 1024;
/** Maximum width/height in pixels for a stored product image. */
export const MAX_IMAGE_DIMENSION = 512;

const DATA_URL_RE = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface ImageDimensions {
	width: number;
	height: number;
}

export type ImageValidationResult =
	| { ok: true; dimensions?: ImageDimensions }
	| { ok: false; reason: string };

/** True when `value` is a syntactically valid `https://` URL. */
export function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

/** Length of the decoded bytes of a base64 string, without allocating them. */
export function base64ByteLength(base64: string): number {
	const clean = base64.replace(/[\r\n]/g, "");
	const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
	return Math.floor((clean.length * 3) / 4) - padding;
}

function decodeBase64(base64: string): Uint8Array | null {
	try {
		const binary = atob(base64.replace(/[\r\n]/g, ""));
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i += 1) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	} catch {
		return null;
	}
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 24) return null;
	for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
		if (bytes[i] !== PNG_SIGNATURE[i]) return null;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	// IHDR is always the first chunk: width at byte 16, height at byte 20.
	return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

	let offset = 2;
	while (offset + 9 < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = bytes[offset + 1];
		if (marker === 0xff) {
			offset += 1;
			continue;
		}
		// Standalone markers (no length field).
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
			offset += 2;
			continue;
		}
		const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
		if (length < 2) return null;

		const isStartOfFrame =
			marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
		if (isStartOfFrame) {
			const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
			const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
			return { width, height };
		}
		offset += 2 + length;
	}
	return null;
}

/** Read pixel dimensions straight out of PNG/JPEG headers. */
export function readImageDimensions(
	bytes: Uint8Array,
	mime: "png" | "jpeg",
): ImageDimensions | null {
	return mime === "png" ? readPngDimensions(bytes) : readJpegDimensions(bytes);
}

/**
 * Validate a stored image value: either an `https://` URL or a PNG/JPEG/WebP/GIF
 * data URL whose payload is at most 500KB. PNG/JPEG data URLs are additionally
 * checked against `MAX_IMAGE_DIMENSION` by reading the header dimensions.
 */
export function validateImageValue(value: string): ImageValidationResult {
	const trimmed = value.trim();
	if (trimmed.length === 0) return { ok: true };
	if (isHttpsUrl(trimmed)) return { ok: true };

	const match = DATA_URL_RE.exec(trimmed);
	if (!match) {
		return {
			ok: false,
			reason: "Image must be an https:// URL or a PNG, JPEG, WebP or GIF data URL",
		};
	}

	const mime = match[1] as "png" | "jpeg" | "webp" | "gif";
	const base64 = match[2] ?? "";
	if (base64ByteLength(base64) > MAX_IMAGE_BYTES) {
		return { ok: false, reason: "Image is larger than 500KB — please resize or compress it" };
	}

	if (mime === "png" || mime === "jpeg") {
		const bytes = decodeBase64(base64);
		if (!bytes) return { ok: false, reason: "Image data could not be decoded" };
		const dimensions = readImageDimensions(bytes, mime);
		if (!dimensions) return { ok: false, reason: "Could not read the image dimensions" };
		if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
			return {
				ok: false,
				reason: `Image must be at most ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px (received ${dimensions.width}×${dimensions.height}px)`,
			};
		}
		return { ok: true, dimensions };
	}

	return { ok: true };
}

/** Human friendly `320 × 320 px` label. */
export function formatDimensions(dimensions: ImageDimensions): string {
	return `${dimensions.width} × ${dimensions.height} px`;
}
