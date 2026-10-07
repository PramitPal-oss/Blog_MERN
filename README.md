# Inkstone MERN Blog

Inkstone is a complete blog application built for the supplied MERN Stack assignment. It supports local and social authentication, rotating refresh sessions, role-based administration, post and comment ownership, soft-deleted posts, activity logging, pagination, tests, and a responsive React interface.

## Features

- Email/password registration, login, refresh, and logout
- Short-lived JWT access tokens held in memory
- Rotating refresh JWTs in HttpOnly cookies with reuse detection and revocation
- Google and Facebook OAuth 2.0 login and explicit account linking
- `USER` and `ADMIN` roles enforced by the API
- Blog post CRUD with stable URL slugs, ownership, pagination, and soft deletion
- Referenced comment CRUD with ownership and admin moderation
- Real-time comment notifications using authenticated Socket.io with persistent MongoDB storage
- Notification bell, unread badge, popover dropdown, mark as read, and pagination
- Admin dashboard with user, active-post, and visible-comment totals
- Full admin management for users, posts, and comments
- Structured activity logs, rate limits, Helmet, CORS, strict validation, and safe errors
- Jest/Supertest/MongoDB integration tests and Vitest/React Testing Library tests
- Optional idempotent development seed data

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, React Router, Tailwind CSS 4, shadcn/ui (Radix primitives), Lucide React, Axios, React Hook Form, Zod, Socket.io Client |
| Backend | Node.js 24, Express 5, TypeScript, Mongoose, Passport, Pino, Socket.io |
| Database | MongoDB |
| Security | bcrypt, JWT, Helmet, CORS, rate limiting, HttpOnly cookies |
| Tests | Jest, Supertest, mongodb-memory-server, Vitest, Testing Library |

## Architecture

```text
React UI / AuthContext
        |
   Axios client
        |
    /api/v1 REST
        |
Express routes -> validation/security middleware -> controllers
        |                                         |
        +---------------- services ---------------+
                              |
                     Mongoose models
                              |
                           MongoDB
```

Controllers translate HTTP requests and responses. Services own business rules. Models define storage and indexes. Middleware handles authentication, roles, ownership, validation, rate limits, origin checks, logging, and errors.

```text
backend/src/
  config/ controllers/ middleware/ models/ routes/
  services/ tests/ types/ utils/ validators/
frontend/src/
  api/ components/ context/ layouts/ pages/
  routes/ styles/ tests/ types/
```

## Prerequisites

- Node.js 24 (the tested version is recorded in `.nvmrc`)
- npm 11+
- MongoDB 8 locally, in Docker, or through MongoDB Atlas
- Google and Facebook developer applications only if testing social login

## Installation

From the project root:

