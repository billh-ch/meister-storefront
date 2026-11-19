# Password reset

Customers reset their own password from **Sign in → Forgot your password?**. The storefront runs the whole flow itself; WordPress's own reset is not used because WordPress cannot send email from the Pi.

## Flow

1. `/forgot-password` → `requestPasswordResetAction` (`lib/auth/reset-actions.ts`). Always answers the same way for a valid-looking email. The lookup and email run in `after()`, so neither the answer nor its timing reveals whether an account exists.
2. `requestPasswordReset` (`lib/auth/password-reset.ts`) looks the customer up in WooCommerce (role `customer` only, so admin accounts never match), creates a 32-byte random token and stores **only its SHA-256 hash** in Redis (`auth:reset:{hash}`, 1 hour). A new request replaces the customer's previous link (`auth:reset-for:{customerId}`).
3. The email (Resend, `buildPasswordReset`) links to `/reset-password?token=…`. The page checks the token without consuming it and sends `Referrer-Policy: no-referrer`.
4. `resetPasswordAction` consumes the token atomically (`GETDEL`), sets the password with `PUT /customers/{id}` using the admin key, and hands the token back if WooCommerce fails so the shopper can retry.
5. On success: sessions issued before now stop counting (`auth:valid-after:{customerId}`, checked in `getSession`), a "password was changed" email is sent, and the shopper is sent to `/sign-in?reset=1`.

## Limits (all fail closed, because they guard a credential change and an inbox)

| Limit | Window |
|---|---|
| Reset requests per client | 5 / hour |
| Reset requests per email address | 3 / hour (silent) |
| Reset submissions per client | 10 / hour |

If Redis is unavailable, requests and resets are refused rather than allowed. The session cut-off check does the opposite on purpose: it fails open so a Redis outage never signs customers out.

## Sessions

Sessions are stateless iron-session cookies carrying `wcCustomerId` and `iat`. A reset writes a cut-off time; any session older than it reads as signed out. Cookies issued before this feature have no `iat`; they are only affected if that customer later resets.

## Not covered

- No "change password" form on the account page yet.
- The reset email comes from the same sender as order emails (`EMAIL_FROM`).
- The Redis store (`lib/auth/reset-store.ts`) is not unit-tested; the logic around it is (`tests/password-reset.test.mjs`).
