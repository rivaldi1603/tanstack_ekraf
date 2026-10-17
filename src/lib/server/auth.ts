import { createServerFn } from "@tanstack/react-start";

import { auth } from "@/lib/auth";
import {
	type Product,
	type Role,
	SEED_ADMIN_EMAIL,
	SEED_ADMIN_PASSWORD,
	db,
	getUserRole,
	setUserRole,
} from "@/lib/db";
import { getCurrentSession } from "@/lib/session";

/**
 * Server-only session lookup. Safe to call from TanStack Router `beforeLoad`
 * (which runs on the client during client navigation) because server
 * functions always execute on the server.
 */
export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
	return getCurrentSession();
});

/**
 * The signed-in viewer plus their role. Used by the admin shell so it can show
 * the current role badge without leaking anything to unauthenticated clients.
 */
export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
	const { session, user } = await getCurrentSession();
	if (!session || !user) {
		return { user: null, role: null as Role | null };
	}
	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.name ?? null,
			image: user.image ?? null,
		},
		role: getUserRole(user.id),
	};
});

export interface SeedResult {
	ok: boolean;
	alreadySeeded: boolean;
	admin: string;
	productCount: number;
	message: string;
}

const SAMPLE_PRODUCTS = [
	{
		name: "Starter Kit",
		description: "Everything you need to begin. A curated bundle for new makers.",
		price: 49,
		stock: 12,
		image: "https://picsum.photos/seed/ekraf-starter-kit/512/512",
	},
	{
		name: "Pro Plan",
		description: "For growing teams that need collaboration and priority support.",
		price: 149,
		stock: 5,
		image: "https://picsum.photos/seed/ekraf-pro-plan/512/512",
	},
	{
		name: "Enterprise",
		description: "Self-hosted, full support, and a dedicated success manager.",
		price: 499,
		stock: 1,
		image: "https://picsum.photos/seed/ekraf-enterprise/512/512",
	},
];

function hasAdminAccount(): boolean {
	return db.user.some((u) => getUserRole(u.id) === "admin");
}

function seedSampleProducts(): void {
	const now = new Date().toISOString();
	const products: Product[] = SAMPLE_PRODUCTS.map((product) => ({
		id: crypto.randomUUID(),
		...product,
		createdAt: now,
		updatedAt: now,
	}));
	db.product.push(...products);
}

async function runSeed(): Promise<SeedResult> {
	// Idempotent: if an administrator exists we never create a second one and we
	// never duplicate the sample catalogue.
	if (hasAdminAccount()) {
		return {
			ok: true,
			alreadySeeded: true,
			admin: SEED_ADMIN_EMAIL,
			productCount: db.product.length,
			message: "Admin account already exists — nothing to do.",
		};
	}

	let adminUser = db.user.find((u) => u.email === SEED_ADMIN_EMAIL);

	if (!adminUser) {
		try {
			await auth.api.signUpEmail({
				body: {
					email: SEED_ADMIN_EMAIL,
					password: SEED_ADMIN_PASSWORD,
					name: "Administrator",
				},
				headers: new Headers(),
			});
		} catch (error) {
			// A concurrent seed (or a pre-existing account) may have won the race.
			adminUser = db.user.find((u) => u.email === SEED_ADMIN_EMAIL);
			if (!adminUser) {
				const err = new Error(
					error instanceof Error ? error.message : "Could not create the admin account",
				) as Error & { status?: number };
				err.status = 500;
				throw err;
			}
		}
		adminUser = adminUser ?? db.user.find((u) => u.email === SEED_ADMIN_EMAIL);
	}

	if (!adminUser) {
		const err = new Error("Could not create the admin account") as Error & { status?: number };
		err.status = 500;
		throw err;
	}

	setUserRole(adminUser.id, "admin");

	if (db.product.length === 0) {
		seedSampleProducts();
	}

	return {
		ok: true,
		alreadySeeded: false,
		admin: SEED_ADMIN_EMAIL,
		productCount: db.product.length,
		message: "Administrator account and sample products created.",
	};
}

let seedInFlight: Promise<SeedResult> | null = null;

/**
 * One-time development seed: creates the administrator account (password hashed
 * by Better Auth) and seeds sample products.
 *
 * Idempotent and concurrency-safe: repeated clicks reuse the in-flight promise
 * and anything after the first success short-circuits before writing.
 */
export const seedAdmin = createServerFn({ method: "POST" }).handler(async () => {
	seedInFlight ??= runSeed().finally(() => {
		seedInFlight = null;
	});
	return seedInFlight;
});
