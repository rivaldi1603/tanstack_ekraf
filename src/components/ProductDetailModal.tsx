import { PackageOpenIcon, PencilIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/db";
import { formatCurrency, formatJoinedDate, getStockStatus } from "@/lib/types";

interface ProductDetailModalProps {
	open: boolean;
	product: Product | null;
	isAdmin: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit?: (product: Product) => void;
}

export default function ProductDetailModal({
	open,
	product,
	isAdmin,
	onOpenChange,
	onEdit,
}: ProductDetailModalProps) {
	if (!product) {
		return <Dialog open={open} onOpenChange={onOpenChange} />;
	}

	const status = getStockStatus(product.stock);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<div className="flex flex-wrap items-center justify-between gap-2 pr-6">
						<DialogTitle className="text-xl font-bold text-foreground">{product.name}</DialogTitle>
						<Badge variant={status.variant}>
							{status.label} · {product.stock} units
						</Badge>
					</div>
					<DialogDescription>
						Detailed product specifications and inventory record.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Product Image Preview */}
					<div className="flex justify-center rounded-2xl border border-border bg-muted/30 p-3">
						{product.image ? (
							<img
								src={product.image}
								alt={product.name}
								className="max-h-64 w-auto rounded-xl object-contain shadow-sm"
							/>
						) : (
							<div className="flex h-40 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
								<PackageOpenIcon className="size-10 opacity-50" />
								<span className="text-xs">No image uploaded for this item</span>
							</div>
						)}
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Description
						</p>
						<p className="rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
							{product.description}
						</p>
					</div>

					{/* Metadata Grid */}
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
							<p className="text-[11px] font-medium text-muted-foreground">Unit Price</p>
							<p className="mt-1 text-base font-bold text-foreground">
								{formatCurrency(product.price)}
							</p>
						</div>
						<div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
							<p className="text-[11px] font-medium text-muted-foreground">Stock</p>
							<p className="mt-1 text-base font-bold text-foreground">{product.stock}</p>
						</div>
						<div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
							<p className="text-[11px] font-medium text-muted-foreground">Added On</p>
							<p className="mt-1 text-xs font-semibold text-foreground">
								{formatJoinedDate(product.createdAt)}
							</p>
						</div>
						<div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
							<p className="text-[11px] font-medium text-muted-foreground">Last Updated</p>
							<p className="mt-1 text-xs font-semibold text-foreground">
								{formatJoinedDate(product.updatedAt)}
							</p>
						</div>
					</div>

					{/* Role awareness callout */}
					{!isAdmin ? (
						<div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
							<p className="font-medium text-foreground">Standard User Mode</p>
							<p className="mt-0.5">
								You have read-only permissions for this catalogue item. Price, stock, and details
								can only be modified by an Administrator.
							</p>
						</div>
					) : (
						<div className="rounded-xl border border-[color:var(--lagoon)]/30 bg-[color:var(--lagoon)]/10 p-3 text-xs text-[color:var(--lagoon-deep)]">
							<p className="font-medium">Administrator Access</p>
							<p className="mt-0.5">
								You have full authority to modify or remove this product from the catalogue.
							</p>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					{isAdmin && onEdit && (
						<Button type="button" onClick={() => onEdit(product)} className="gap-1.5">
							<PencilIcon className="size-4" />
							Edit Product
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
