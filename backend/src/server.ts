import http from "node:http";
import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initSocketServer, closeSocketServer } from "./socket/socket.server.js";

await connectDatabase();
const httpServer = http.createServer(app);
initSocketServer(httpServer);

const server = httpServer.listen(env.PORT, () => logger.info({ port: env.PORT }, "API listening"));

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down");
  const forceExit = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    await closeSocketServer();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

