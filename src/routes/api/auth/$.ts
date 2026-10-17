import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import {
	checkLoginRateLimit,
	clearLoginFailures,
	getClientIp,
	recordLoginFailure,
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
		const key = `${getClientIp(request)}::${await readSubmittedEmail(request)}`;
		const limit = checkLoginRateLimit(key);

		if (!limit.allowed) {
			return Response.json(
				{
					code: "TOO_MANY_REQUESTS",
					message: `Too many failed login attempts. Please try again in ${limit.retryAfterSeconds} second(s).`,
				},
				{
					status: 429,
					headers: { "Retry-After": String(limit.retryAfterSeconds) },
				},
			);
		}

		const response = await auth.handler(request);
		if (response.status >= 400) {
			recordLoginFailure(key);
		} else {
			clearLoginFailures(key);
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
