# NOTES

## What was broken (and how I fixed it)

The product form was the worst offender: the old pages read values with
`value={form.getFieldValue("name")}` on `@tanstack/react-form` without ever rendering a
`<form.Field>` subscription, so typing updated internal form state but never re-rendered
the inputs — the fields looked frozen and every keystroke was invisible. I rebuilt the
form as `src/components/ProductFormModal.tsx` and switched every input to
`<form.Field name="…">{(field) => …}</form.Field>`, reading `field.state.value`,
`field.handleChange` and `field.state.meta.errors` inside the render prop. That single
change makes the fields reactive again and gives per-field, real-time validation for
free. The route/architecture was also out of step with the brief: CRUD lived on separate
pages (`/products/new`, `/products/$productId`, `/users/$userId`) instead of modals, the
admin area had no layout, `/dashboard` pointed "unauthenticated" users at the demo route
(`/demo/better-auth`) which has now been deleted, and each page re-implemented its own
`beforeLoad` session check. I moved the admin pages under a pathless `_admin` layout
(`src/routes/_admin.tsx` → `DashboardShell`) that performs the session check once,
renders the collapsible sidebar/drawer, and exposes the signed-in viewer (with role) to
children through route context; product and user mutations now happen in
`ProductFormModal` and `UserRoleModal` dialogs on the list pages. Finally, the scaffold
shipped four real Biome errors — the `@import "tw-animate-css"` directive sitting after
`@plugin` in `src/styles.css`, a `background-color` longhand overridden by a later
`background` shorthand in the same rule, an array-index `key` in
`src/components/ui/slider.tsx`, and `dangerouslySetInnerHTML` for the theme bootstrap in
`src/routes/__root.tsx`. The CSS fixes are one-line reorders, the slider now derives
stable unique thumb keys (suffixing the *n*-th occurrence of a repeated value, since a
collapsed range legitimately has two equal thumbs), and the theme bootstrap moved out of
an injected string into a real, lint-clean static file (`public/theme-init.js`) loaded
from `<head>`, which removes the injection surface entirely. I also made `/setup`
genuinely idempotent: `seedAdmin` now short-circuits when an administrator already
exists, de-duplicates sample products, survives a concurrent double-click by sharing an
in-flight promise, and converts a failed sign-up into a clean error instead of a crash.
Two smaller defects showed up only once the app was driven in a browser: the mobile
drawer was hidden with an off-screen transform alone (`-translate-x-full`), which left the
whole sidebar — links, theme toggle, sign-out — sitting in the accessibility tree and the
tab order at every viewport width, so it is now hidden with `invisible` and restored with
`lg:visible`, keeping the slide animation because `visibility` is part of the transition;
and a signed-in "user" (non-admin) could see *Add product*, *Edit* and *Delete* controls
that were guaranteed to fail with a 403, because only the server enforced the role. The
products and dashboard views now read the viewer's role from route context and hide every
mutating control for non-admins (a "View only" label replaces the row actions), while the
server keeps enforcing `requireAdmin()` regardless — the UI gating is convenience, not
security.

## Security enhancements

- **Server-side authorisation on every server function.** `getProducts`, `createProduct`,
  `updateProduct`, `deleteProduct`, `getUsers`, `updateUserRole` and `deleteUser` all call
  `requireAuth()` / `requireAdmin()` before touching data, so the role check happens on the
  server even if the UI is bypassed. Prevents *privilege escalation* and *broken access
  control* (an unauthenticated or non-admin caller crafting requests by hand).

- **Admin self-demotion and self-deletion blocks.** `updateUserRole` rejects a request where
  `data.userId === user.id && data.role !== "admin"`, and `deleteUser` rejects deleting your
  own account (both throw HTTP 400). The existing "last administrator" guard is kept for
  both operations. Prevents *self-inflicted privilege loss*, *account lockout* and an admin
  destroying the audit trail of their own actions.

- **Dual-tier login rate limiting.** `src/lib/rate-limit.ts` implements a two-bucket sliding window limiter: a targeted bucket (5 failed attempts per `IP::email` per 60 s) and a global network bucket (20 failed attempts per `IP` per 60 s) wired into `src/routes/api/auth/$.ts`. Successful logins clear the target counter. Prevents *credential stuffing*, *dictionary scanning*, and *brute-force password guessing* across multiple accounts from a single IP.

- **Strict, server-side Zod validation with XSS sanitization for products.** `productSchema` trims and strips HTML tags/control characters from `name` (1–100) and `description` (1–1000) via `sanitizeText`, coerces and bounds `price` (0–1e9) and `stock` (integer, 0–1e6), and validates `image`. Numbers are coerced on the server, so a client cannot submit `-1`, `NaN`, `1e12`, or a giant string. Prevents *stored XSS*, *negative/huge price or stock injection*, *malformed records* and *resource exhaustion*.

- **Universal image dimension limits for PNG, JPEG, WebP, and GIF.** `src/lib/image.ts` parses binary file headers for PNG (IHDR), JPEG (SOF), WebP (VP8/VP8L/VP8X chunks), and GIF (GIF87a/89a) to strictly enforce the 512×512 px limit and 500 KB payload on the server. The client mirrors this check on uploads and URL inputs, auto-downscaling oversize images on a `<canvas>` before saving. Prevents *dimension limit bypass*, *multi-megabyte payload DoS*, *memory exhaustion*, and *stored malicious data URLs*.

