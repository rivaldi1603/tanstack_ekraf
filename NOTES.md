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

- **Login rate limiting.** `src/lib/rate-limit.ts` is a small sliding-window limiter (5
  failed attempts per `IP::email` per 60 s) wired into `src/routes/api/auth/$.ts`, which
  reads the submitted email from a cloned request body and returns `429 Too Many Requests`
  with a `Retry-After` header and a human-readable message. Successful logins clear the
  counter. Prevents *credential stuffing* and *brute-force password guessing*.

- **Strict, server-side Zod validation for products.** `productSchema` trims and caps
  `name` (1–100) and `description` (1–1000), coerces and bounds `price` (0–1e9) and `stock`
  (integer, 0–1e6), and validates `image`. Numbers are coerced on the server, so a client
  cannot submit `-1`, `NaN`, `1e12`, or a giant string. Prevents *negative/huge price or
  stock injection*, *malformed records* and *resource exhaustion*.

- **Image validation with size and dimension limits (server and client).** `image` must be
  an `https://` URL or a `data:image/(png|jpeg|webp|gif);base64,…` payload of at most 500 KB;
  for PNG/JPEG the server decodes the header and rejects anything larger than 512×512 px.
  The client reuses the exact same rules, and the upload flow auto-downscales oversize
  files on a `<canvas>` before storing them. Prevents *multi-megabyte payload DoS*,
  *memory exhaustion from huge base64 blobs*, and *stored malicious data URLs*
  (only `https:` external images are accepted, so `javascript:`/`file:`/`http:` are out).

- **Hardened session cookies.** `src/lib/auth.ts` sets `httpOnly: true` (the browser JS can
  never read the session cookie), `sameSite: "lax"` (blocks cross-site POSTs), `secure` and
  `useSecureCookies` only in production (so the cookie never travels over plain HTTP), plus
  a measured `expiresIn` of 7 days and `updateAge` of 1 day. Prevents *session theft via
  XSS*, *CSRF*, and *session fixation/token leakage over HTTP*.

- **No `dangerouslySetInnerHTML`.** The pre-paint theme bootstrap was previously injected as
  a raw HTML string into a `<script>` tag; it is now a static, lint-clean file
  (`public/theme-init.js`) referenced by `src/routes/__root.tsx`. Prevents *raw-HTML
  injection / XSS* through
  any future interpolation into that bootstrap string, and removes the Biome security
  warning at the source instead of suppressing it.

- **Role-aware UI on top of (not instead of) server enforcement.** Products and the
  dashboard hide *Add/Edit/Delete/New product* from non-admins and the users page renders
  an "Administrators only" panel, but every one of those actions is still re-checked by
  `requireAdmin()` on the server. Prevents *confusing dead-end 403s* without weakening the
  rule that authorisation is decided server-side.

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
| `/setup` seed, then a second click | 3 products; second click is a no-op |
| Partly-filled product form | per-field errors: "Name is required", etc. |
| Create product with an image URL | new row + thumbnail, modal closes |
| Sign-in with a wrong password | inline "Incorrect email or password." |
| Sign-in with the demo admin | lands on `/dashboard`, `document.cookie` is empty (httpOnly holds) |
| 6 rapid failed logins | attempts 1–5 → 401, attempt 6 → 429 with the retry message |
| Non-admin via `fetch` to the server-fn endpoint | `You cannot change your own role…` / `You cannot delete your own account.` — the UI blocks these, but the guard also fires when the request is hand-built |
| Unauthenticated `fetch` to `updateUserRole` | `Unauthorized` |
| `/users` as a non-admin | "Administrators only" panel; `getUsers` never called |
| Sign out from the sidebar | redirects to `/login` |

## Verification

```bash
bunx tsr generate   # regenerated src/routeTree.gen.ts for the new route tree
bun run format      # biome format --write
bun run lint        # biome check → 0 errors, 0 warnings
bun run build       # vite build → success
bunx tsc --noEmit   # no type errors
```
