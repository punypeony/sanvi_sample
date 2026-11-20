# SANVI Audio

The shop is a Vite app. The API is in `server/` and uses MongoDB.

## Run it

MongoDB Compass connects with:

```
mongodb://127.0.0.1:27017/noir
```

This local database has no username or password. After `npm run seed`, refresh Compass and open the `noir` database.

1. Copy `.env.example` to `.env`.
2. Set `SESSION_SECRET` to at least 32 random characters.
3. Leave `ADMIN_PASSWORD` empty, or set one that is at least 12 characters.
4. Start MongoDB. A local `mongod` on port 27017 is enough. `docker compose up -d` is the other option. For Atlas, put the `mongodb+srv://...` string in `MONGODB_URI`.
5. Run `npm run seed`.

The seed prints the placeholder admin password once, and the placeholder customer password once. The customer email is `customer@example.com`. Change both passwords before anyone else can reach this machine. They are not written into the repo. Running the seed again does not reset them, and it does not put stock counts back.

`npm run dev` starts the shop and the API together. `GET /api/health` reports whether Mongo is connected.

Twelve more placeholder accounts exist only so the sample reviews have authors. Their passwords are random and are not printed.

Do not commit `.env`.

## Admin

Open `/admin` and sign in with the admin email and the password the seed printed. Change that password before anyone else can reach this machine.

A customer who signs in there is turned away. The API answers 403. The session cookie is httpOnly. State-changing requests send the CSRF token from `GET /api/auth/csrf`.

Cancelling or refunding an order puts stock back only when that order had reserved it. The seeded orders did not reserve stock. Low stock on the dashboard means a colorway count of 5 or less. Product photos upload to `server/uploads` (JPEG, PNG, or WebP, up to 2 MB). The session lasts 7 days.

## Accounts, shop, and checkout

Sign in at `/login`, or create an account at `/register`. The password needs 12 characters. The navbar shows the account name while you are signed in.

Forgot password always answers the same way. When the email is registered, the API process logs a reset link. That log is the stand-in for a real email provider.

A guest can open an order at `/orders` with the order number and the checkout email. Registering with that email offers to attach those orders to the new account.

The shop, standard product pages, and checkout read the API. The flagship story (`/` and `/products/noir`) still uses the local catalogue so the 3D page does not wait on the network. Cart lines stay in the browser for a guest. Signing in merges them with the saved cart and keeps the larger quantity when both sides have the same item.

Place order sends no card number. The API prices the cart from the database, reserves stock, and refuses a second order with the same idempotency key. In development, the checkout page can simulate a declined payment, which reserves nothing. Shipping is $12 until the subtotal reaches $50. A confirmation line is written to the API log.

The seams for later are `server/src/providers/payment.js` (Stripe), `server/src/providers/email.js` (a real provider), and `server/src/providers/storage.js` (S3 or Cloudinary). Order pricing, stock, and the charge decision stay in `server/src/services/orders.js`.

## Environment

| Variable | What it does |
| --- | --- |
| `MONGODB_URI` | Local `mongodb://127.0.0.1:27017/noir`, or an Atlas `mongodb+srv://` string. Tests use `noir-test` and drop it. |
| `PORT` | API port. Vite proxies `/api` to `4000`. |
| `CLIENT_ORIGIN` | The only browser origin allowed to call the API with cookies. |
| `SESSION_SECRET` | At least 32 characters. The session token itself is random; the database stores its hash. |
| `ADMIN_EMAIL` | Placeholder admin, `admin@example.com`. |
| `ADMIN_PASSWORD` | Optional. When it is empty, `npm run seed` generates one and prints it once. |
| `RATE_LIMIT_WINDOW_MS` | Window for both limiters. Default 15 minutes. |
| `RATE_LIMIT_MAX` | Requests per window on `/api`. Default 300. |
| `AUTH_RATE_LIMIT_MAX` | Posts to `/api/auth` per window. Default 10. Reads of `/me` and `/csrf` do not count. |

`npm run dev` starts the shop and the API together. `npm test` runs the API suite against `noir-test`. `npm run seed` loads the placeholder catalogue into the database named by `MONGODB_URI`.