- **Administrative mutation audit trail.** `src/lib/db.ts` and `src/lib/server/audit.ts` maintain an in-memory security audit log of every catalog mutation (`createProduct`, `updateProduct`, `deleteProduct`), role change (`updateUserRole`), user removal (`deleteUser`), and database seed (`seedAdmin`), with actor email, role, action, and timestamp. Displayed in real time on the admin dashboard. Provides *accountability, non-repudiation, and audit compliance*.

- **Interactive password strength meter and policy.** The registration card in `src/routes/login.tsx` computes password entropy (length, casing, digits, special characters) with real-time visual progress feedback (Weak, Fair, Good, Strong) to guide users toward resilient passphrases before account creation.

- **Active router invalidation on auth transitions.** `login.tsx`, `header-user.tsx`, and `_admin.tsx` invoke `router.invalidate()` upon sign in, sign up, and sign out to guarantee all TanStack Router loaders and route context refresh synchronously without stale session cache.

- **Hardened session cookies.** `src/lib/auth.ts` sets `httpOnly: true` (the browser JS can never read the session cookie), `sameSite: "lax"` (blocks cross-site POSTs), `secure` and `useSecureCookies` only in production (so the cookie never travels over plain HTTP), plus a measured `expiresIn` of 7 days and `updateAge` of 1 day. Prevents *session theft via XSS*, *CSRF*, and *session fixation/token leakage over HTTP*.

- **No `dangerouslySetInnerHTML`.** The pre-paint theme bootstrap was previously injected as a raw HTML string into a `<script>` tag; it is now a static, lint-clean file (`public/theme-init.js`) referenced by `src/routes/__root.tsx`. Prevents *raw-HTML injection / XSS* through any future interpolation into that bootstrap string, and removes the Biome security warning at the source instead of suppressing it.

- **Role-aware UI on top of (not instead of) server enforcement.** Products and the dashboard hide *Add/Edit/Delete/New product* from non-admins and the users page renders an "Administrators only" panel, but every one of those actions is still re-checked by `requireAdmin()` on the server. Prevents *confusing dead-end 403s* without weakening the rule that authorisation is decided server-side.

- **First-class Standard User experience & self-service profile.** The application now treats regular users as complete, first-class participants rather than just displaying locked screens:
  - Both `admin@example.com` (Admin) and `user@example.com` (Standard Member) are seeded automatically via `/setup` with dedicated quick-fill buttons on `/login`.
  - Regular users can browse the entire catalogue and inspect full product details, prices, stock statuses, and high-resolution images via `ProductDetailModal` on both desktop and mobile views.
  - A dedicated `UserProfileModal` allows members to inspect their workspace permissions, view their account status, and safely update their display name via `updateCurrentUserProfile` (protected by `requireAuth()` with Zod and XSS sanitization, and tracked in the audit log).
  - Visiting `/users` as a regular user displays a clean administrative access notice alongside an informative "Your Account Profile" card with a direct link to edit their display name.
  - The dashboard features tailored cards for members (Account Role: Member, read-only catalogue browsing actions) instead of showing empty placeholders.

## Known behaviour

- The **first** `/setup` seed also establishes a session: `seedAdmin` calls Better Auth's
  `signUpEmail`, which signs the new account in, and the `tanstackStartCookies` plugin
  writes that `Set-Cookie` onto the seed response. It is a development convenience — the
  credentials are printed on the same public page, and repeat clicks take the idempotent
  early-return path and set no cookie — but the seed remains a public endpoint, so treat
  `/setup` as a development-only route.

## Verified end-to-end in a browser

| Check | Result |
|---|---|
| `/setup` seed, then a second click | Both admin and standard user created; 3 products; second click is an idempotent no-op |
| Login with Admin demo | Lands on `/dashboard` with full CRUD, audit trail, and user management controls |
| Login with Standard User demo | Lands on `/dashboard` displaying "Account Role: Member", read-only stats, and catalogue quick actions |
| Standard User on `/products` | Desktop & mobile display "View details" button; opening `ProductDetailModal` renders high-res image and full specifications |
| Standard User on `/users` | Displays administrator restriction banner alongside "Your Account Profile" card |
| Edit display name via `UserProfileModal` | Name updates instantly across sidebar, header, and dashboard; audit log records `USER_PROFILE_UPDATED` |
| Partly-filled product form | per-field errors: "Name is required", etc. |
| Create product with an image URL | new row + thumbnail, modal closes |
| Sign-in with a wrong password | inline "Incorrect email or password." |
| Sign-in with the demo admin | lands on `/dashboard`, `document.cookie` is empty (httpOnly holds) |
| 6 rapid failed logins | attempts 1–5 → 401, attempt 6 → 429 with the retry message |
| Non-admin via `fetch` to the server-fn endpoint | `You cannot change your own role…` / `You cannot delete your own account.` — the UI blocks these, but the guard also fires when the request is hand-built |
| Unauthenticated `fetch` to `updateUserRole` | `Unauthorized` (401) |
| Non-admin `fetch` to `createProduct` | `Forbidden: admin required` (403) |
| Sign out from the sidebar | redirects to `/login` with clean session invalidation |

## Verification

```bash
bunx tsr generate   # regenerated src/routeTree.gen.ts for the new route tree
bun run format      # biome format --write
bun run lint        # biome check → 0 errors, 0 warnings
bun run build       # vite build → success
bunx tsc --noEmit   # 0 type errors
```

