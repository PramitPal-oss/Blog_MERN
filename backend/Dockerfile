FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend backend
RUN npm run build -w backend

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=development
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace backend --include-workspace-root

COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 5000

USER node
CMD ["node", "backend/dist/src/server.js"]
