import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import {
	checkDualLoginRateLimit,
	clearDualLoginFailures,
	getClientIp,
	recordDualLoginFailure,
} from "#/lib/rate-limit";

/**
 * Read the submitted email so we can throttle per (IP, email) pair instead of
 * only per IP. `request.clone()` keeps the original body readable for the auth
 * handler that runs afterwards.
 */
async function readSubmittedEmail(request: Request): Promise<string> {
	try {
		const body: unknown = await request.clone().json();
		if (body && typeof body === "object" && "email" in body) {
			const email = (body as { email?: unknown }).email;
			if (typeof email === "string") return email.trim().toLowerCase();
		}
	} catch {
		// Malformed/empty body — fall through to the shared bucket.
	}
	return "unknown";
}

async function handleAuthRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === "POST" && url.pathname.includes("/sign-in/")) {
		const ip = getClientIp(request);
		const email = await readSubmittedEmail(request);
		const limit = checkDualLoginRateLimit(ip, email);

		if (!limit.allowed) {
			const reasonMessage =
				limit.reason === "ip"
					? "Too many failed login attempts from this network. Please wait a minute and try again."
					: `Too many failed login attempts for this account. Please try again in ${limit.retryAfterSeconds} second(s).`;

			return Response.json(
				{
					code: "TOO_MANY_REQUESTS",
					message: reasonMessage,
				},
				{
					status: 429,
					headers: { "Retry-After": String(limit.retryAfterSeconds) },
				},
			);
		}

		const response = await auth.handler(request);
		if (response.status >= 400) {
			recordDualLoginFailure(ip, email);
		} else {
			clearDualLoginFailures(ip, email);
		}
		return response;
	}

	return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
			POST: ({ request }) => handleAuthRequest(request),
		},
	},
});
