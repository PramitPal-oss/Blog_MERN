import { z } from "zod";
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
export const pagination = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) }).strict();
export const noBody = z.object({}).strict().optional();
