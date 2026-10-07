import { z } from "zod";
export const commentSchema = z.object({ content: z.string().trim().min(1).max(2000) }).strict();
