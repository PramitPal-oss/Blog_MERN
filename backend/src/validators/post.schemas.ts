import { z } from "zod";
export const postCreateSchema = z.object({ title: z.string().trim().min(3).max(160), content: z.string().trim().min(1).max(50000) }).strict();
export const postUpdateSchema = postCreateSchema.partial().refine(v => Object.keys(v).length > 0, "At least one field is required");
