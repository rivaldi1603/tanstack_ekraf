/**
 * Tiny in-memory, sliding-window rate limiter used to slow down credential
 * stuffing / brute-force attempts against the login endpoint.
 *
 * It is deliberately simple: the app has no persistent store by design, so the
 * limiter lives for the lifetime of a server process (a single dev server or one
 * warm serverless instance). That is enough to blunt scripted attacks; a
 * production deployment with multiple instances should back this with Redis.
 */

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 20;

/** key -> timestamps (ms) of the failed attempts inside the current window. */
const failures = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number) {
	if (now - lastSweep < WINDOW_MS) return;
	lastSweep = now;
	for (const [key, timestamps] of failures) {
		const recent = timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
		if (recent.length === 0) {
			failures.delete(key);
		} else {
			failures.set(key, recent);
		}
	}
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds: number;
	reason?: "account" | "ip";
}

/** Check whether `key` may attempt another login right now with given maxAttempts. */
export function checkLoginRateLimit(
	key: string,
	maxAttempts: number = MAX_ATTEMPTS,
	now: number = Date.now(),
): RateLimitResult {
	sweep(now);
	const timestamps = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
	if (timestamps.length >= maxAttempts) {
		const oldest = Math.min(...timestamps);
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)),
		};
	}
	return { allowed: true, remaining: maxAttempts - timestamps.length, retryAfterSeconds: 0 };
}

/**
 * Dual-tier check: protects both specific user accounts (max 5 fails / 60s per IP::email)
 * and global IP addresses (max 20 fails / 60s per IP to prevent credential stuffing).
 */
export function checkDualLoginRateLimit(
	ip: string,
	email: string,
	now: number = Date.now(),
): RateLimitResult {
	// First check overall IP limit
	const ipLimit = checkLoginRateLimit(`ip:${ip}`, MAX_IP_ATTEMPTS, now);
	if (!ipLimit.allowed) {
		return { ...ipLimit, reason: "ip" };
	}

	// Then check specific targeted account limit
	const targetLimit = checkLoginRateLimit(`target:${ip}::${email}`, MAX_ATTEMPTS, now);
	if (!targetLimit.allowed) {
		return { ...targetLimit, reason: "account" };
	}

	return {
		allowed: true,
		remaining: Math.min(ipLimit.remaining, targetLimit.remaining),
		retryAfterSeconds: 0,
	};
}

/** Record a failed attempt for `key`, starting/extending the window. */
export function recordLoginFailure(key: string, now: number = Date.now()) {
	sweep(now);
	const timestamps = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
	timestamps.push(now);
	failures.set(key, timestamps);
}

/** Record failed attempt across both IP and IP::email buckets. */
export function recordDualLoginFailure(ip: string, email: string, now: number = Date.now()) {
	recordLoginFailure(`ip:${ip}`, now);
	recordLoginFailure(`target:${ip}::${email}`, now);
}

/** Clear the failure history for `key` after a successful login. */
export function clearLoginFailures(key: string) {
	failures.delete(key);
}

/** Clear the failure history for an authenticated account. */
export function clearDualLoginFailures(ip: string, email: string) {
	clearLoginFailures(`target:${ip}::${email}`);
}

/** Derive a best-effort client identity from proxy headers. */
export function getClientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0];
		if (first && first.trim().length > 0) return first.trim();
	}
	return (
		request.headers.get("x-real-ip") ??
		request.headers.get("cf-connecting-ip") ??
		request.headers.get("x-vercel-forwarded-for") ??
		"unknown"
	);
}

export const LOGIN_RATE_LIMIT = { windowMs: WINDOW_MS, maxAttempts: MAX_ATTEMPTS } as const;
