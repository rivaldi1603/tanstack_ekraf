import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	createColumnHelper,
	flexRender,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	PackageOpenIcon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import ProductFormModal from "@/components/ProductFormModal";
import ProductThumbnail from "@/components/ProductThumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/db";
import { deleteProduct, getProducts } from "@/lib/server/products";
import { formatCurrency, getStockStatus } from "@/lib/types";

export const Route = createFileRoute("/_admin/products")({
	component: ProductsPage,
});

const SKELETON_ROWS = ["one", "two", "three", "four", "five"] as const;

function ProductsPage() {
	const { viewer } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const deleteFn = useServerFn(deleteProduct);

	// Navigation-level convenience only: every mutation is still re-checked on
	// the server by requireAdmin(), so hiding these controls is purely UX.
	const isAdmin = viewer.role === "admin";

	const productsQuery = useQuery({
		queryKey: ["products"],
		queryFn: async () => getProducts(),
	});

	const [search, setSearch] = useState("");
	const [formState, setFormState] = useState<{ open: boolean; product: Product | null }>({
		open: false,
		product: null,
	});
	const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");

	const products = productsQuery.data ?? [];
	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return products;
		return products.filter(
			(product) =>
				product.name.toLowerCase().includes(query) ||
				product.description.toLowerCase().includes(query),
		);
	}, [products, search]);

	const features = tableFeatures({ rowSortingFeature });
	const columnHelper = createColumnHelper<typeof features, Product>();

	const columns = columnHelper.columns([
		columnHelper.display({
			id: "image",
			header: "Image",
			cell: (info) => (
				<ProductThumbnail
					src={info.row.original.image}
					alt={info.row.original.name}
					className="size-10 rounded-lg"
				/>
			),
		}),
		columnHelper.accessor("name", {
			header: "Name",
			cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
		}),
		columnHelper.accessor("description", {
			header: "Description",
			cell: (info) => (
				<span className="line-clamp-2 max-w-[24rem] text-muted-foreground">{info.getValue()}</span>
			),
		}),
		columnHelper.accessor("price", {
			header: "Price",
			cell: (info) => (
				<span className="font-medium whitespace-nowrap text-foreground">
					{formatCurrency(info.getValue())}
				</span>
			),
		}),
		columnHelper.accessor("stock", {
			header: "Stock",
			cell: (info) => {
				const stock = info.getValue();
				const status = getStockStatus(stock);
				return (
					<Badge variant={status.variant}>
						{status.label} · {stock}
					</Badge>
				);
			},
		}),
		columnHelper.display({
			id: "actions",
			header: "Actions",
			cell: (info) => {
				const product = info.row.original;
				if (!isAdmin) {
					return <span className="block text-right text-xs text-muted-foreground">View only</span>;
				}
				return (
					<div className="flex items-center justify-end gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setFormState({ open: true, product })}
						>
							<PencilIcon />
							Edit
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={() => {
								setDeleteError("");
								setDeleteTarget(product);
							}}
						>
							<Trash2Icon />
							Delete
						</Button>
					</div>
				);
			},
		}),
	]);

	const table = useTable({ features, columns, data: filtered });

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleteError("");
		setIsDeleting(true);
		try {
			await deleteFn({ data: { id: deleteTarget.id } });
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["products"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
			]);
			setDeleteTarget(null);
		} catch (error) {
			setDeleteError(error instanceof Error ? error.message : "Could not delete the product");
		} finally {
			setIsDeleting(false);
		}
	};

	const showSkeleton = productsQuery.isPending;
	const showError = productsQuery.isError;
	const showEmpty = !showSkeleton && !showError && filtered.length === 0;

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="island-kicker mb-1">Catalogue</p>
					<h1 className="display-title text-3xl font-bold text-foreground sm:text-4xl">Products</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Create, edit and remove products. Cloud images and uploads are capped at 512×512px.
					</p>
				</div>
				{isAdmin && (
					<Button type="button" onClick={() => setFormState({ open: true, product: null })}>
						<PlusIcon />
						Add product
					</Button>
				)}
			</div>

			<div className="relative max-w-sm">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search products…"
					aria-label="Search products"
					className="pl-9"
				/>
			</div>

			{showError && (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
						<p className="text-sm font-medium text-destructive">
							Could not load products:{" "}
							{(productsQuery.error as Error | null)?.message ?? "unknown error"}
						</p>
						<Button type="button" variant="outline" onClick={() => void productsQuery.refetch()}>
							<RefreshCwIcon />
							Retry
						</Button>
					</CardContent>
				</Card>
			)}

			{!showError &&
				(showEmpty ? (
					<Card>
						<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
							<PackageOpenIcon className="size-10 text-muted-foreground" />
							<div>
								<p className="text-sm font-semibold text-foreground">
									{search ? "No matching products" : "No products yet"}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{search
										? "Try a different search term."
										: "Add your first product to get started."}
								</p>
							</div>
							{!search && isAdmin && (
								<Button
									type="button"
									size="sm"
									onClick={() => setFormState({ open: true, product: null })}
								>
									<PlusIcon />
									Add product
								</Button>
							)}
						</CardContent>
					</Card>
				) : showSkeleton ? (
					<Card>
						<CardContent className="space-y-3">
							{SKELETON_ROWS.map((key) => (
								<div key={key} className="flex items-center gap-3">
									<div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
									<div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
									<div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted" />
								</div>
							))}
						</CardContent>
					</Card>
				) : (
					<>
						{/* Desktop table */}
						<Card className="hidden overflow-hidden md:block">
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-sm">
									<thead>
										{table.getHeaderGroups().map((headerGroup) => (
											<tr key={headerGroup.id} className="border-b border-border">
												{headerGroup.headers.map((header) => (
													<th
														key={header.id}
														colSpan={header.colSpan}
														className="bg-muted/50 px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
													>
														{header.isPlaceholder ? null : header.column.getCanSort() ? (
															<button
																type="button"
																onClick={header.column.getToggleSortingHandler()}
																className="inline-flex items-center gap-1 transition hover:text-foreground"
															>
																{flexRender(header.column.columnDef.header, header.getContext())}
																{header.column.getIsSorted() === "asc" ? (
																	<ArrowUpIcon className="size-3.5" />
																) : header.column.getIsSorted() === "desc" ? (
																	<ArrowDownIcon className="size-3.5" />
																) : (
																	<ArrowUpDownIcon className="size-3.5 opacity-40" />
																)}
															</button>
														) : (
															flexRender(header.column.columnDef.header, header.getContext())
														)}
													</th>
												))}
											</tr>
										))}
									</thead>
									<tbody>
										{table.getRowModel().rows.map((row) => (
											<tr
												key={row.id}
												className="border-b border-border last:border-0 hover:bg-accent/30"
											>
												{row.getAllCells().map((cell) => (
													<td key={cell.id} className="px-4 py-3 align-middle">
														{flexRender(cell.column.columnDef.cell, cell.getContext())}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>

						{/* Mobile / tablet cards */}
						<div className="grid gap-4 md:hidden">
							{filtered.map((product) => {
								const status = getStockStatus(product.stock);
								return (
									<Card key={product.id}>
										<CardContent className="flex gap-3">
											<ProductThumbnail
												src={product.image}
												alt={product.name}
												className="size-20 rounded-xl"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold text-foreground">
													{product.name}
												</p>
												<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
													{product.description}
												</p>
												<div className="mt-2 flex flex-wrap items-center gap-2">
													<span className="text-sm font-semibold text-foreground">
														{formatCurrency(product.price)}
													</span>
													<Badge variant={status.variant}>
														{status.label} · {product.stock}
													</Badge>
												</div>
												<div className={`mt-3 flex gap-2${isAdmin ? "" : " hidden"}`}>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => setFormState({ open: true, product })}
													>
														<PencilIcon />
														Edit
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="text-destructive"
														onClick={() => {
															setDeleteError("");
															setDeleteTarget(product);
														}}
													>
														<Trash2Icon />
														Delete
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					</>
				))}

			<ProductFormModal
				key={formState.product?.id ?? "new-product"}
				open={formState.open}
				product={formState.product}
				onOpenChange={(open) =>
					setFormState((previous) => ({ open, product: open ? previous.product : null }))
				}
			/>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title="Delete product"
				description={
					deleteTarget
						? `Permanently remove “${deleteTarget.name}” from your catalogue?`
						: "Delete this product?"
				}
				warning="This action cannot be undone."
				confirmLabel="Delete product"
				isPending={isDeleting}
				error={deleteError}
				onConfirm={() => void handleDelete()}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						setDeleteError("");
					}
				}}
			/>
		</div>
	);
}
