import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageOffIcon, LinkIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/db";
import {
	type ImageDimensions,
	MAX_IMAGE_BYTES,
	MAX_IMAGE_DIMENSION,
	formatDimensions,
	validateImageValue,
} from "@/lib/image";
import {
	emptyProductForm,
	productFormSchema,
	toProductFormValues,
	toProductInput,
} from "@/lib/product-schema";
import { createProduct, updateProduct } from "@/lib/server/products";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/gif";

interface ProductFormModalProps {
	open: boolean;
	product?: Product | null;
	onOpenChange: (open: boolean) => void;
}

interface PreparedImage {
	dataUrl: string;
	dimensions: ImageDimensions;
	original: ImageDimensions;
	resized: boolean;
}

function validateWith(schema: ZodType, value: unknown): string | undefined {
	const result = schema.safeParse(value);
	if (result.success) return undefined;
	return result.error.issues[0]?.message ?? "Invalid value";
}

function formatErrors(errors: readonly unknown[]): string {
	return errors
		.map((error) => {
			if (typeof error === "string") return error;
			if (error && typeof error === "object" && "message" in error) {
				const message = (error as { message?: unknown }).message;
				if (typeof message === "string") return message;
			}
			return "Invalid value";
		})
		.join(", ");
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("Could not read the selected file"));
		reader.readAsDataURL(file);
	});
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Could not decode the selected image"));
		image.src = src;
	});
}

/**
 * Read a picked file, downscale it proportionally to at most 512×512 on a
 * canvas and return a data URL that satisfies the shared (client + server)
 * image rules.
 */
async function prepareImage(file: File): Promise<PreparedImage> {
	if (!file.type.startsWith("image/")) {
		throw new Error("Please choose a PNG, JPEG, WebP or GIF image");
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new Error("Image is larger than 8MB — please pick a smaller file");
	}

	const raw = await readFileAsDataUrl(file);
	const currentCheck = validateImageValue(raw);
	const loaded = await loadImage(raw);
	const original: ImageDimensions = {
		width: loaded.naturalWidth,
		height: loaded.naturalHeight,
	};

	const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(original.width, original.height));
	const needsResize = scale < 1 || !currentCheck.ok;

	if (!needsResize) {
		return { dataUrl: raw, dimensions: original, original, resized: false };
	}

	const target: ImageDimensions = {
		width: Math.max(1, Math.round(original.width * scale)),
		height: Math.max(1, Math.round(original.height * scale)),
	};

	const canvas = document.createElement("canvas");
	canvas.width = target.width;
	canvas.height = target.height;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Your browser does not support canvas image resizing");
	}
	context.drawImage(loaded, 0, 0, target.width, target.height);

	let dataUrl = canvas.toDataURL("image/webp", 0.9);
	let recheck = validateImageValue(dataUrl);
	if (!recheck.ok) {
		dataUrl = canvas.toDataURL("image/jpeg", 0.82);
		recheck = validateImageValue(dataUrl);
	}
	if (!recheck.ok) {
		throw new Error(recheck.reason);
	}

	return { dataUrl, dimensions: target, original, resized: true };
}

