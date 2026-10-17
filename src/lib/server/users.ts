import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db, getUserRole, recordAuditLog, removeUserRole, setUserRole } from "@/lib/db";
import { sanitizeText } from "@/lib/product-schema";
import { requireAdmin, requireAuth } from "@/lib/session";

export const updateProfileSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(100, "Name is too long")
		.transform(sanitizeText),
});

export const userRoleSchema = z.object({
	userId: z.string().min(1, "User id is required"),
	role: z.enum(["admin", "user"]),
});

export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
	await requireAdmin();
	return db.user.map((u) => ({
		id: u.id,
		email: u.email,
		name: u.name,
		role: getUserRole(u.id),
		emailVerified: !!u.emailVerified,
		createdAt:
			u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt).toISOString(),
	}));
});

export const updateUserRole = createServerFn({ method: "POST" })
	.validator(userRoleSchema)
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();

		// An administrator may not demote themselves: doing so could strip the
		// last admin of their rights mid-session (privilege loss / lockout).
		if (data.userId === user.id && data.role !== "admin") {
			const err = new Error(
				"You cannot change your own role. Ask another administrator instead.",
			) as Error & { status?: number };
			err.status = 400;
			throw err;
		}

		// Never allow the last administrator to be demoted.
		if (data.role !== "admin" && getUserRole(data.userId) === "admin") {
			const adminCount = db.userRole.filter((r) => r.role === "admin").length;
			if (adminCount <= 1) {
				const err = new Error("Cannot demote the last administrator") as Error & {
					status?: number;
				};
				err.status = 400;
				throw err;
			}
		}

		const target = db.user.find((u) => u.id === data.userId);
		setUserRole(data.userId, data.role);
		recordAuditLog({
			action: "USER_ROLE_UPDATED",
			actorEmail: user.email,
			actorRole: "admin",
			details: `Changed role of user ${target?.email ?? data.userId} to "${data.role}"`,
		});
		return { ok: true };
	});

export const deleteUser = createServerFn({ method: "POST" })
	.validator(z.object({ userId: z.string().min(1, "User id is required") }))
	.handler(async ({ data }) => {
		const { user } = await requireAdmin();

		// No self-deletion: prevents an admin from destroying their own account
		// (and any audit trail) by mistake or through a forged request.
		if (data.userId === user.id) {
			const err = new Error("You cannot delete your own account.") as Error & {
				status?: number;
			};
			err.status = 400;
			throw err;
		}

		// Prevent removing the last administrator so the app never locks itself out.
		if (getUserRole(data.userId) === "admin") {
			const adminCount = db.userRole.filter((r) => r.role === "admin").length;
			if (adminCount <= 1) {
				const err = new Error("Cannot delete the last administrator") as Error & {
					status?: number;
				};
				err.status = 400;
				throw err;
			}
		}

		const target = db.user.find((u) => u.id === data.userId);
		db.user = db.user.filter((u) => u.id !== data.userId);
		removeUserRole(data.userId);
		recordAuditLog({
			action: "USER_DELETED",
			actorEmail: user.email,
			actorRole: "admin",
			details: `Deleted user ${target?.email ?? data.userId}`,
		});
		return { ok: true };
	});

export const updateCurrentUserProfile = createServerFn({ method: "POST" })
	.validator(updateProfileSchema)
	.handler(async ({ data }) => {
		const { user } = await requireAuth();
		const existing = db.user.find((u) => u.id === user.id);
		if (!existing) {
			const err = new Error("User account not found") as Error & { status?: number };
			err.status = 404;
			throw err;
		}

		const previousName = existing.name;
		existing.name = data.name;
		existing.updatedAt = new Date();

		recordAuditLog({
			action: "USER_PROFILE_UPDATED",
			actorEmail: user.email,
			actorRole: getUserRole(user.id),
			details: `Updated profile name from "${previousName ?? "none"}" to "${data.name}"`,
		});

		return { ok: true, name: data.name };
	});
