import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
	BoxesIcon,
	DollarSignIcon,
	LockIcon,
	PackageIcon,
	PlusIcon,
	RefreshCwIcon,
	SparklesIcon,
	TrendingUpIcon,
	UsersIcon,
} from "lucide-react";
import { useState } from "react";

import ProductFormModal from "@/components/ProductFormModal";
import ProductThumbnail from "@/components/ProductThumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProducts } from "@/lib/server/products";
import { getUsers } from "@/lib/server/users";
import { formatCurrency, getStockStatus } from "@/lib/types";

export const Route = createFileRoute("/_admin/dashboard")({
	component: DashboardPage,
});

const STAT_SKELETON_KEYS = ["products", "stock", "value", "team"] as const;
const ROW_SKELETON_KEYS = ["first", "second", "third"] as const;

function DashboardPage() {
	const { viewer } = Route.useRouteContext();
	const isAdmin = viewer.role === "admin";

	const productsQuery = useQuery({
		queryKey: ["dashboard", "products"],
		queryFn: async () => getProducts(),
	});
	const usersQuery = useQuery({
		queryKey: ["dashboard", "users"],
		queryFn: async () => getUsers(),
		enabled: isAdmin,
	});

	const [formOpen, setFormOpen] = useState(false);

	const products = productsQuery.data ?? [];
	const users = usersQuery.data ?? [];
	const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
	const inventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);
	const adminCount = users.filter((user) => user.role === "admin").length;
	const recentProducts = products.slice(0, 5);
	const isLoading = productsQuery.isPending;

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="island-kicker mb-1">Overview</p>
					<h1 className="display-title text-3xl font-bold text-foreground sm:text-4xl">
						Welcome back{viewer.user?.name ? `, ${viewer.user.name}` : ""}
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Every write is validated and authorised on the server before it touches your data.
					</p>
				</div>
				{isAdmin && (
					<Button type="button" onClick={() => setFormOpen(true)}>
						<PlusIcon />
						Add product
					</Button>
				)}
			</div>

			{productsQuery.isError && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					<span>
						Could not load your catalogue:{" "}
						{(productsQuery.error as Error | null)?.message ?? "unknown error"}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void productsQuery.refetch()}
					>
						<RefreshCwIcon />
						Retry
					</Button>
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{isLoading ? (
					STAT_SKELETON_KEYS.map((key) => <StatSkeleton key={key} />)
				) : (
					<>
						<StatCard
							label="Products"
							value={String(products.length)}
							hint="Items in your catalogue"
							icon={PackageIcon}
							tone="bg-[color:var(--lagoon)]/15 text-[color:var(--lagoon-deep)]"
						/>
						<StatCard
							label="Units in stock"
							value={String(totalStock)}
							hint="Across all products"
							icon={BoxesIcon}
							tone="bg-[color:var(--palm)]/15 text-[color:var(--palm)]"
						/>
						<StatCard
							label="Inventory value"
							value={formatCurrency(inventoryValue)}
							hint="Price × stock"
							icon={DollarSignIcon}
							tone="bg-amber-500/15 text-amber-600 dark:text-amber-400"
						/>
						<StatCard
							label="Team"
							value={isAdmin ? String(users.length) : "—"}
							hint={
								isAdmin
									? `${adminCount} administrator${adminCount === 1 ? "" : "s"}`
									: "Administrators only"
							}
							icon={UsersIcon}
							tone="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
						/>
					</>
				)}
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader className="flex-row items-center justify-between gap-3">
						<div className="min-w-0">
							<CardTitle className="flex items-center gap-2">
								<TrendingUpIcon className="size-4 text-[color:var(--lagoon-deep)]" />
								Latest products
							</CardTitle>
							<CardDescription>Your five most recently added items.</CardDescription>
						</div>
						<Link
							to="/products"
							className="shrink-0 text-sm font-medium text-[color:var(--lagoon-deep)] no-underline hover:underline"
						>
							View all
						</Link>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<ul className="space-y-3">
								{ROW_SKELETON_KEYS.map((key) => (
									<li
										key={key}
										className="flex items-center gap-3 rounded-xl border border-border p-3"
									>
										<div className="size-12 shrink-0 animate-pulse rounded-lg bg-muted" />
										<div className="flex-1 space-y-2">
											<div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
											<div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
										</div>
									</li>
								))}
							</ul>
						) : recentProducts.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
								<PackageIcon className="size-8 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium text-foreground">No products yet</p>
									<p className="text-xs text-muted-foreground">
										Add your first product to see it here.
									</p>
								</div>
								{isAdmin && (
									<Button type="button" size="sm" onClick={() => setFormOpen(true)}>
										<PlusIcon />
										Add product
									</Button>
								)}
							</div>
						) : (
							<ul className="space-y-3">
								{recentProducts.map((product) => {
									const status = getStockStatus(product.stock);
									return (
										<li
											key={product.id}
											className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-accent/40"
										>
											<ProductThumbnail
												src={product.image}
												alt={product.name}
												className="size-12 rounded-lg"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-foreground">
													{product.name}
												</p>
												<p className="truncate text-xs text-muted-foreground">
													{product.description}
												</p>
											</div>
											<div className="flex shrink-0 flex-col items-end gap-1">
												<span className="text-sm font-semibold text-foreground">
													{formatCurrency(product.price)}
												</span>
												<Badge variant={status.variant}>{status.label}</Badge>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<SparklesIcon className="size-4 text-[color:var(--palm)]" />
							Quick actions
						</CardTitle>
						<CardDescription>Jump straight into the areas you use most.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{isAdmin && (
							<Button
								type="button"
								variant="outline"
								className="w-full justify-start"
								onClick={() => setFormOpen(true)}
							>
								<PlusIcon />
								New product
							</Button>
						)}
						<Button asChild variant="outline" className="w-full justify-start">
							<Link to="/products" className="no-underline">
								<PackageIcon />
								Manage products
							</Link>
						</Button>
						{isAdmin ? (
							<Button asChild variant="outline" className="w-full justify-start">
								<Link to="/users" className="no-underline">
									<UsersIcon />
									Manage users
								</Link>
							</Button>
						) : (
							<div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-xs text-muted-foreground">
								<LockIcon className="size-4" />
								User management requires an administrator.
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<ProductFormModal open={formOpen} product={null} onOpenChange={(open) => setFormOpen(open)} />
		</div>
	);
}

function StatCard({
	label,
	value,
	hint,
	icon: Icon,
	tone,
}: {
	label: string;
	value: string;
	hint: string;
	icon: typeof PackageIcon;
	tone: string;
}) {
	return (
		<Card>
			<CardContent className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						{label}
					</p>
					<p className="mt-1 truncate text-2xl font-bold text-foreground">{value}</p>
					<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
				</div>
				<span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
					<Icon className="size-5" />
				</span>
			</CardContent>
		</Card>
	);
}

function StatSkeleton() {
	return (
		<Card>
			<CardContent className="space-y-3">
				<div className="h-3 w-24 animate-pulse rounded bg-muted" />
				<div className="h-7 w-16 animate-pulse rounded bg-muted" />
				<div className="h-3 w-32 animate-pulse rounded bg-muted" />
			</CardContent>
		</Card>
	);
}