export default function ProductFormModal({ open, product, onOpenChange }: ProductFormModalProps) {
	const isEditing = Boolean(product);
	const queryClient = useQueryClient();
	const createFn = useServerFn(createProduct);
	const updateFn = useServerFn(updateProduct);

	const [submitError, setSubmitError] = useState("");
	const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
	const [imageStatus, setImageStatus] = useState("");
	const [imageError, setImageError] = useState("");
	const [isProcessingImage, setIsProcessingImage] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm({
		defaultValues: emptyProductForm,
		onSubmit: async ({ value }) => {
			setSubmitError("");
			const parsed = productFormSchema.safeParse(value);
			if (!parsed.success) {
				setSubmitError(
					parsed.error.issues[0]?.message ?? "Please complete all required fields correctly.",
				);
				return;
			}
			const payload = toProductInput(value);
			try {
				if (product) {
					await updateFn({ data: { id: product.id, ...payload } });
				} else {
					await createFn({ data: payload });
				}
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: ["products"] }),
					queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
				]);
				onOpenChange(false);
			} catch (error) {
				setSubmitError(error instanceof Error ? error.message : "Could not save the product");
			}
		},
	});

	// Re-seed the form every time the modal opens so editing a different product
	// (or creating a new one) never shows stale values.
	useEffect(() => {
		if (!open) return;
		form.reset(product ? toProductFormValues(product) : { ...emptyProductForm });
		setSubmitError("");
		setImageError("");
		setImageStatus("");
		setImageMode(product?.image?.startsWith("data:") ? "upload" : "url");
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [open, product, form]);

	const handleImageFile = async (file: File | undefined, onChange: (value: string) => void) => {
		if (!file) return;
		setImageError("");
		setImageStatus("");
		setIsProcessingImage(true);
		try {
			const prepared = await prepareImage(file);
			onChange(prepared.dataUrl);
			setImageStatus(
				`${formatDimensions(prepared.dimensions)} • Valid${
					prepared.resized ? ` (auto-downscaled from ${formatDimensions(prepared.original)})` : ""
				}`,
			);
		} catch (error) {
			onChange("");
			setImageError(error instanceof Error ? error.message : "Could not process the image");
			if (fileInputRef.current) fileInputRef.current.value = "";
		} finally {
			setIsProcessingImage(false);
		}
	};

	const handleImageUrlBlur = async (url: string, onChange: (value: string) => void) => {
		const trimmed = url.trim();
		if (!trimmed) {
			setImageStatus("");
			setImageError("");
			return;
		}
		if (!trimmed.startsWith("https://")) {
			setImageError("Image URL must begin with https://");
			return;
		}
		setImageError("");
		setIsProcessingImage(true);
		try {
			const loaded = await loadImage(trimmed);
			const dimensions: ImageDimensions = {
				width: loaded.naturalWidth,
				height: loaded.naturalHeight,
			};
			if (dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
				const scale = Math.min(
					1,
					MAX_IMAGE_DIMENSION / Math.max(dimensions.width, dimensions.height),
				);
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(dimensions.width * scale);
				canvas.height = Math.round(dimensions.height * scale);
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.drawImage(loaded, 0, 0, canvas.width, canvas.height);
					const downscaled = canvas.toDataURL("image/webp", 0.9);
					onChange(downscaled);
					setImageStatus(
						`${formatDimensions({ width: canvas.width, height: canvas.height })} • Auto-downscaled from URL (${formatDimensions(dimensions)})`,
					);
					return;
				}
			}
			setImageStatus(`${formatDimensions(dimensions)} • Valid image URL`);
		} catch {
			setImageStatus("Image URL saved");
		} finally {
			setIsProcessingImage(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit product" : "New product"}</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Update the details below and save your changes."
							: "Fill in the details to add a new product to your catalogue."}
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
					className="space-y-5"
					noValidate
				>
					<form.Field
						name="name"
						validators={{
							onChange: ({ value }) => validateWith(productFormSchema.shape.name, value),
							onBlur: ({ value }) => validateWith(productFormSchema.shape.name, value),
						}}
					>
						{(field) => (
							<div className="space-y-1.5">
								<Label htmlFor="product-name">Name</Label>
								<Input
									id="product-name"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									placeholder="e.g. Starter Kit"
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-xs font-medium text-destructive">
										{formatErrors(field.state.meta.errors)}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field
						name="description"
						validators={{
							onChange: ({ value }) => validateWith(productFormSchema.shape.description, value),
							onBlur: ({ value }) => validateWith(productFormSchema.shape.description, value),
						}}
					>
						{(field) => (
							<div className="space-y-1.5">
								<Label htmlFor="product-description">Description</Label>
								<Textarea
									id="product-description"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									placeholder="What makes this product useful?"
									rows={3}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-xs font-medium text-destructive">
										{formatErrors(field.state.meta.errors)}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field
							name="price"
							validators={{
								onChange: ({ value }) => validateWith(productFormSchema.shape.price, value),
								onBlur: ({ value }) => validateWith(productFormSchema.shape.price, value),
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor="product-price">Price (USD)</Label>
									<Input
										id="product-price"
										type="number"
										min={0}
										step="0.01"
										inputMode="decimal"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
										placeholder="0.00"
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs font-medium text-destructive">
											{formatErrors(field.state.meta.errors)}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field
							name="stock"
							validators={{
								onChange: ({ value }) => validateWith(productFormSchema.shape.stock, value),
								onBlur: ({ value }) => validateWith(productFormSchema.shape.stock, value),
							}}
						>
							{(field) => (
								<div className="space-y-1.5">
									<Label htmlFor="product-stock">Stock</Label>
									<Input
										id="product-stock"
										type="number"
										min={0}
										step="1"
										inputMode="numeric"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
										placeholder="0"
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs font-medium text-destructive">
											{formatErrors(field.state.meta.errors)}
										</p>
									)}
								</div>
							)}
						</form.Field>
					</div>

					<form.Field
						name="image"
						validators={{
							onChange: ({ value }) => validateWith(productFormSchema.shape.image, value),
							onBlur: ({ value }) => validateWith(productFormSchema.shape.image, value),
						}}
					>
						{(field) => {
							const imageValue = field.state.value ?? "";
							const isDataUrl = imageValue.startsWith("data:");

							return (
								<div className="space-y-2">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<Label htmlFor="product-image-url">Product image</Label>
										<div
											className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
											role="tablist"
											aria-label="Image source"
										>
											<button
												type="button"
												role="tab"
												aria-selected={imageMode === "upload"}
												onClick={() => setImageMode("upload")}
												className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
													imageMode === "upload"
														? "bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												<UploadIcon className="size-3.5" />
												Upload
											</button>
											<button
												type="button"
												role="tab"
												aria-selected={imageMode === "url"}
												onClick={() => setImageMode("url")}
												className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
													imageMode === "url"
														? "bg-background text-foreground shadow-sm"
														: "text-muted-foreground hover:text-foreground"
												}`}
											>
												<LinkIcon className="size-3.5" />
												Image URL
											</button>
										</div>
									</div>

									{imageMode === "url" ? (
										<div className="space-y-1.5">
											<Input
												id="product-image-url"
												type="url"
												inputMode="url"
												value={isDataUrl ? "" : imageValue}
												onChange={(event) => {
													field.handleChange(event.target.value);
													setImageStatus("");
													setImageError("");
												}}
												onBlur={() => {
													field.handleBlur();
													void handleImageUrlBlur(field.state.value ?? "", field.handleChange);
												}}
												placeholder="https://example.com/product.png"
												aria-invalid={field.state.meta.errors.length > 0}
											/>
											{isDataUrl && (
												<p className="text-xs text-muted-foreground">
													An uploaded image is currently selected. Paste a URL to replace it, or
													switch to the Upload tab.
												</p>
											)}
										</div>
									) : (
										<div className="flex flex-wrap items-center gap-3">
											<Input
												ref={fileInputRef}
												id="product-image-file"
												type="file"
												accept={ACCEPTED_TYPES}
												onChange={(event) =>
													void handleImageFile(event.target.files?.[0], field.handleChange)
												}
												className="max-w-xs file:text-foreground"
											/>
											{isProcessingImage && (
												<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
													<Loader2Icon className="size-3.5 animate-spin" />
													Processing image…
												</span>
											)}
										</div>
									)}

									<p className="text-xs text-muted-foreground">
										Images are capped at {MAX_IMAGE_DIMENSION}×{MAX_IMAGE_DIMENSION}px and{" "}
										{Math.round(MAX_IMAGE_BYTES / 1024)}KB. Larger images are downscaled
										automatically.
									</p>

									{imageValue ? (
										<div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
											<img
												src={imageValue}
												alt="Product preview"
												className="size-16 shrink-0 rounded-lg border border-border object-cover"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-xs font-medium text-foreground">
													{isDataUrl ? "Uploaded image" : imageValue}
												</p>
												{imageStatus && (
													<p className="mt-0.5 text-xs text-muted-foreground">{imageStatus}</p>
												)}
											</div>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label="Remove image"
												onClick={() => {
													field.handleChange("");
													setImageStatus("");
													setImageError("");
													if (fileInputRef.current) fileInputRef.current.value = "";
												}}
											>
												<Trash2Icon />
											</Button>
										</div>
									) : (
										<div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
											<ImageOffIcon className="size-4" />
											No image selected — a placeholder thumbnail will be shown.
										</div>
									)}

									{imageError && (
										<p className="text-xs font-medium text-destructive">{imageError}</p>
									)}
									{field.state.meta.errors.length > 0 && (
										<p className="text-xs font-medium text-destructive">
											{formatErrors(field.state.meta.errors)}
										</p>
									)}
								</div>
							);
						}}
					</form.Field>

					{submitError && (
						<div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
							{submitError}
						</div>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={form.state.isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={form.state.isSubmitting || isProcessingImage}>
							{form.state.isSubmitting ? (
								<>
									<Loader2Icon className="animate-spin" />
									Saving…
								</>
							) : isEditing ? (
								"Save changes"
							) : (
								"Create product"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