```powershell
npm.cmd ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

On shells where `npm` is directly available, use `npm` instead of `npm.cmd`.

Generate independent JWT secrets instead of retaining the example values:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run that command twice and set different values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## MongoDB setup

Use an existing MongoDB URI in `backend/.env`, or start the included Docker service:

```powershell
docker compose up -d mongodb
```

The default development URI is:

```text
mongodb://127.0.0.1:27017/mern_blog
```

The Compose-managed MongoDB is bound to `127.0.0.1:27018` by default to avoid colliding with a locally installed MongoDB. Override `MONGODB_HOST_PORT` when invoking Compose if another host port is preferred; containers always use the internal `mongodb:27017` address.

Create the declared indexes explicitly after the database is available:

```powershell
npm.cmd run db:indexes -w backend
```

The application also declares all indexes in its Mongoose schemas. Production operators should run the explicit command during deployment rather than depending on automatic index creation.

## Environment configuration

### Backend

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Express port; default example is `5000` |
| `TRUST_PROXY_HOPS` | Number of trusted proxy hops; keep `0` locally |
| `LOG_LEVEL` | Pino level such as `info` |
| `MONGODB_URI` | MongoDB connection string |
| `FRONTEND_URL` | Exact browser origin allowed by CORS and origin checks |
| `BACKEND_URL` | Public backend URL used for OAuth initiation links |
| `JWT_ACCESS_SECRET` | Independent secret of at least 32 characters |
| `JWT_REFRESH_SECRET` | Different independent secret of at least 32 characters |
| `JWT_ISSUER` | Expected JWT issuer |
| `JWT_ACCESS_AUDIENCE` | Access-token audience |
| `JWT_REFRESH_AUDIENCE` | Refresh-token audience |
| `JWT_ACCESS_TTL_SECONDS` | Access lifetime; specified default is 900 seconds |
| `JWT_REFRESH_TTL_SECONDS` | Session lifetime; specified default is 604800 seconds |
| `BCRYPT_ROUNDS` | bcrypt work factor; specified default is 12 |
| `COOKIE_SECURE` | `true` in HTTPS production, `false` on local HTTP |
| `GOOGLE_CLIENT_ID/SECRET` | Optional pair enabling Google login |
| `GOOGLE_CALLBACK_URL` | Exact registered Google callback |
| `FACEBOOK_CLIENT_ID/SECRET` | Optional pair enabling Facebook login |
| `FACEBOOK_CALLBACK_URL` | Exact registered Facebook callback |
| `*_RATE_*` | Authentication rate-limit windows and maxima |
| `ADMIN_*`, `SEED_*` | Read only by bootstrap/seed scripts |

Both values in an OAuth credential pair must be supplied together. If a pair is absent, that provider is reported as unavailable and the rest of the application starts normally. Production configuration requires HTTPS URLs and secure cookies.

### Frontend

`VITE_API_BASE_URL` is the public API root, normally `http://localhost:5000/api/v1` during local development and `/api/v1` in a same-origin production deployment. Never put private values in a `VITE_*` variable.

## Development

Open two terminals in the project root:

```powershell
npm.cmd run dev:backend
```

```powershell
npm.cmd run dev:frontend
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:5000/health`.

## Docker Compose

The Compose stack builds and runs the complete application:

- MongoDB 8 with a persistent named volume
- a one-shot database migration job that creates all declared indexes
- the compiled Express/Socket.io backend
- the compiled React frontend served by Nginx
- an opt-in, idempotent development seed job

Create `backend/.env` first and replace the example JWT secrets. The Compose file overrides container-only values such as the MongoDB hostname and the same-origin public URLs, while retaining credentials and optional OAuth settings from that file.

Build and start MongoDB, run the migration, and start both applications:

```powershell
docker compose up --build -d
```

Open `http://localhost:5173`. Nginx serves the SPA and proxies `/api` and `/socket.io` to the backend. The backend waits for MongoDB and a successful migration before starting; the frontend waits for the backend health check.

Load the idempotent development seed only when demo data is wanted:

```powershell
docker compose --profile tools run --rm seed
```

Rerun the migration/index job manually after a schema-index change:

```powershell
docker compose run --rm migrate
```

Inspect status and logs or stop the stack with:

