import type { Role } from "./db";

/** Row shape returned by the `getUsers` server function. */
export interface UserRow {
	id: string;
	email: string;
	name: string | null;
	role: Role;
	emailVerified: boolean;
	createdAt: string;
}

export function getUserDisplayName(user: Pick<UserRow, "name" | "email">): string {
	const name = user.name?.trim();
	return name && name.length > 0 ? name : user.email;
}

export function getUserInitials(user: Pick<UserRow, "name" | "email">): string {
	const source = user.name?.trim() || user.email;
	const parts = source.split(/[\s@._-]+/).filter(Boolean);
	if (parts.length === 0) return "U";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export type StockBadgeVariant = "success" | "warning" | "destructive";

export interface StockStatus {
	label: string;
	variant: StockBadgeVariant;
}

/** Shared stock thresholds so badges read the same everywhere. */
export function getStockStatus(stock: number): StockStatus {
	if (stock <= 0) return { label: "Out of stock", variant: "destructive" };
	if (stock <= 5) return { label: "Low stock", variant: "warning" };
	return { label: "In stock", variant: "success" };
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

export function formatCurrency(value: number): string {
	return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatJoinedDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
