import { z } from "zod";

import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, validateImageValue } from "./image";

const KILOBYTE = 1024;
const IMAGE_MESSAGE = `Image must be an https:// URL or a PNG/JPEG/WebP/GIF data URL (max ${Math.round(
	MAX_IMAGE_BYTES / KILOBYTE,
)}KB, ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px)`;

/**
 * Optional image field. Accepts an empty value (means "no image"), an https URL
 * or a supported image data URL. `validateImageValue` enforces the payload cap
 * and, for PNG/JPEG, the 512×512 dimension limit.
 */
const imageField = z
	.string()
	.trim()
	.max(800_000, "Image payload is too large")
	.optional()
	.refine((value) => value === undefined || value === "" || validateImageValue(value).ok, {
		message: IMAGE_MESSAGE,
	})
	.transform((value) => (value === undefined || value === "" ? undefined : value));

/**
 * Strip raw HTML tags and non-printable characters to prevent stored XSS injection.
 */
export function sanitizeText(input: string): string {
	const stripped = input.replace(/<[^>]*>/g, "");
	return Array.from(stripped)
		.filter((char) => {
			const code = char.charCodeAt(0);
			return code >= 32 || code === 10 || code === 13 || code === 9;
		})
		.join("")
		.trim();
}

/**
 * Authoritative schema for product writes. Used by `createProduct` and
 * `updateProduct` server functions — never trust the client.
 */
export const productSchema = z.object({
	name: z
		.string()
		.trim()
		.transform(sanitizeText)
		.refine((val) => val.length >= 1, { message: "Name is required" })
		.pipe(z.string().max(100, "Name too long")),
	description: z
		.string()
		.trim()
		.transform(sanitizeText)
		.refine((val) => val.length >= 1, { message: "Description is required" })
		.pipe(z.string().max(1000, "Description too long")),
	price: z.coerce.number().min(0, "Price must be >= 0").max(1_000_000_000, "Price is too large"),
	stock: z.coerce
		.number()
		.int("Stock must be an integer")
		.min(0, "Stock must be >= 0")
		.max(1_000_000, "Stock is too large"),
	image: imageField,
});

export type ProductInput = z.infer<typeof productSchema>;

export const productUpdateSchema = z.object({
	id: z.string().min(1, "Product id is required"),
	...productSchema.shape,
});

/**
 * Client-side sibling of `productSchema` where numeric inputs stay strings (as
 * they are in the DOM) so we can render precise per-field feedback while typing.
 * The server still re-validates everything with `productSchema`.
 */
export const productFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
	description: z
		.string()
		.trim()
		.min(1, "Description is required")
		.max(1000, "Description too long"),
	price: z
		.string()
		.trim()
		.min(1, "Price is required")
		.refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
			message: "Price must be a number >= 0",
		}),
	stock: z
		.string()
		.trim()
		.min(1, "Stock is required")
		.refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
			message: "Stock must be a whole number >= 0",
		}),
	image: imageField,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const emptyProductForm: ProductFormValues = {
	name: "",
	description: "",
	price: "",
	stock: "",
	image: undefined,
};

/** Convert validated form values into the `ProductInput` the server expects. */
export function toProductInput(values: ProductFormValues): ProductInput {
	return {
		name: values.name.trim(),
		description: values.description.trim(),
		price: Number(values.price),
		stock: Number(values.stock),
		image: values.image && values.image.length > 0 ? values.image : undefined,
	};
}

/** Turn a form values object into a react-form friendly string map. */
export function toProductFormValues(product: {
	name: string;
	description: string;
	price: number;
	stock: number;
	image?: string;
}): ProductFormValues {
	return {
		name: product.name,
		description: product.description,
		price: String(product.price),
		stock: String(product.stock),
		image: product.image ?? undefined,
	};
}
