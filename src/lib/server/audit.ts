import { type AuditLog, db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { createServerFn } from "@tanstack/react-start";

/**
 * Server-only lookup for administrative audit logs.
 * Strictly enforced on the server — requires role `admin`.
 */
export const getAuditLogs = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuditLog[]> => {
		await requireAdmin();
		return [...db.auditLog];
	},
);
