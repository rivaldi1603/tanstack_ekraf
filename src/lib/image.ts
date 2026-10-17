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

function readGifDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 10) return null;
	if (
		bytes[0] !== 0x47 ||
		bytes[1] !== 0x49 ||
		bytes[2] !== 0x46 ||
		bytes[3] !== 0x38 ||
		(bytes[4] !== 0x37 && bytes[4] !== 0x39) ||
		bytes[5] !== 0x61
	) {
		return null;
	}
	const width = bytes[6] | (bytes[7] << 8);
	const height = bytes[8] | (bytes[9] << 8);
	return { width, height };
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 30) return null;
	if (
		bytes[0] !== 0x52 ||
		bytes[1] !== 0x49 ||
		bytes[2] !== 0x46 ||
		bytes[3] !== 0x46 ||
		bytes[8] !== 0x57 ||
		bytes[9] !== 0x45 ||
		bytes[10] !== 0x42 ||
		bytes[11] !== 0x50
	) {
		return null;
	}

	const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

	if (chunkType === "VP8 ") {
		if (bytes.length < 30) return null;
		if (bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
			const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
			const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
			return { width, height };
		}
	} else if (chunkType === "VP8L") {
		if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
		const b0 = bytes[21];
		const b1 = bytes[22];
		const b2 = bytes[23];
		const b3 = bytes[24];
		const width = 1 + (((b1 & 0x3f) << 8) | b0);
		const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
		return { width, height };
	} else if (chunkType === "VP8X") {
		if (bytes.length < 30) return null;
		const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
		const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
		return { width, height };
	}

	return null;
}

/** Read pixel dimensions straight out of PNG/JPEG/WebP/GIF headers. */
export function readImageDimensions(
	bytes: Uint8Array,
	mime: "png" | "jpeg" | "webp" | "gif",
): ImageDimensions | null {
	switch (mime) {
		case "png":
			return readPngDimensions(bytes);
		case "jpeg":
			return readJpegDimensions(bytes);
		case "webp":
			return readWebpDimensions(bytes);
		case "gif":
			return readGifDimensions(bytes);
		default:
			return null;
	}
}

/**
 * Validate a stored image value: either an `https://` URL or a PNG/JPEG/WebP/GIF
 * data URL whose payload is at most 500KB. Binary headers are decoded isomorphic-safe
 * to enforce `MAX_IMAGE_DIMENSION` across all supported image formats.
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

	const bytes = decodeBase64(base64);
	if (!bytes) return { ok: false, reason: "Image data could not be decoded" };
	const dimensions = readImageDimensions(bytes, mime);
	if (dimensions) {
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