Sign in as the placeholder admin at `/admin` with `admin@example.com` and the password the seed printed. Sign in as the placeholder customer at `/login` with `customer@example.com` and the other password the seed printed. Neither password is stored in the repo. A second seed does not reset them.

## API

Public and account:

- `GET /api/health`
- `GET /api/auth/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/register`, `POST /api/auth/password`, `POST /api/auth/forgot`, `POST /api/auth/reset`
- `PATCH /api/account`, `GET /api/account/orders`, `POST /api/account/orders/attach`, `GET /api/account/orders/:orderNumber`
- `GET /api/products`, `GET /api/products/:slug`, `GET /api/products/:slug/reviews`, `POST /api/products/:slug/reviews`
- `POST /api/orders`, `POST /api/orders/lookup`
- `GET /api/cart`, `PUT /api/cart`, `POST /api/cart/merge`
- `GET /api/uploads/:file`

Admin, all behind the admin role. Posts, patches, and deletes also require the CSRF header:

- `GET /api/admin/dashboard`
- `GET /api/admin/products`, `GET /api/admin/products/:id`, `POST /api/admin/products`, `PATCH /api/admin/products/:id`
- `POST /api/admin/products/:id/images`, `DELETE /api/admin/products/:id/images/:imageId`
- `GET /api/admin/orders`, `GET /api/admin/orders/:orderNumber`, `PATCH /api/admin/orders/:orderNumber`, `POST /api/admin/orders/:orderNumber/notes`
- `GET /api/admin/customers`, `GET /api/admin/customers/:id`, `PATCH /api/admin/customers/:id`, `POST /api/admin/users/:id/role`
- `GET /api/admin/reviews`, `PATCH /api/admin/reviews/:id`
- `GET /api/admin/audit`

## Security

Checked on 21 Nov 2026. The suite is `npm test`.

- Helmet is on. Responses send `nosniff`, a frame policy, a referrer policy, and a content security policy. `X-Powered-By` is removed.
- The session cookie `noir.sid` is httpOnly, `SameSite=Lax`, and `Secure` only when `NODE_ENV` is production. The CSRF cookie is readable by the page so the double-submit header can be set.
- CORS allows requests with no `Origin`, and the exact `CLIENT_ORIGIN`. Any other origin is refused.
- Login, logout, checkout, and every other state change require `x-csrf-token` to match the CSRF cookie.
- `/api` is limited to 300 requests per 15 minutes. Posts to `/api/auth` are limited to 10. The JSON body cap is 100kb. Keys that start with `$` are rejected.
- State-changing routes validate the body with zod. Order numbers and product ids in the path are length-capped. Image uploads are limited to 2 MB and must be JPEG, PNG, or WebP by magic bytes.
- `.env` is gitignored. `.env.example` has no real secret. The seed prints the two placeholder passwords once and does not write them into the repo.
- Access logs are the request line only. The email seam logs a reset link and an order number, and it does not log the address.
- `npm audit` on 21 Nov 2026: the API has one high finding, zod 3.25.76 (`GHSA-mrhx-c7xc-m3w5`). The fix is zod 4, which is a breaking upgrade, so this tree stays on zod 3. The shop has four moderate findings, all under the dev-only `@gltf-transform/cli` model tool (`glob` / `minimatch`). `npm audit fix --force` was not run.

The suite covers the auth flow, a customer calling an admin route (403), a client price that the order ignores, two orders racing for the last unit, an idempotency-key replay, and a refusal to demote or deactivate the last admin.

## Before going live

- Change the placeholder admin password, and the placeholder customer password if that account stays.
- Replace `server/src/providers/payment.js` with a real provider. The mock must not charge cards in production.
- Replace `server/src/providers/email.js` so reset links and receipts are delivered, not printed.
- Serve the site and the API over HTTPS, and set `NODE_ENV=production` so the session cookie is `Secure`.
- Put Mongo on a hosted cluster, restrict its network, and take backups.
- Rotate `SESSION_SECRET` and the database user password. Keep them out of git.
- Point `CLIENT_ORIGIN` at the real shop origin.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
