# Inkstone MERN Blog

Inkstone is a full-stack blog application built with MongoDB, Express, React, and Node.js. It includes local and social authentication, role-based administration, post and comment ownership, likes, persistent real-time notifications, pagination, tests, and optional development seed data.

## Table of contents

- [Features](#features)
- [Technology](#technology)
- [Quick start with Docker](#quick-start-with-docker)
- [Start without Docker](#start-without-docker)
- [Use Docker only for MongoDB](#use-docker-only-for-mongodb)
- [Seed data](#seed-data)
- [Environment variables](#environment-variables)
- [Architecture](#architecture)
- [Navigating the application](#navigating-the-application)
- [Useful commands](#useful-commands)
- [API overview](#api-overview)
- [OAuth setup](#oauth-setup)
- [Production notes](#production-notes)

## Features

- Email/password registration and login with short-lived access tokens and rotating refresh sessions
- Optional Google and Facebook OAuth login and account linking
- `USER` and `ADMIN` roles enforced by the API
- Post CRUD, stable URL slugs, pagination, likes, ownership checks, and soft deletion
- Nested comment CRUD, likes, ownership checks, and admin moderation
- Persistent real-time notifications using MongoDB and authenticated Socket.io connections
- Admin dashboard and management pages for users, posts, and comments
- Zod validation, Helmet, CORS, rate limiting, structured activity logs, and centralized errors
- Backend Jest/Supertest tests and frontend Vitest/Testing Library tests
- Docker Compose setup and idempotent development seed data

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, React Router, Tailwind CSS 4, shadcn/ui, Axios, React Hook Form, Zod, Socket.io Client |
| Backend | Node.js 24, Express 5, TypeScript, Mongoose, Passport, Pino, Socket.io |
| Database | MongoDB 8 |
| Tests | Jest, Supertest, mongodb-memory-server, Vitest, React Testing Library |

## Prerequisites

Choose the prerequisites for the way you want to run the project:

- Docker setup: Docker Desktop with Docker Compose
- Without Docker: Node.js `24.4.1` (see `.nvmrc`), npm 11+, and a running MongoDB instance
- Google and Facebook developer applications are needed only for social login

## Quick start with Docker

Docker Compose runs MongoDB, creates the database indexes, starts the API, and serves the built React application through Nginx.

### 1. Create the backend environment file

From the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
```

On macOS or Linux:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and replace both JWT example secrets. Generate two different secrets by running this command twice:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set the results as `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. The remaining local Docker values are supplied by `docker-compose.yml`; OAuth credentials may remain empty.

### 2. Build and start the stack

```bash
docker compose up --build -d
```

Open the application at <http://localhost:5173>. Use `docker compose ps` to check the backend and frontend health status. The frontend proxies `/api` and `/socket.io` to the backend; the backend is intentionally not published directly to the host in the full Docker setup.

### 3. Optionally load demo data

```bash
docker compose --profile tools run --rm seed
```

The seed is optional and safe to run more than once. See [Seed data](#seed-data) for the accounts and inserted records.

### 4. Inspect or stop the stack

```bash
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

`docker compose down` keeps the MongoDB data in the `mern_blog_data` volume. To deliberately delete all Compose-managed database data, use `docker compose down --volumes`.

## Start without Docker

This path runs the backend and frontend with npm and connects to MongoDB on the host.

### 1. Install all workspace dependencies

From the repository root:

```bash
npm ci
```

PowerShell users may use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

### 2. Create the environment files

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

macOS or Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

In `backend/.env`:

- Set two different, random values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Keep `MONGODB_URI=mongodb://127.0.0.1:27017/mern_blog` for a default local MongoDB installation, or replace it with your MongoDB/Atlas URI.
- Keep `FRONTEND_URL=http://localhost:5173` and `BACKEND_URL=http://localhost:5000` for local development.
- OAuth credentials can remain empty.

The default `frontend/.env` already points to `http://localhost:5000/api/v1`.

### 3. Start MongoDB and create indexes

Start your local MongoDB service, then run:

```bash
npm run db:indexes -w backend
```

### 4. Start the backend and frontend

Open two terminals at the repository root.

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

Open:

- Application: <http://localhost:5173>
- API health check: <http://localhost:5000/health>

### 5. Optionally load demo data

With MongoDB running:

```bash
npm run seed -w backend
```

## Use Docker only for MongoDB

This hybrid workflow is useful when you want hot-reloading Node.js processes but do not have MongoDB installed locally.

```bash
docker compose up -d mongodb
```

Compose publishes MongoDB on host port `27018` to avoid clashing with a locally installed MongoDB. Update `backend/.env` accordingly:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27018/mern_blog
```

Then create indexes and start both development servers:

```bash
npm run db:indexes -w backend
npm run dev:backend
```

In a second terminal:

```bash
npm run dev:frontend
```

Optionally seed from a third terminal:

```bash
npm run seed -w backend
```

To use another MongoDB host port, set `MONGODB_HOST_PORT` when starting Compose and use the same port in `MONGODB_URI`.

PowerShell example:

```powershell
$env:MONGODB_HOST_PORT=27019
docker compose up -d mongodb
```

## Seed data

The regular seed script is intended only for development and refuses to run when `NODE_ENV=production`. It is idempotent: existing seed records and credentials are not overwritten.

Run it according to your setup:

```bash
# Full Docker stack
docker compose --profile tools run --rm seed

# Backend running locally, including the hybrid MongoDB setup
npm run seed -w backend
```

It creates the protected admin and demo user when they do not exist, plus five sample posts and two comments per post.

Default credentials from `backend/.env.example`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.test` | `DemoAdmin!2026` |
| User | `user@example.test` | `DemoUser!2026` |

Change `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED_USER_EMAIL`, and `SEED_USER_PASSWORD` in `backend/.env` before seeding a shared development environment.

To create only the protected administrator without sample content:

```bash
npm run admin:create -w backend
```

This command requires `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` and does not overwrite or promote an existing account.

## Environment variables

### Backend

The backend loads `backend/.env` through `dotenv`.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Express port; defaults to `5000` |
| `MONGODB_URI` | MongoDB connection string |
| `FRONTEND_URL` | Exact browser origin allowed by CORS |
| `BACKEND_URL` | Public backend URL used to start OAuth flows |
| `JWT_ACCESS_SECRET` | Access-token secret; at least 32 characters |
| `JWT_REFRESH_SECRET` | Different refresh-token secret; at least 32 characters |
| `JWT_*_TTL_SECONDS` | Access and refresh token lifetimes |
| `COOKIE_SECURE` | `false` for local HTTP; `true` for HTTPS production |
| `GOOGLE_*`, `FACEBOOK_*` | Optional OAuth credentials and callback URLs |
| `*_RATE_*` | Authentication rate-limit windows and limits |
| `ADMIN_*`, `SEED_*` | Values used by admin and seed scripts |

OAuth provider pairs must be configured together. If credentials are absent, the rest of the application still works and the provider is reported as unavailable.

### Frontend

`VITE_API_BASE_URL` is the public REST API root:

- Local npm development: `http://localhost:5000/api/v1`
- Docker/Nginx build: `/api/v1`

Never store secrets in a `VITE_*` variable because Vite embeds those values in the browser bundle.

## Architecture

### Request and data flow

```text
Browser
  |
  +-- React Router pages and layouts
  |     |
  |     +-- AuthContext / NotificationContext
  |              |
  +---------- Axios + Socket.io client
                     |
              Express / Socket.io
                     |
        routes -> middleware -> controllers
                                  |
                               services
                                  |
                          Mongoose models
                                  |
                               MongoDB
```

- Routes define endpoints and attach validation, authentication, role, and ownership middleware.
- Controllers translate HTTP input into service calls and standardized responses.
- Services contain application and authorization rules.
- Mongoose models define persistence and indexes.
- React contexts own session and notification state; pages compose reusable components and API calls.

### Repository map

```text
mern-blog-assignment/
|-- docker-compose.yml        # MongoDB, migration, API, frontend, and seed services
|-- package.json              # npm workspaces and repository-level commands
|-- backend/
|   |-- scripts/              # index creation, admin creation, seed, and reset utilities
|   |-- src/
|   |   |-- config/           # environment, database, cookies, Passport, and logging
|   |   |-- controllers/      # HTTP request/response handlers
|   |   |-- middleware/       # auth, roles, ownership, validation, rate limits, errors
|   |   |-- models/           # Mongoose schemas
|   |   |-- routes/           # /api/v1 route definitions
|   |   |-- services/         # business logic
|   |   |-- socket/           # authenticated Socket.io server
|   |   |-- validators/       # Zod request schemas
|   |   |-- tests/            # unit and integration tests
|   |   |-- app.ts            # Express middleware and route assembly
|   |   `-- server.ts         # database connection and HTTP/Socket.io startup
|   |-- .env.example
|   `-- Dockerfile
`-- frontend/
    |-- src/
    |   |-- api/              # Axios client and typed API functions
    |   |-- components/       # shared feature and UI components
    |   |-- context/          # authentication and notification state
    |   |-- layouts/          # public/user and admin shells
    |   |-- pages/            # route-level screens
    |   |-- routes/           # router and access guards
    |   |-- socket/           # Socket.io browser client
    |   |-- tests/            # frontend tests
    |   `-- main.tsx          # React entry point
    |-- .env.example
    |-- nginx.conf            # SPA fallback and API/WebSocket proxy
    `-- Dockerfile
```

### Where to make common changes

| Task | Start here |
| --- | --- |
| Add or change an API endpoint | `backend/src/routes`, then `controllers`, `services`, and `validators` |
| Change database fields or indexes | `backend/src/models`, then run the index command |
| Change authentication | `backend/src/services/auth.service.ts`, auth middleware, and `frontend/src/context/AuthContext.tsx` |
| Add a page or URL | `frontend/src/pages` and `frontend/src/routes/AppRouter.tsx` |
| Change navigation | `frontend/src/components/Header.tsx`, `MobileNavigation.tsx`, or `layouts/AdminLayout.tsx` |
| Change API calls | `frontend/src/api` and `frontend/src/types/api.ts` |
| Change real-time notifications | `backend/src/socket`, notification service, and `frontend/src/context/NotificationContext.tsx` |
| Add tests | `backend/src/tests` or `frontend/src/tests` |

## Navigating the application

The main browser routes are:

| URL | Access | Purpose |
| --- | --- | --- |
| `/` or `/posts` | Public | Browse active posts |
| `/posts/:slug` | Public | Read a post and its comments |
| `/login`, `/register` | Public | Authenticate or create an account |
| `/dashboard` | Signed-in user | View and manage the current user's posts |
| `/posts/new` | Signed-in user | Create a post |
| `/posts/:id/edit` | Owner or admin | Edit a post |
| `/account` | Signed-in user | View account details and link OAuth providers |
| `/admin` | Admin | Dashboard totals |
| `/admin/users` | Admin | Manage users |
| `/admin/posts` | Admin | Moderate active and deleted posts |
| `/admin/comments` | Admin | Moderate comments |

Use the header on desktop or the mobile menu to reach posts, the user dashboard, account settings, and admin area. The notification bell opens persistent notifications and links to the related post.

## Useful commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run dev:backend` | Start the API in watch mode |
| `npm run dev:frontend` | Start Vite in development mode |
| `npm run db:indexes -w backend` | Create declared MongoDB indexes |
| `npm run seed -w backend` | Add idempotent demo data |
| `npm run admin:create -w backend` | Create the protected admin only |
| `npm run typecheck --workspaces` | Type-check both workspaces |
| `npm run test --workspaces` | Run backend and frontend tests |
| `npm run test:coverage -w backend` | Run backend tests with coverage |
| `npm run build --workspaces` | Build both workspaces |
| `npm run start -w backend` | Start the compiled backend |

The backend integration suite uses `mongodb-memory-server`; it does not use or modify the development database.

## API overview

All REST endpoints are under `/api/v1`. Protected endpoints use `Authorization: Bearer <access-token>`.

| Group | Main endpoints |
| --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/providers` |
| OAuth | `/auth/google`, `/auth/facebook`, callbacks, and provider linking |
| Users | `/users` and `/users/:id` for admin management |
| Posts | `/posts`, `/posts/:id`, and `/posts/slug/:slug` |
| Comments | `/posts/:postId/comments` and `/comments/:id` |
| Notifications | `/notifications`, `/notifications/read-all`, and `/notifications/:id/read` |
| Admin | `/admin/stats`, `/admin/posts`, and `/admin/comments` |

The health endpoint is `/health`, outside the `/api/v1` prefix.

Successful responses use this shape:

```json
{ "success": true, "message": "...", "data": {}, "meta": null }
```

Errors use this shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": [] },
  "requestId": "..."
}
```

## OAuth setup

OAuth is optional. For npm-based local development, register these callback URLs with the providers:

```text
http://localhost:5000/api/v1/auth/google/callback
http://localhost:5000/api/v1/auth/facebook/callback
```

For the full Docker stack, the browser reaches the backend through Nginx, so use:

```text
http://localhost:5173/api/v1/auth/google/callback
http://localhost:5173/api/v1/auth/facebook/callback
```

Set the matching client ID, client secret, and callback URL in `backend/.env`. Provider identities are linked explicitly from the signed-in account page; matching email addresses are not linked automatically.

## Production notes

```bash
npm run typecheck --workspaces
npm run build --workspaces
npm run start -w backend
```

The backend entry point is `backend/dist/src/server.js`. Deploy `frontend/dist` with SPA fallback to `index.html`, proxy `/api` and `/socket.io` to the backend, and keep the frontend and API on the same public origin where possible.

Production configuration requires HTTPS URLs and `COOKIE_SECURE=true`. Use deployment-specific JWT secrets and OAuth credentials, run `npm run db:indexes -w backend` during deployment, and do not run the development seed in production.