```powershell
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

The database volume survives `docker compose down`. Use `docker compose down --volumes` only when intentionally discarding all local database data.

For OAuth in the Compose stack, register these local callback URLs with the providers:

```text
http://localhost:5173/api/v1/auth/google/callback
http://localhost:5173/api/v1/auth/facebook/callback
```

This Compose configuration targets local development/demo use over HTTP, so it runs the compiled backend with `NODE_ENV=development` and non-secure local cookies. A public deployment must use HTTPS, secure cookies, production public URLs, and deployment-specific secrets.

## Production build

```powershell
npm.cmd run typecheck --workspaces
npm.cmd run build --workspaces
npm.cmd run start -w backend
```

The backend build starts from `backend/dist/src/server.js`. Deploy `frontend/dist` with SPA fallback to `index.html`, proxy `/api` to Express, and keep the frontend/API on the same origin. Use HTTPS and `COOKIE_SECURE=true`.

## Admin bootstrap and seed

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then create the protected initial administrator:

```powershell
npm.cmd run admin:create -w backend
```

The command is idempotent and will not silently promote or overwrite an existing account.

For disposable development data only:

```powershell
npm.cmd run seed -w backend
```

The seed refuses to run in production. With the example environment it proposes:

```text
admin@example.test / DemoAdmin!2026
user@example.test  / DemoUser!2026
```

Change those values for any shared environment. The script does not print passwords or overwrite existing account credentials.

## Authentication behavior

- Access tokens expire after 15 minutes and are retained only in React memory.
- The refresh token is an HttpOnly, SameSite=Lax cookie scoped to `/api/v1/auth`.
- The database retains only a SHA-256 hash of the current refresh token.
- Refreshing rotates the token without extending the original seven-day session.
- Reuse of a correctly signed, older refresh token revokes the browser session.
- Protected calls verify the session, active user, and authentication version on every request.
- Role or active-status changes invalidate the user's existing sessions.
- Logout revokes the current session and clears its cookie.

## Google OAuth setup

1. Create a web application in Google Cloud Console and configure its consent screen.
2. Register this exact local redirect URI:

   ```text
   http://localhost:5000/api/v1/auth/google/callback
   ```

3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`.
4. Add local tester accounts if the consent screen remains in test mode.

The application requests only profile and email identity information. Provider tokens are discarded after identity resolution.

## Facebook OAuth setup

1. Create a Meta developer app with Facebook Login for the web.
2. Register this exact local redirect URI:

   ```text
   http://localhost:5000/api/v1/auth/facebook/callback
   ```

3. Set `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, and `FACEBOOK_CALLBACK_URL`.
4. Use a developer/test account while the app is not live.

Provider identities are never linked merely because an email matches. Sign into the existing account and use **Account → Connect** to link explicitly. Provider accounts without an email remain valid provider-only users.

## API overview

All application routes use `/api/v1`. Protected routes require `Authorization: Bearer <access-token>`.

| Group | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`; `GET /auth/me`, `/providers` |
| OAuth | `GET /auth/{google,facebook}`, callbacks; `POST /auth/{provider}/link` |
| Users | Admin `GET/POST /users`, `GET/PATCH/DELETE /users/:id` |
| Posts | `GET/POST /posts`, `GET /posts/slug/:slug`, `GET/PATCH/DELETE /posts/:id` |
| Comments | `GET/POST /posts/:postId/comments`, `GET/PATCH/DELETE /comments/:id` |
| Notifications | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` |
| Admin | `GET /admin/stats`, `/admin/posts`, `/admin/comments` |

Successful responses follow:

```json
{ "success": true, "message": "...", "data": {}, "meta": null }
```

Errors follow:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": [] },
  "requestId": "..."
}
```

Paginated responses use `meta: { page, limit, total, totalPages }`. Maximum page size is 50.

## Real-time notifications (Socket.io)

Real-time notifications are delivered using Socket.io and backed by persistent MongoDB storage:

- **Socket Authentication**: Connections authenticate during handshake via `auth.accessToken`. The token and session are validated against database records (`isActive`, session revocation, expiration, and `authVersion`). Sockets join a private room `user:<userId>`.
- **Continuous Authorization**: Connected sockets are checked at access-token expiration, periodically revalidated every 30 seconds, and verified immediately before delivering private notifications. If a session is revoked or invalidated, `auth:error` is emitted and the socket is disconnected.
- **Socket Events**:
  - `notification:new`: Emitted to the post owner's room when a new comment is posted on their post (comment author excluded).
  - `notifications:changed`: Emitted when notifications are marked as read, signaling connected tabs to refresh authoritative state.
  - `auth:error`: Sanitized authentication error notification (`ACCESS_TOKEN_EXPIRED`, `SESSION_INVALID`, `SERVICE_UNAVAILABLE`).
