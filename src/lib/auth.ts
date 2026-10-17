import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { adapter } from "./db";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
	database: adapter,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
		maxPasswordLength: 128,
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // refresh the session at most once per day
		cookieCache: {
			enabled: true,
			maxAge: 60 * 15, // 15 minutes
		},
	},
	advanced: {
		// Harden the session cookie. The browser never needs to read it, so it is
		// httpOnly (blocks XSS cookie theft); `secure` is on in production so it can
		// never be sent over plain HTTP; `sameSite: lax` blocks cross-site POST
		// CSRF while keeping top-level navigations working.
		useSecureCookies: isProduction,
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: "lax",
			secure: isProduction,
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		},
	},
	plugins: [tanstackStartCookies()],
});

export default auth;
