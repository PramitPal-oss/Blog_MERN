import type { Role } from "../constants/roles.js";
declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; sessionId: string; role: Role; authVersion: number };
      validated?: { body?: any; query?: any; params?: any };
      activity?: { action: string; resourceType?: string; resourceId?: string };
      requestId?: string;
    }
  }
}
export {};
