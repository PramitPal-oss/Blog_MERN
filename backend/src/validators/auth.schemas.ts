import { z } from "zod";
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(10).refine(v => Buffer.byteLength(v, "utf8") <= 72, "Password must not exceed 72 UTF-8 bytes");
export const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email, password }).strict();
export const loginSchema = z.object({ email, password: z.string().min(1).refine(v => Buffer.byteLength(v, "utf8") <= 72, "Password is too long") }).strict();