- **Deployment & Proxy Setup**: In production, reverse proxies (such as Nginx) must forward both `/api` and `/socket.io` to the backend Node process, enabling HTTP polling fallback and WebSocket upgrades (`Upgrade $http_upgrade` and `Connection "upgrade"`).

## Permissions

| Action | Visitor | User | Admin |
| --- | ---: | ---: | ---: |
| Read active posts/comments | Yes | Yes | Yes |
| Create posts/comments | No | Yes | Yes |
| Edit/delete own content | No | Yes | Yes |
| Edit/delete another user's content | No | No | Yes |
| Access notifications | No | Yes (own only) | Yes (own only) |
| Manage users and dashboard | No | No | Yes |
| Inspect deleted posts/comments | No | No | Yes |

Post deletion is soft deletion. Deleted posts and their retained comments disappear from ordinary access. Comment deletion is permanent. User deletion means deactivation so historical authorship remains intact. Notifications are strictly private to their recipient; admins have no override to inspect or mark other users' notifications.

## Verification & tests

The backend integration suite downloads a temporary MongoDB binary on its first run and never uses the development database. The frontend suite tests routing, layout, authentication guards, real-time Socket.io notification updates, confirmation dialogs, forms, and presentation components.

```powershell
# Frontend verification: typecheck, tests, and production build
npm.cmd run typecheck -w frontend
npm.cmd test -w frontend
npm.cmd run build -w frontend

# Full test suite across workspaces
npm.cmd run test --workspaces
npm.cmd run test:coverage -w backend
```

The backend suite covers local authentication, refresh rotation/reuse, origin protection, validation, ownership, admin overrides, soft deletion, comment moderation, bootstrap-admin protection, dashboard totals, notification REST persistence/authorization, and real Socket.io integration. Frontend tests cover protected/admin guards, pagination, safe text rendering, notification bell interactions, real-time socket handling, auth generation refresh guards, desktop and mobile navigation, confirmation/edit dialogs, and shared presentation cards.

## Activity logging

Pino emits structured records for login/registration/logout, OAuth operations, post/comment mutations, and admin user changes. Logs include request, actor, action, resource, outcome, status, and duration. Passwords, cookies, authorization headers, provider tokens, and request bodies are never logged.

## Known limitations

- Posts and comments are plain text rather than rich text.
- Password recovery, email verification, MFA, post restoration, and account merging are outside the assignment.
- The in-memory rate limiter and Socket.io server assume a single API instance. Deploying across multiple backend instances requires a shared rate-limit store and `@socket.io/redis-adapter`.
- Standalone MongoDB write reliability boundary: If the database or process fails between comment persistence and notification creation, the comment persists while the notification failure is caught and logged.
- OAuth provider availability depends on external credentials, provider-console configuration, and test-account access.
- Offset pagination is appropriate for this assignment but is not a stable snapshot during concurrent writes.

## Demo video flow

A complete demonstration fits in ten minutes:

1. Browse the public list and details.
2. Register, log out, log in, and refresh the page.
3. Show Google and Facebook login using configured test accounts.
4. Create, edit, and soft-delete a post.
5. Create, edit, and delete a comment; show an ownership rejection.
6. **Real-time notifications demo**:
   - Open Browser A (User A) and Browser B / incognito (User B).
   - User B has a published post.
   - User A adds a comment to User B's post.
   - User B's notification bell unread badge updates immediately without refreshing.
   - User B clicks the bell, inspects the new notification snapshot, and clicks to navigate or marks it as read.
   - Refresh User B's browser to prove persistence in MongoDB.
   - Show that commenting on one's own post produces no self-notification.
   - Show that User A cannot view or manipulate User B's notifications.
7. Log in as admin and inspect dashboard totals.
8. Create, edit, deactivate, and reactivate a user.
9. Edit another user's post, inspect deleted posts, and moderate comments.
10. Show passing tests, repository structure, and this README.

Never show real secrets, provider credentials, cookies, or tokens in the recording.

